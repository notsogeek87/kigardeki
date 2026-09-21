import "server-only";
import { randomBytes } from "crypto";
import type { CaregiverRelation, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, hashToken } from "@/lib/crypto";
import { requireParent } from "@/lib/permissions";
import { hashPassword, pickColor } from "@/lib/data/users";
import { ensureCaregiverForUser } from "@/lib/data/caregivers";

const INVITATION_TTL_DAYS = 7;

export type CreateInvitationInput = {
  email: string;
  role: Role;
  relation: CaregiverRelation;
};

/**
 * Only a PARENT can invite someone, and only by email — never by sharing a
 * family id or join code. The invitee always lands as VIEWER unless a
 * second PARENT is explicitly invited.
 */
export async function createInvitation(input: CreateInvitationInput) {
  const user = await requireParent();
  const email = input.email.toLowerCase().trim();

  const alreadyMember = await prisma.user.findUnique({ where: { email } });
  if (alreadyMember) {
    throw new Error("Cette personne a déjà un compte.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      familyId: user.familyId,
      email,
      tokenHash: hashToken(token),
      tokenEncrypted: encrypt(token),
      role: input.role,
      relation: input.relation,
      invitedBy: user.id,
      expiresAt,
    },
  });

  return { ...invitation, token };
}

export type InvitationPreview = {
  email: string;
  role: Role;
  familyName: string;
  valid: boolean;
};

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { family: true },
  });
  if (!invitation) return null;

  const valid = !invitation.acceptedAt && invitation.expiresAt > new Date();
  return {
    email: invitation.email,
    role: invitation.role,
    familyName: decrypt(invitation.family.name),
    valid,
  };
}

export type AcceptInvitationInput = {
  token: string;
  name: string;
  password: string;
};

export async function acceptInvitation(input: AcceptInvitationInput) {
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!invitation) throw new Error("Invitation introuvable.");
  if (invitation.acceptedAt) throw new Error("Cette invitation a déjà été utilisée.");
  if (invitation.expiresAt < new Date()) throw new Error("Cette invitation a expiré.");

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) throw new Error("Un compte existe déjà avec cet email.");

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const memberCount = await tx.user.count({ where: { familyId: invitation.familyId } });

    const user = await tx.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        name: encrypt(input.name),
        role: invitation.role,
        familyId: invitation.familyId,
      },
    });

    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });

    return { user, memberCount };
  });

  await ensureCaregiverForUser({
    familyId: invitation.familyId,
    userId: result.user.id,
    firstName: input.name,
    relation: invitation.relation ?? "OTHER",
    color: pickColor(result.memberCount),
  });

  return { userId: result.user.id, email: result.user.email };
}
