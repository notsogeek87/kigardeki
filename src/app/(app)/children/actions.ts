"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createChild, deleteChild, updateChild } from "@/lib/data/children";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";

const schema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  color: z.string().trim().min(1),
  defaultLocation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parseInput(formData: FormData) {
  const parsed = schema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    color: formData.get("color"),
    defaultLocation: formData.get("defaultLocation") || undefined,
    notes: formData.get("notes") || undefined,
  });
  return {
    firstName: parsed.firstName,
    lastName: parsed.lastName ?? null,
    birthDate: parsed.birthDate ?? null,
    color: parsed.color,
    defaultLocation: parsed.defaultLocation ?? null,
    notes: parsed.notes ?? null,
  };
}

function redirectPath(childId: string, error: unknown): never {
  const message =
    error instanceof ForbiddenError || error instanceof UnauthorizedError
      ? "Action non autorisée."
      : error instanceof Error
        ? error.message
        : "Une erreur est survenue.";
  redirect(childId ? `/children/${childId}?error=${encodeURIComponent(message)}` : `/children/new?error=${encodeURIComponent(message)}`);
}

export async function createChildAction(formData: FormData): Promise<void> {
  try {
    const input = parseInput(formData);
    await createChild(input);
  } catch (error) {
    redirectPath("", error);
  }
  revalidatePath("/children");
  revalidatePath("/today");
  redirect("/children");
}

export async function updateChildAction(childId: string, formData: FormData): Promise<void> {
  try {
    const input = parseInput(formData);
    await updateChild(childId, input);
  } catch (error) {
    redirectPath(childId, error);
  }
  revalidatePath("/children");
  revalidatePath("/today");
  redirect("/children");
}

export async function deleteChildAction(childId: string): Promise<void> {
  try {
    await deleteChild(childId);
  } catch (error) {
    redirectPath(childId, error);
  }
  revalidatePath("/children");
  revalidatePath("/today");
  redirect("/children");
}
