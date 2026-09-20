"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireParent, requireSession } from "@/lib/permissions";
import { hashPassword } from "@/lib/data/users";
import { encrypt } from "@/lib/crypto";

const schema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
});

export async function changePasswordAction(formData: FormData): Promise<void> {
  const user = await requireSession();

  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    redirect(`/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Erreur")}`);
  }

  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
  if (!valid) {
    redirect("/settings?error=Mot%20de%20passe%20actuel%20incorrect.");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  redirect("/settings?success=1");
}

const familyNameSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la famille est requis."),
});

export async function renameFamilyAction(formData: FormData): Promise<void> {
  const user = await requireParent();
  const parsed = familyNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(`/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Erreur")}`);
  }

  await prisma.family.update({ where: { id: user.familyId }, data: { name: encrypt(parsed.data.name) } });
  redirect("/settings?success=1");
}
