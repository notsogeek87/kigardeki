import "server-only";
import bcrypt from "bcryptjs";
import type { CaregiverRelation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const CAREGIVER_COLORS = ["#2563eb", "#16a34a", "#db2777", "#d97706", "#7c3aed", "#0891b2"];

export function pickColor(index: number): string {
  return CAREGIVER_COLORS[index % CAREGIVER_COLORS.length] as string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export type RegisterFamilyInput = {
  familyName: string;
  parentName: string;
  parentRelation: CaregiverRelation;
  email: string;
  password: string;
};

/**
 * Creates a brand-new family with its first PARENT account. This is the
 * only way a family comes into existence — nobody ever "joins" a family
 * just by knowing its id; every other member arrives through an
 * Invitation (see invitations.ts).
 */
export async function registerFamily(input: RegisterFamilyInput) {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const family = await tx.family.create({ data: { name: encrypt(input.familyName) } });

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: encrypt(input.parentName),
        role: "PARENT",
        familyId: family.id,
      },
    });

    await tx.caregiver.create({
      data: {
        familyId: family.id,
        userId: user.id,
        firstName: encrypt(input.parentName),
        relation: input.parentRelation,
        color: pickColor(0),
      },
    });

    return { familyId: family.id, userId: user.id };
  });
}
