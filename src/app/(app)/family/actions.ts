"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CaregiverRelation, Role } from "@prisma/client";
import { createCaregiver, deleteCaregiver, updateCaregiver } from "@/lib/data/caregivers";
import { createInvitation } from "@/lib/data/invitations";

const RELATIONS = ["MOTHER", "FATHER", "GRANDMOTHER", "GRANDFATHER", "AUNT", "UNCLE", "NANNY", "OTHER"] as const;

const caregiverSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().optional(),
  relation: z.enum(RELATIONS),
  phone: z.string().trim().optional(),
  color: z.string().trim().min(1),
});

function redirectWithError(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createCaregiverAction(formData: FormData): Promise<void> {
  try {
    const parsed = caregiverSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName") || undefined,
      relation: formData.get("relation"),
      phone: formData.get("phone") || undefined,
      color: formData.get("color"),
    });
    await createCaregiver({
      firstName: parsed.firstName,
      lastName: parsed.lastName ?? null,
      relation: parsed.relation as CaregiverRelation,
      phone: parsed.phone ?? null,
      color: parsed.color,
    });
  } catch (error) {
    redirectWithError("/family/caregivers/new", error);
  }
  revalidatePath("/family");
  redirect("/family");
}

export async function updateCaregiverAction(caregiverId: string, formData: FormData): Promise<void> {
  try {
    const parsed = caregiverSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName") || undefined,
      relation: formData.get("relation"),
      phone: formData.get("phone") || undefined,
      color: formData.get("color"),
    });
    await updateCaregiver(caregiverId, {
      firstName: parsed.firstName,
      lastName: parsed.lastName ?? null,
      relation: parsed.relation as CaregiverRelation,
      phone: parsed.phone ?? null,
      color: parsed.color,
    });
  } catch (error) {
    redirectWithError(`/family/caregivers/${caregiverId}`, error);
  }
  revalidatePath("/family");
  redirect("/family");
}

export async function deleteCaregiverAction(caregiverId: string): Promise<void> {
  try {
    await deleteCaregiver(caregiverId);
  } catch (error) {
    redirectWithError(`/family/caregivers/${caregiverId}`, error);
  }
  revalidatePath("/family");
  redirect("/family");
}

const inviteSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  role: z.enum(["PARENT", "VIEWER"]),
  relation: z.enum(RELATIONS),
});

export async function inviteAction(formData: FormData): Promise<void> {
  try {
    const parsed = inviteSchema.parse({
      email: formData.get("email"),
      role: formData.get("role"),
      relation: formData.get("relation"),
    });
    await createInvitation({
      email: parsed.email,
      role: parsed.role as Role,
      relation: parsed.relation as CaregiverRelation,
    });
  } catch (error) {
    redirectWithError("/family/invite", error);
  }
  revalidatePath("/family");
  redirect("/family");
}
