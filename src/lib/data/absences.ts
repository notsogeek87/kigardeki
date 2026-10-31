import "server-only";
import { prisma } from "@/lib/prisma";
import { assertSameFamily, requireParent, requireSession } from "@/lib/permissions";
import type { AbsenceDTO } from "@/lib/absences";
import { toDateInputValue } from "@/lib/wall-time";

function toDTO(row: { id: string; caregiverId: string; startDate: Date; endDate: Date }): AbsenceDTO {
  return {
    id: row.id,
    caregiverId: row.caregiverId,
    startDate: toDateInputValue(row.startDate),
    endDate: toDateInputValue(row.endDate),
  };
}

/** Absences overlapping [rangeStart, rangeEnd). */
export async function listAbsences(rangeStart: Date, rangeEnd: Date): Promise<AbsenceDTO[]> {
  const user = await requireSession();
  return listAbsencesForFamily(user.familyId, rangeStart, rangeEnd);
}

/**
 * No session check: for the public /share/[token] page ONLY, where the
 * family id was already authorized by resolving a valid share token.
 */
export async function listAbsencesForFamily(
  familyId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<AbsenceDTO[]> {
  const rows = await prisma.caregiverAbsence.findMany({
    where: {
      familyId,
      startDate: { lt: rangeEnd },
      endDate: { gte: rangeStart },
      // Turning the option off hides past absences without deleting them.
      caregiver: { tracksAbsences: true },
    },
    orderBy: { startDate: "asc" },
  });
  return rows.map(toDTO);
}

/** One caregiver's absences that are not over yet, soonest first. */
export async function listUpcomingAbsences(caregiverId: string, today: Date): Promise<AbsenceDTO[]> {
  const user = await requireSession();
  const caregiver = await prisma.caregiver.findUniqueOrThrow({ where: { id: caregiverId } });
  assertSameFamily(user, caregiver.familyId);
  const rows = await prisma.caregiverAbsence.findMany({
    where: { caregiverId, endDate: { gte: today } },
    orderBy: { startDate: "asc" },
  });
  return rows.map(toDTO);
}

export async function createAbsence(caregiverId: string, startDate: Date, endDate: Date): Promise<void> {
  const user = await requireParent();
  const caregiver = await prisma.caregiver.findUniqueOrThrow({ where: { id: caregiverId } });
  assertSameFamily(user, caregiver.familyId);
  if (!caregiver.tracksAbsences) {
    throw new Error("Les absences ne sont pas activées pour cette personne.");
  }
  if (endDate < startDate) throw new Error("La date de fin doit être après la date de début.");
  await prisma.caregiverAbsence.create({
    data: { familyId: user.familyId, caregiverId, startDate, endDate, createdBy: user.id },
  });
}

export async function deleteAbsence(absenceId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.caregiverAbsence.findUniqueOrThrow({ where: { id: absenceId } });
  assertSameFamily(user, existing.familyId);
  await prisma.caregiverAbsence.delete({ where: { id: absenceId } });
}
