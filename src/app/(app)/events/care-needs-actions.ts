"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCareNeeds, deleteCareNeed } from "@/lib/data/care-needs";
import { combineDateAndTime } from "@/lib/wall-time";

const schema = z.object({
  childIds: z.array(z.string()).min(1, "Sélectionnez au moins un enfant."),
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1, "Sélectionnez au moins un jour.")
    .max(120, "Trop de jours sélectionnés."),
});

export async function createCareNeedsAction(formData: FormData): Promise<void> {
  try {
    const parsed = schema.parse({
      childIds: formData.getAll("childIds").map(String),
      dates: formData.getAll("dates").map(String),
    });
    const dates = Array.from(new Set(parsed.dates)).map((d) => combineDateAndTime(d, "00:00"));
    await createCareNeeds(parsed.childIds, dates);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Données invalides.")
        : error instanceof Error
          ? error.message
          : "Une erreur est survenue.";
    redirect(`/events/new?mode=care-need&error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/planning");
  redirect("/planning?view=needs");
}

export async function deleteCareNeedAction(careNeedId: string): Promise<void> {
  await deleteCareNeed(careNeedId);
  revalidatePath("/planning");
}
