import "server-only";
import { prisma } from "@/lib/prisma";
import { assertSameFamily, requireParent, requireSession } from "@/lib/permissions";
import { assertChildrenBelongToFamily } from "@/lib/data/children";
import { toDateInputValue } from "@/lib/wall-time";

export type CareNeedDTO = {
  id: string;
  childId: string;
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
};

function toDTO(row: { id: string; childId: string; date: Date }): CareNeedDTO {
  return { id: row.id, childId: row.childId, date: toDateInputValue(row.date) };
}

/** Care needs with a date in [rangeStart, rangeEnd). */
export async function listCareNeeds(rangeStart: Date, rangeEnd: Date): Promise<CareNeedDTO[]> {
  const user = await requireSession();
  const rows = await prisma.careNeed.findMany({
    where: { familyId: user.familyId, date: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { date: "asc" },
  });
  return rows.map(toDTO);
}

/** Marks each given date as "care needed" for each given child (idempotent). */
export async function createCareNeeds(childIds: string[], dates: Date[]): Promise<void> {
  const user = await requireParent();
  await assertChildrenBelongToFamily(user, childIds);
  await prisma.careNeed.createMany({
    data: childIds.flatMap((childId) =>
      dates.map((date) => ({ familyId: user.familyId, childId, date, createdBy: user.id }))
    ),
    skipDuplicates: true,
  });
}

export async function deleteCareNeed(careNeedId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.careNeed.findUniqueOrThrow({ where: { id: careNeedId } });
  assertSameFamily(user, existing.familyId);
  await prisma.careNeed.delete({ where: { id: careNeedId } });
}
