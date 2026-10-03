import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { requireParent, requireSession } from "@/lib/permissions";
import type { FamilyDTO } from "@/lib/data/dto";

export const familyCacheTag = (familyId: string) => `family-${familyId}`;

// Only the still-encrypted row is cached: the layout reads the family on
// every navigation, but plaintext family data must never land in Next's
// data cache. Decryption happens after the cache read.
const getFamilyRowCached = (familyId: string) =>
  unstable_cache(
    async () => {
      const row = await prisma.family.findUniqueOrThrow({ where: { id: familyId } });
      return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() };
    },
    ["family-row", familyId],
    { tags: [familyCacheTag(familyId)], revalidate: 300 }
  )();

export async function getMyFamily(): Promise<FamilyDTO> {
  const user = await requireSession();
  const row = await getFamilyRowCached(user.familyId);
  return { id: row.id, name: decrypt(row.name), createdAt: new Date(row.createdAt) };
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
  return rows
    // Defensive against the deploy window between this code going live and
    // scripts/backfill-token-hashes.ts finishing on a database that
    // predates tokenHash/tokenEncrypted: such rows would otherwise crash
    // this page (decrypt() on a still-null value) instead of just
    // temporarily omitting that one invitation.
    .filter((row): row is typeof row & { tokenEncrypted: string } => Boolean(row.tokenEncrypted))
    .map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt,
      token: decrypt(row.tokenEncrypted),
    }));
}
