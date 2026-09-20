import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/permissions";

export type ShareLinkDTO = {
  id: string;
  token: string;
  createdAt: Date;
};

export async function createShareLink(): Promise<ShareLinkDTO> {
  const user = await requireParent();
  const token = randomBytes(24).toString("base64url");

  const link = await prisma.shareLink.create({
    data: { familyId: user.familyId, token, createdBy: user.id },
  });

  return { id: link.id, token: link.token, createdAt: link.createdAt };
}

export async function listShareLinks(): Promise<ShareLinkDTO[]> {
  const user = await requireParent();
  const links = await prisma.shareLink.findMany({
    where: { familyId: user.familyId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return links.map((l) => ({ id: l.id, token: l.token, createdAt: l.createdAt }));
}

export async function revokeShareLink(id: string): Promise<void> {
  const user = await requireParent();
  const link = await prisma.shareLink.findUniqueOrThrow({ where: { id } });
  if (link.familyId !== user.familyId) {
    throw new Error("Ce lien n'appartient pas à votre famille.");
  }
  await prisma.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
}

/**
 * Public lookup for the /share/[token] page — no session involved. The
 * token itself, being long and random, is the credential; a valid,
 * non-revoked token authorizes read-only access to that family's planning.
 */
export async function resolveShareToken(token: string): Promise<{ familyId: string; familyName: string } | null> {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { family: true },
  });
  if (!link || link.revokedAt) return null;

  const { decrypt } = await import("@/lib/crypto");
  return { familyId: link.familyId, familyName: decrypt(link.family.name) };
}
