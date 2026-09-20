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
 *   recurring schedule's weekdays — only another standing schedule can do
 *   that. A one-off event only excludes its own single date instead, via
 *   applyOneOffException below.
 * - Only trims a candidate event whose children are a subset of the new
 *   event's children, so an event covering siblings not part of this
 *   change is left untouched.
 * - Removes only the overlapping weekday(s) from the candidate's
 *   recurrenceDaysOfWeek (deleting it if none remain) — it never touches
 *   days/times that don't conflict.
 * - When the new event only covers part of the candidate's daily time
 *   range (e.g. new = afternoon only, candidate = all day), the surviving
 *   portion (the morning) is preserved as its own event for just the
 *   affected weekday(s), rather than disappearing along with the day.
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
    include: {
      children: { select: { childId: true } },
      caregivers: { select: { caregiverId: true } },
    },
  });

  for (const candidate of candidates) {
    const candidateChildIds = candidate.children.map((c) => c.childId);
    const isSubsetOfNewEvent = candidateChildIds.every((id) => params.childIds.includes(id));
    if (!isSubsetOfNewEvent) continue;

    const candStartMin = timeOfDayMinutes(candidate.startAt);
    const candEndMin = timeOfDayMinutes(candidate.endAt);
    if (!timeRangesOverlap(newStartMin, newEndMin, candStartMin, candEndMin)) continue;

    const overlappingDays = candidate.recurrenceDaysOfWeek.filter((d) => params.days.includes(d));
    if (overlappingDays.length === 0) continue;
    const remainingDays = candidate.recurrenceDaysOfWeek.filter((d) => !overlappingDays.includes(d));

    if (remainingDays.length === 0) {
      await prisma.event.delete({ where: { id: candidate.id } });
    } else {
      await prisma.event.update({ where: { id: candidate.id }, data: { recurrenceDaysOfWeek: remainingDays } });
    }

    // The portion of the candidate's daily range the new event does NOT
    // cover — what survives of the old schedule on the affected days.
    const remainderPieces: Array<[number, number]> = [];
    if (newStartMin > candStartMin) remainderPieces.push([candStartMin, Math.min(newStartMin, candEndMin)]);
    if (newEndMin < candEndMin) remainderPieces.push([Math.max(newEndMin, candStartMin), candEndMin]);

    for (const [pieceStart, pieceEnd] of remainderPieces) {
      if (pieceEnd <= pieceStart) continue;
      const remainderStart = new Date(candidate.startAt);
      remainderStart.setUTCHours(Math.floor(pieceStart / 60), pieceStart % 60, 0, 0);
      const remainderEnd = new Date(candidate.startAt);
      remainderEnd.setUTCHours(Math.floor(pieceEnd / 60), pieceEnd % 60, 0, 0);

      await prisma.event.create({
        data: {
          familyId: params.familyId,
          type: candidate.type,
          startAt: remainderStart,
          endAt: remainderEnd,
          location: candidate.location,
          notes: candidate.notes,
          recurrenceFrequency: "WEEKLY",
          recurrenceDaysOfWeek: overlappingDays,
          recurrenceEndDate: candidate.recurrenceEndDate,
          createdBy: candidate.createdBy,
          children: { create: candidateChildIds.map((childId) => ({ childId })) },
          caregivers: { create: candidate.caregivers.map((c) => ({ caregiverId: c.caregiverId })) },
        },
      });
    }
  }
}

