"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAbsence, deleteAbsence } from "@/lib/data/absences";
import { combineDateAndTime } from "@/lib/wall-time";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const schema = z.object({ startDate: DATE, endDate: DATE });

export async function createAbsenceAction(caregiverId: string, formData: FormData): Promise<void> {
  const path = `/family/caregivers/${caregiverId}`;
  try {
    const parsed = schema.parse({
      startDate: formData.get("startDate"),
      // A single-day absence only needs the start date.
      endDate: formData.get("endDate") || formData.get("startDate"),
    });
    await createAbsence(
      caregiverId,
      combineDateAndTime(parsed.startDate, "00:00"),
      combineDateAndTime(parsed.endDate, "00:00")
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Données invalides.")
        : error instanceof Error
          ? error.message
          : "Une erreur est survenue.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  revalidatePath("/planning");
  redirect(path);
}

export async function deleteAbsenceAction(caregiverId: string, absenceId: string): Promise<void> {
  await deleteAbsence(absenceId);
  revalidatePath(`/family/caregivers/${caregiverId}`);
  revalidatePath("/planning");
}
