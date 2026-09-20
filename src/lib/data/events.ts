import "server-only";
import type { EventType, RecurrenceFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptNullable } from "@/lib/crypto";
import { assertSameFamily, requireParent, requireSession } from "@/lib/permissions";
import { toEventDTO, type EventDTO } from "@/lib/data/dto";
import { assertChildrenBelongToFamily } from "@/lib/data/children";
import { assertCaregiversBelongToFamily } from "@/lib/data/caregivers";
import { expandEventOccurrences, type Occurrence } from "@/lib/recurrence";

export type EventInput = {
  type: EventType;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  notes?: string | null;
  childIds: string[];
  caregiverIds: string[];
  recurrence?: {
    frequency: RecurrenceFrequency;
    daysOfWeek: number[];
    endDate?: Date | null;
  } | null;
};

const EVENT_INCLUDE = {
  children: { select: { childId: true } },
  caregivers: { select: { caregiverId: true } },
} as const;

export type EventOccurrenceDTO = EventDTO & { occurrenceDate: string; occurrenceStartAt: Date; occurrenceEndAt: Date };

async function fetchOccurrences(familyId: string, rangeStart: Date, rangeEnd: Date): Promise<EventOccurrenceDTO[]> {
  const rows = await prisma.event.findMany({
    where: {
      familyId,
      startAt: { lt: rangeEnd },
      OR: [{ recurrenceFrequency: null }, { recurrenceEndDate: null }, { recurrenceEndDate: { gte: rangeStart } }],
    },
    include: EVENT_INCLUDE,
    orderBy: { startAt: "asc" },
  });

  const results: EventOccurrenceDTO[] = [];
  for (const row of rows) {
    const dto = toEventDTO(row);
    const occurrences: Occurrence[] = expandEventOccurrences(row, rangeStart, rangeEnd);
    for (const occ of occurrences) {
      results.push({ ...dto, occurrenceDate: occ.occurrenceDate, occurrenceStartAt: occ.startAt, occurrenceEndAt: occ.endAt });
    }
  }

  results.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  return results;
}

export async function listEventOccurrences(rangeStart: Date, rangeEnd: Date): Promise<EventOccurrenceDTO[]> {
  const user = await requireSession();
  return fetchOccurrences(user.familyId, rangeStart, rangeEnd);
}

