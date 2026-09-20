"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EventType } from "@prisma/client";
import { createChild, deleteChild, updateChild } from "@/lib/data/children";
import { createEvent } from "@/lib/data/events";
import { combineDateAndTime } from "@/lib/wall-time";
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

const scheduleSchema = z.object({
  scheduleType: z.enum(["NONE", "SCHOOL", "DAYCARE", "CAREGIVING"]).default("NONE"),
  scheduleCaregiverId: z.string().optional(),
  scheduleDays: z.array(z.string()).optional(),
  scheduleStartTime: z.string().optional(),
  scheduleEndTime: z.string().optional(),
  scheduleStartDate: z.string().optional(),
  scheduleEndDate: z.string().optional(),
});

/** Reads the optional "default schedule" fields from the new-child form (see ChildDefaultScheduleFields). */
async function createDefaultScheduleIfRequested(
  childId: string,
  location: string | null,
  formData: FormData
): Promise<void> {
  const parsed = scheduleSchema.parse({
    scheduleType: formData.get("scheduleType") || "NONE",
    scheduleCaregiverId: formData.get("scheduleCaregiverId") || undefined,
    scheduleDays: formData.getAll("scheduleDays").map(String),
    scheduleStartTime: formData.get("scheduleStartTime") || undefined,
    scheduleEndTime: formData.get("scheduleEndTime") || undefined,
    scheduleStartDate: formData.get("scheduleStartDate") || undefined,
    scheduleEndDate: formData.get("scheduleEndDate") || undefined,
  });

  if (parsed.scheduleType === "NONE") return;
  if (parsed.scheduleType === "CAREGIVING" && !parsed.scheduleCaregiverId) return;

  const days = (parsed.scheduleDays ?? []).map(Number).filter((n) => !Number.isNaN(n));
  const startDate = parsed.scheduleStartDate;
  if (days.length === 0 || !startDate) return;

  const startTime = parsed.scheduleStartTime || "08:30";
  const endTime = parsed.scheduleEndTime || "16:30";

  await createEvent({
    type: parsed.scheduleType as EventType,
    startAt: combineDateAndTime(startDate, startTime),
    endAt: combineDateAndTime(startDate, endTime),
    location,
    childIds: [childId],
    caregiverIds: parsed.scheduleCaregiverId ? [parsed.scheduleCaregiverId] : [],
    recurrence: {
      frequency: "WEEKLY",
      daysOfWeek: days,
      endDate: parsed.scheduleEndDate ? combineDateAndTime(parsed.scheduleEndDate, "23:59") : null,
    },
  });
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
    const child = await createChild(input);

    // Best-effort: the child is already created at this point, so a
    // problem here shouldn't send the user back to a "create child" form
    // that would just create a duplicate — it only means they'll add the
    // schedule by hand from the Planning tab instead.
    try {
      await createDefaultScheduleIfRequested(child.id, input.defaultLocation, formData);
    } catch {
      // Ignored — see above.
    }
  } catch (error) {
    redirectPath("", error);
  }
  revalidatePath("/children");
  revalidatePath("/today");
  revalidatePath("/planning");
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
