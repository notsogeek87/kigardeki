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

export async function listEventOccurrences(rangeStart: Date, rangeEnd: Date): Promise<EventOccurrenceDTO[]> {
  const user = await requireSession();

  const rows = await prisma.event.findMany({
    where: {
      familyId: user.familyId,
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

  return toEventDTO(row);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  assertSameFamily(user, existing.familyId);
  await prisma.event.delete({ where: { id: eventId } });
}
