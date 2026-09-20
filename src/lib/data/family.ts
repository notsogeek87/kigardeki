import "server-only";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { requireParent, requireSession } from "@/lib/permissions";
import { toFamilyDTO, type FamilyDTO } from "@/lib/data/dto";

export async function getMyFamily(): Promise<FamilyDTO> {
  const user = await requireSession();
  const row = await prisma.family.findUniqueOrThrow({ where: { id: user.familyId } });
  return toFamilyDTO(row);
}

export type FamilyMemberDTO = {
  id: string;
  name: string;
  email: string;
  role: "PARENT" | "VIEWER";
};

export async function listFamilyMembers(): Promise<FamilyMemberDTO[]> {
  const user = await requireSession();
  const rows = await prisma.user.findMany({
    where: { familyId: user.familyId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({ id: row.id, name: decrypt(row.name), email: row.email, role: row.role }));
}

export type PendingInvitationDTO = {
  id: string;
  email: string;
  role: "PARENT" | "VIEWER";
  expiresAt: Date;
  token: string;
};

export async function listPendingInvitations(): Promise<PendingInvitationDTO[]> {
  const user = await requireParent();
  const rows = await prisma.invitation.findMany({
    where: { familyId: user.familyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt,
    token: row.token,
  }));
}
