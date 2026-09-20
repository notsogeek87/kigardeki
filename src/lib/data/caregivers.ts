import "server-only";
import type { CaregiverRelation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt, encryptNullable } from "@/lib/crypto";
import { assertSameFamily, requireParent, requireSession, type SessionUser } from "@/lib/permissions";
import { toCaregiverDTO, type CaregiverDTO } from "@/lib/data/dto";

export type CaregiverInput = {
  firstName: string;
  lastName?: string | null;
  relation: CaregiverRelation;
  phone?: string | null;
  color: string;
};

export async function listCaregivers(): Promise<CaregiverDTO[]> {
  const user = await requireSession();
  const rows = await prisma.caregiver.findMany({
    where: { familyId: user.familyId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toCaregiverDTO);
}

export async function getCaregiver(caregiverId: string): Promise<CaregiverDTO | null> {
  const user = await requireSession();
  const row = await prisma.caregiver.findUnique({ where: { id: caregiverId } });
  if (!row) return null;
  assertSameFamily(user, row.familyId);
  return toCaregiverDTO(row);
}

export async function createCaregiver(input: CaregiverInput): Promise<CaregiverDTO> {
  const user = await requireParent();
  const row = await prisma.caregiver.create({
    data: {
      familyId: user.familyId,
      firstName: encrypt(input.firstName),
      lastName: encryptNullable(input.lastName),
      relation: input.relation,
      phone: encryptNullable(input.phone),
      color: input.color,
    },
  });
  return toCaregiverDTO(row);
}

export async function updateCaregiver(caregiverId: string, input: CaregiverInput): Promise<CaregiverDTO> {
  const user = await requireParent();
  const existing = await prisma.caregiver.findUniqueOrThrow({ where: { id: caregiverId } });
  assertSameFamily(user, existing.familyId);

  const row = await prisma.caregiver.update({
    where: { id: caregiverId },
    data: {
      firstName: encrypt(input.firstName),
      lastName: encryptNullable(input.lastName),
      relation: input.relation,
      phone: encryptNullable(input.phone),
      color: input.color,
    },
  });
  return toCaregiverDTO(row);
}

export async function deleteCaregiver(caregiverId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.caregiver.findUniqueOrThrow({ where: { id: caregiverId } });
  assertSameFamily(user, existing.familyId);
  if (existing.userId) {
    throw new Error("Impossible de supprimer une personne liée à un compte utilisateur actif.");
  }
  await prisma.caregiver.delete({ where: { id: caregiverId } });
}

export async function assertCaregiversBelongToFamily(user: SessionUser, caregiverIds: string[]): Promise<void> {
  if (caregiverIds.length === 0) return;
  const count = await prisma.caregiver.count({
    where: { id: { in: caregiverIds }, familyId: user.familyId },
  });
  if (count !== caregiverIds.length) {
    throw new Error("Une ou plusieurs personnes sélectionnées n'appartiennent pas à votre famille.");
  }
}

/**
 * Every user (parent or viewer) gets a linked Caregiver profile, so they can
 * be picked as the "responsable" of an event exactly like any other person —
 * matching the ER model, which only has one join table (EventCaregiver).
 */
export async function ensureCaregiverForUser(params: {
  familyId: string;
  userId: string;
  firstName: string;
  lastName?: string | null;
  relation: CaregiverRelation;
  color: string;
}) {
  return prisma.caregiver.upsert({
    where: { userId: params.userId },
    update: {},
    create: {
      familyId: params.familyId,
      userId: params.userId,
      firstName: encrypt(params.firstName),
      lastName: encryptNullable(params.lastName ?? null),
      relation: params.relation,
      color: params.color,
    },
  });
}