function dateOnlyUTC(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function candidateRecursOnDate(candidate: {
  startAt: Date;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDaysOfWeek: number[];
  recurrenceEndDate: Date | null;
}, date: Date): boolean {
  if (!candidate.recurrenceFrequency) return false;
  const day = dateOnlyUTC(date);
  if (day < dateOnlyUTC(candidate.startAt)) return false;
  if (candidate.recurrenceEndDate && day > dateOnlyUTC(candidate.recurrenceEndDate)) return false;
  if (candidate.recurrenceFrequency === "DAILY") return true;
  return candidate.recurrenceDaysOfWeek.includes(date.getUTCDay());
}

/**
 * When a parent adds a one-off event ("Charlie chez Papi mercredi 30
 * exceptionnellement") — a single day, or a simple consecutive-day range
 * (DAILY recurrence, e.g. "Charlie chez Papi du 30 au 2") — that fully or
 * partly covers the time range of a standing recurring event for the same
 * child(ren) on any day it spans, that recurring event's occurrence on
 * each affected date is suppressed — otherwise both would show up side by
 * side on the calendar. Unlike trimSupersededRecurringEvents, this never
 * touches the recurring schedule itself: no weekday is removed and no
 * other occurrence is affected, only the specific dates covered by the
 * new event are excluded.
 *
 * Same guardrail as trimSupersededRecurringEvents: only trims a candidate
 * whose children are a subset of the new event's children.
 */
async function applyOneOffException(params: {
  familyId: string;
  excludeEventId?: string;
  childIds: string[];
  startAt: Date;
  endAt: Date;
  /** Inclusive last date of the new event's range, for a DAILY (multi-day) event. Defaults to startAt's date. */
  rangeEndDate?: Date | null;
}): Promise<void> {
  const newStartMin = timeOfDayMinutes(params.startAt);
  const newEndMin = timeOfDayMinutes(params.endAt);

  const candidates = await prisma.event.findMany({
    where: {
      familyId: params.familyId,
      id: params.excludeEventId ? { not: params.excludeEventId } : undefined,
      recurrenceFrequency: { in: ["WEEKLY", "DAILY"] },
      children: { some: { childId: { in: params.childIds } } },
    },
    include: {
      children: { select: { childId: true } },
      caregivers: { select: { caregiverId: true } },
    },
  });

  const firstDate = dateOnlyUTC(params.startAt);
  const lastDate = params.rangeEndDate ? dateOnlyUTC(params.rangeEndDate) : firstDate;

  for (
    const exceptionDate = new Date(firstDate);
    exceptionDate.getTime() <= lastDate.getTime();
    exceptionDate.setUTCDate(exceptionDate.getUTCDate() + 1)
  ) {
    for (const candidate of candidates) {
      const candidateChildIds = candidate.children.map((c) => c.childId);
      const isSubsetOfNewEvent = candidateChildIds.every((id) => params.childIds.includes(id));
      if (!isSubsetOfNewEvent) continue;
      if (!candidateRecursOnDate(candidate, exceptionDate)) continue;

      const candStartMin = timeOfDayMinutes(candidate.startAt);
      const candEndMin = timeOfDayMinutes(candidate.endAt);
      if (!timeRangesOverlap(newStartMin, newEndMin, candStartMin, candEndMin)) continue;

      const alreadyExcluded = candidate.excludedDates.some((d) => dateOnlyUTC(d).getTime() === exceptionDate.getTime());
      if (!alreadyExcluded) {
        await prisma.event.update({
          where: { id: candidate.id },
          data: { excludedDates: { push: exceptionDate } },
        });
      }

      // The portion of the candidate's daily range the new event does NOT
      // cover, surviving as its own one-off event for this single date only.
      const remainderPieces: Array<[number, number]> = [];
      if (newStartMin > candStartMin) remainderPieces.push([candStartMin, Math.min(newStartMin, candEndMin)]);
      if (newEndMin < candEndMin) remainderPieces.push([Math.max(newEndMin, candStartMin), candEndMin]);

      for (const [pieceStart, pieceEnd] of remainderPieces) {
        if (pieceEnd <= pieceStart) continue;
        const remainderStart = new Date(exceptionDate);
        remainderStart.setUTCHours(Math.floor(pieceStart / 60), pieceStart % 60, 0, 0);
        const remainderEnd = new Date(exceptionDate);
        remainderEnd.setUTCHours(Math.floor(pieceEnd / 60), pieceEnd % 60, 0, 0);

        await prisma.event.create({
          data: {
            familyId: params.familyId,
            type: candidate.type,
            startAt: remainderStart,
            endAt: remainderEnd,
            location: candidate.location,
            notes: candidate.notes,
            createdBy: candidate.createdBy,
            children: { create: candidateChildIds.map((childId) => ({ childId })) },
            caregivers: { create: candidate.caregivers.map((c) => ({ caregiverId: c.caregiverId })) },
          },
        });
      }
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
  } else if (!input.recurrence || input.recurrence.frequency === "DAILY") {
    await applyOneOffException({
      familyId: user.familyId,
      excludeEventId: row.id,
      childIds: input.childIds,
      startAt: input.startAt,
      endAt: input.endAt,
      rangeEndDate: input.recurrence?.endDate ?? null,
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
  } else if (!input.recurrence || input.recurrence.frequency === "DAILY") {
    await applyOneOffException({
      familyId: user.familyId,
      excludeEventId: row.id,
      childIds: input.childIds,
      startAt: input.startAt,
      endAt: input.endAt,
      rangeEndDate: input.recurrence?.endDate ?? null,
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
