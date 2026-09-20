import "server-only";
import { prisma } from "@/lib/prisma";
import { encrypt, encryptNullable } from "@/lib/crypto";
import { assertSameFamily, requireParent, requireSession, type SessionUser } from "@/lib/permissions";
import { toChildDTO, type ChildDTO } from "@/lib/data/dto";

export type ChildInput = {
  firstName: string;
  lastName?: string | null;
  birthDate?: string | null; // ISO date, e.g. "2020-05-14"
  color: string;
  defaultLocation?: string | null;
  notes?: string | null;
};

export async function listChildren(): Promise<ChildDTO[]> {
  const user = await requireSession();
  const rows = await prisma.child.findMany({
    where: { familyId: user.familyId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toChildDTO);
}

/**
 * No session check — for the public /share/[token] read-only page ONLY,
 * where the family id has already been authorized by resolving a valid,
 * non-revoked ShareLink token. Never call this from an authenticated
 * route with a caller-supplied familyId.
 */
export async function listChildrenForFamily(familyId: string): Promise<ChildDTO[]> {
  const rows = await prisma.child.findMany({ where: { familyId }, orderBy: { createdAt: "asc" } });
  return rows.map(toChildDTO);
}

export async function getChild(childId: string): Promise<ChildDTO | null> {
  const user = await requireSession();
  const row = await prisma.child.findUnique({ where: { id: childId } });
  if (!row) return null;
  assertSameFamily(user, row.familyId);
  return toChildDTO(row);
}

export async function createChild(input: ChildInput): Promise<ChildDTO> {
  const user = await requireParent();
  const row = await prisma.child.create({
    data: {
      familyId: user.familyId,
      firstName: encrypt(input.firstName),
      lastName: encryptNullable(input.lastName),
      birthDate: encryptNullable(input.birthDate),
      color: input.color,
      defaultLocation: encryptNullable(input.defaultLocation),
      notes: encryptNullable(input.notes),
    },
  });
  return toChildDTO(row);
}

export async function updateChild(childId: string, input: ChildInput): Promise<ChildDTO> {
  const user = await requireParent();
  const existing = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  assertSameFamily(user, existing.familyId);

  const row = await prisma.child.update({
    where: { id: childId },
    data: {
      firstName: encrypt(input.firstName),
      lastName: encryptNullable(input.lastName),
      birthDate: encryptNullable(input.birthDate),
      color: input.color,
      defaultLocation: encryptNullable(input.defaultLocation),
      notes: encryptNullable(input.notes),
    },
  });
  return toChildDTO(row);
}

export async function deleteChild(childId: string): Promise<void> {
  const user = await requireParent();
  const existing = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  assertSameFamily(user, existing.familyId);
  await prisma.child.delete({ where: { id: childId } });
}

export async function assertChildrenBelongToFamily(user: SessionUser, childIds: string[]): Promise<void> {
  if (childIds.length === 0) return;
  const count = await prisma.child.count({ where: { id: { in: childIds }, familyId: user.familyId } });
  if (count !== childIds.length) {
    throw new Error("Un ou plusieurs enfants sélectionnés n'appartiennent pas à votre famille.");
  }
}
