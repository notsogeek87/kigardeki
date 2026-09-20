import "server-only";
import { requireSession } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { listEventOccurrences, type EventOccurrenceDTO } from "@/lib/data/events";
import { prisma } from "@/lib/prisma";
import { startOfUTCDay, addUTCDays } from "@/lib/wall-time";
import type { ChildDTO, CaregiverDTO } from "@/lib/data/dto";

export type DashboardData = {
  children: ChildDTO[];
  caregivers: CaregiverDTO[];
  myCaregiverId: string | null;
  todayByChild: Map<string, EventOccurrenceDTO[]>;
  myUpcoming: EventOccurrenceDTO[];
};

export async function getTodayDashboard(): Promise<DashboardData> {
  const user = await requireSession();
  const now = new Date();
  const todayStart = startOfUTCDay(now);
  const todayEnd = addUTCDays(todayStart, 1);
  const horizonEnd = addUTCDays(todayStart, 14);

  const [children, caregivers, todayOccurrences, upcomingOccurrences, myCaregiver] = await Promise.all([
    listChildren(),
    listCaregivers(),
    listEventOccurrences(todayStart, todayEnd),
    listEventOccurrences(todayStart, horizonEnd),
    prisma.caregiver.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  const todayByChild = new Map<string, EventOccurrenceDTO[]>();
  for (const child of children) todayByChild.set(child.id, []);
  for (const occ of todayOccurrences) {
    for (const childId of occ.childIds) {
      todayByChild.get(childId)?.push(occ);
    }
  }
  for (const list of todayByChild.values()) {
    list.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  }

  const myCaregiverId = myCaregiver?.id ?? null;
  const myUpcoming = myCaregiverId
    ? upcomingOccurrences
        .filter((occ) => occ.caregiverIds.includes(myCaregiverId))
        .sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime())
        .slice(0, 5)
    : [];

  return { children, caregivers, myCaregiverId, todayByChild, myUpcoming };
}
