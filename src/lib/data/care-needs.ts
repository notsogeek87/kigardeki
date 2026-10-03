import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertSameFamily,
  requireParent,
  requireSession,
} from "@/lib/permissions";
import { assertChildrenBelongToFamily } from "@/lib/data/children";
import {
  listEventOccurrences,
  listEventOccurrencesForFamily,
} from "@/lib/data/events";
import { addUTCDays, startOfUTCDay, toDateInputValue } from "@/lib/wall-time";
import type { TimeSlot } from "@/lib/time-slots";
import { groupNeeds } from "@/components/care-need-display";

export type CareNeedDTO = {
  id: string;
  childId: string;
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  slots: TimeSlot[];
};

function toDTO(row: {
  id: string;
  childId: string;
  date: Date;
  morning: boolean;
  afternoon: boolean;
}): CareNeedDTO {
  const slots: TimeSlot[] = [];
  if (row.morning) slots.push("MORNING");
  if (row.afternoon) slots.push("AFTERNOON");
  return {
    id: row.id,
    childId: row.childId,
    date: toDateInputValue(row.date),
    slots,
  };
}

/** Care needs with a date in [rangeStart, rangeEnd). */
export async function listCareNeeds(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CareNeedDTO[]> {
  const user = await requireSession();
  const rows = await prisma.careNeed.findMany({
    where: { familyId: user.familyId, date: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { date: "asc" },
  });
  return rows.map(toDTO);
}

/**
 * Same as listCareNeeds, for the public /share/[token] page ONLY, where the
 * family id was already authorized by resolving a valid share token.
 */
export async function listCareNeedsForFamily(
  familyId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CareNeedDTO[]> {
  const rows = await prisma.careNeed.findMany({
    where: { familyId, date: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { date: "asc" },
  });
  return rows.map(toDTO);
}

/**
 * Marks each given date as "care needed" for each given child on the given
 * half-days. Re-adding a day that already exists widens its half-days
 * instead of failing or narrowing it.
 */
export async function createCareNeeds(
  childIds: string[],
  dates: Date[],
  slots: TimeSlot[],
): Promise<void> {
  const user = await requireParent();
  await assertChildrenBelongToFamily(user, childIds);
  const morning = slots.includes("MORNING");
  const afternoon = slots.includes("AFTERNOON");
  if (!morning && !afternoon)
    throw new Error("Sélectionnez au moins Matin ou Après-midi.");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.careNeed.findMany({
      where: {
        familyId: user.familyId,
        childId: { in: childIds },
        date: { in: dates },
      },
    });
    const key = (childId: string, date: Date) => `${childId}|${date.getTime()}`;
    const byKey = new Map(
      existing.map((row) => [key(row.childId, row.date), row]),
    );

    const toCreate: {
      familyId: string;
      childId: string;
      date: Date;
      morning: boolean;
      afternoon: boolean;
      createdBy: string;
    }[] = [];
    for (const childId of childIds) {
      for (const date of dates) {
        const row = byKey.get(key(childId, date));
        if (!row) {
          toCreate.push({
            familyId: user.familyId,
            childId,
            date,
            morning,
            afternoon,
            createdBy: user.id,
          });
        } else if ((morning && !row.morning) || (afternoon && !row.afternoon)) {
          await tx.careNeed.update({
            where: { id: row.id },
            data: {
              morning: row.morning || morning,
              afternoon: row.afternoon || afternoon,
            },
          });
        }
      }
    }
    if (toCreate.length > 0) await tx.careNeed.createMany({ data: toCreate });
  });
}

export async function deleteCareNeed(careNeedId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.careNeed.findUniqueOrThrow({
    where: { id: careNeedId },
  });
  assertSameFamily(user, existing.familyId);
  await prisma.careNeed.delete({ where: { id: careNeedId } });
}

const UPCOMING_DAYS = 365;

/** Number of upcoming days with a care need nobody has covered yet. */
export async function countUncoveredNeedDays(): Promise<number> {
  const start = startOfUTCDay(new Date());
  const end = addUTCDays(start, UPCOMING_DAYS);
  const [needs, occurrences] = await Promise.all([
    listCareNeeds(start, end),
    listEventOccurrences(start, end),
  ]);
  return Array.from(groupNeeds(needs, occurrences).values()).filter(
    (d) => d.uncovered,
  ).length;
}

/** Share-page variant of countUncoveredNeedDays (see listCareNeedsForFamily). */
export async function countUncoveredNeedDaysForFamily(
  familyId: string,
): Promise<number> {
  const start = startOfUTCDay(new Date());
  const end = addUTCDays(start, UPCOMING_DAYS);
  const [needs, occurrences] = await Promise.all([
    listCareNeedsForFamily(familyId, start, end),
    listEventOccurrencesForFamily(familyId, start, end),
  ]);
  return Array.from(groupNeeds(needs, occurrences).values()).filter(
    (d) => d.uncovered,
  ).length;
}