/** No session check — see listChildrenForFamily in children.ts for the trust boundary. */
export async function listEventOccurrencesForFamily(
  familyId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<EventOccurrenceDTO[]> {
  return fetchOccurrences(familyId, rangeStart, rangeEnd);
}

function timeOfDayMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function timeRangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * When a parent sets up a new weekly-recurring event ("Charlie est chez
 * Mamie tous les mercredis 16h30-19h30"), any *other* weekly-recurring
 * event for the same child(ren) that overlaps that time range on the same
 * weekday(s) is understood to be superseded for those days — e.g. a
 * standing "crèche lundi-vendredi" no longer applies on Wednesday once a
 * standing Wednesday afternoon caregiving arrangement is created.
 *
 * Deliberately narrow to avoid surprising, silent data loss:
 * - Only triggers when the *new* event is itself weekly-recurring. A
 *   one-off event (a single exceptional day) never mutates a standing
 *   recurring schedule — only another standing schedule can replace one.
 * - Only trims a candidate event whose children are a subset of the new
 *   event's children, so an event covering siblings not part of this
 *   change is left untouched.
 * - Removes only the overlapping weekday(s) from the candidate's
 *   recurrenceDaysOfWeek (deleting it if none remain) — it never touches
 *   days/times that don't conflict.
 */
async function trimSupersededRecurringEvents(params: {
  familyId: string;
  excludeEventId?: string;
  childIds: string[];
  days: number[];
  startAt: Date;
  endAt: Date;
}): Promise<void> {
  const newStartMin = timeOfDayMinutes(params.startAt);
  const newEndMin = timeOfDayMinutes(params.endAt);

  const candidates = await prisma.event.findMany({
    where: {
      familyId: params.familyId,
      id: params.excludeEventId ? { not: params.excludeEventId } : undefined,
      recurrenceFrequency: "WEEKLY",
      children: { some: { childId: { in: params.childIds } } },
    },
    include: { children: { select: { childId: true } } },
  });

  for (const candidate of candidates) {
    const candidateChildIds = candidate.children.map((c) => c.childId);
    const isSubsetOfNewEvent = candidateChildIds.every((id) => params.childIds.includes(id));
    if (!isSubsetOfNewEvent) continue;

    const overlaps = timeRangesOverlap(
      newStartMin,
      newEndMin,
      timeOfDayMinutes(candidate.startAt),
      timeOfDayMinutes(candidate.endAt)
    );
    if (!overlaps) continue;

    const remainingDays = candidate.recurrenceDaysOfWeek.filter((d) => !params.days.includes(d));
    if (remainingDays.length === candidate.recurrenceDaysOfWeek.length) continue;

    if (remainingDays.length === 0) {
      await prisma.event.delete({ where: { id: candidate.id } });
    } else {
      await prisma.event.update({ where: { id: candidate.id }, data: { recurrenceDaysOfWeek: remainingDays } });
    }
  }
}

export async function getEvent(eventId: string): Promise<EventDTO | null> {
  const user = await requireSession();
  const row = await prisma.event.findUnique({ where: { id: eventId }, include: EVENT_INCLUDE });
  if (!row) return null;
  assertSameFamily(user, row.familyId);
  return toEventDTO(row);
}

export async function createEvent(input: EventInput): Promise<EventDTO> {
  const user = await requireParent();

  if (input.childIds.length === 0) {
    throw new Error("Sélectionnez au moins un enfant.");
  }
  if (input.endAt <= input.startAt) {
    throw new Error("L'heure de fin doit être après l'heure de début.");
  }
  await assertChildrenBelongToFamily(user, input.childIds);
  await assertCaregiversBelongToFamily(user, input.caregiverIds);

  const row = await prisma.event.create({
    data: {
      familyId: user.familyId,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt,
      location: encryptNullable(input.location),
      notes: encryptNullable(input.notes),
      recurrenceFrequency: input.recurrence?.frequency ?? null,
      recurrenceDaysOfWeek: input.recurrence?.daysOfWeek ?? [],
      recurrenceEndDate: input.recurrence?.endDate ?? null,
      createdBy: user.id,
      children: { create: input.childIds.map((childId) => ({ childId })) },
      caregivers: { create: input.caregiverIds.map((caregiverId) => ({ caregiverId })) },
    },
    include: EVENT_INCLUDE,
  });

  if (input.recurrence?.frequency === "WEEKLY" && input.recurrence.daysOfWeek.length > 0) {
    await trimSupersededRecurringEvents({
      familyId: user.familyId,
      excludeEventId: row.id,
      childIds: input.childIds,
      days: input.recurrence.daysOfWeek,
      startAt: input.startAt,
      endAt: input.endAt,
    });
  }

  return toEventDTO(row);
}

export async function updateEvent(eventId: string, input: EventInput): Promise<EventDTO> {
  const user = await requireParent();
  const existing = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  assertSameFamily(user, existing.familyId);

  if (input.childIds.length === 0) {
    throw new Error("Sélectionnez au moins un enfant.");
  }
  if (input.endAt <= input.startAt) {
    throw new Error("L'heure de fin doit être après l'heure de début.");
  }
  await assertChildrenBelongToFamily(user, input.childIds);
  await assertCaregiversBelongToFamily(user, input.caregiverIds);

  const row = await prisma.event.update({
    where: { id: eventId },
    data: {
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt,
      location: encryptNullable(input.location),
      notes: encryptNullable(input.notes),
      recurrenceFrequency: input.recurrence?.frequency ?? null,
      recurrenceDaysOfWeek: input.recurrence?.daysOfWeek ?? [],
      recurrenceEndDate: input.recurrence?.endDate ?? null,
      children: { deleteMany: {}, create: input.childIds.map((childId) => ({ childId })) },
      caregivers: { deleteMany: {}, create: input.caregiverIds.map((caregiverId) => ({ caregiverId })) },
    },
    include: EVENT_INCLUDE,
  });

  if (input.recurrence?.frequency === "WEEKLY" && input.recurrence.daysOfWeek.length > 0) {
    await trimSupersededRecurringEvents({
      familyId: user.familyId,
      excludeEventId: row.id,
      childIds: input.childIds,
      days: input.recurrence.daysOfWeek,
      startAt: input.startAt,
      endAt: input.endAt,
    });
  }

  return toEventDTO(row);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  assertSameFamily(user, existing.familyId);
  await prisma.event.delete({ where: { id: eventId } });
}
