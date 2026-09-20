"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EventType } from "@prisma/client";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "@/lib/data/events";
import { combineDateAndTime } from "@/lib/wall-time";
import { slotsToTimeRange, type TimeSlot } from "@/lib/time-slots";

const EVENT_TYPES = ["SCHOOL", "DAYCARE", "CAREGIVING", "PARENT", "OTHER"] as const;
const SLOTS = ["MORNING", "AFTERNOON"] as const;

const schema = z.object({
  type: z.enum(EVENT_TYPES),
  date: z.string().min(1, "La date de début est requise."),
  dateEnd: z.string().optional(),
  slots: z.array(z.enum(SLOTS)).min(1, "Sélectionnez au moins Matin ou Après-midi."),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  childIds: z.array(z.string()).min(1, "Sélectionnez au moins un enfant."),
  caregiverIds: z.array(z.string()).optional(),
  recurring: z.string().optional(),
  recurrenceDays: z.array(z.string()).optional(),
  recurrenceEndDate: z.string().optional(),
});

function parseInput(formData: FormData): EventInput {
  const parsed = schema.parse({
    type: formData.get("type"),
    date: formData.get("date"),
    dateEnd: formData.get("dateEnd") || undefined,
    slots: formData.getAll("slots").map(String),
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
    childIds: formData.getAll("childIds").map(String),
    caregiverIds: formData.getAll("caregiverIds").map(String),
    recurring: formData.get("recurring") || undefined,
    recurrenceDays: formData.getAll("recurrenceDays").map(String),
    recurrenceEndDate: formData.get("recurrenceEndDate") || undefined,
  });

  const { startTime, endTime } = slotsToTimeRange(parsed.slots as TimeSlot[]);
  const startAt = combineDateAndTime(parsed.date, startTime);
  const endAt = combineDateAndTime(parsed.date, endTime);

  let recurrence: EventInput["recurrence"] = null;
  if (parsed.recurring === "on") {
    // Advanced mode: a standing pattern on specific weekdays, optionally forever.
    recurrence = {
      frequency: "WEEKLY",
      daysOfWeek: (parsed.recurrenceDays ?? []).map(Number),
      endDate: parsed.recurrenceEndDate ? combineDateAndTime(parsed.recurrenceEndDate, "00:00") : null,
    };
  } else if (parsed.dateEnd && parsed.dateEnd > parsed.date) {
    // Simple mode: every calendar day across a consecutive-day period.
    recurrence = {
      frequency: "DAILY",
      daysOfWeek: [],
      endDate: combineDateAndTime(parsed.dateEnd, "00:00"),
    };
  }

  return {
    type: parsed.type as EventType,
    startAt,
    endAt,
    location: parsed.location ?? null,
    notes: parsed.notes ?? null,
    childIds: parsed.childIds,
    caregiverIds: parsed.caregiverIds ?? [],
    recurrence,
  };
}

function redirectWithError(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createEventAction(formData: FormData): Promise<void> {
  try {
    const input = parseInput(formData);
    await createEvent(input);
  } catch (error) {
    redirectWithError("/events/new", error);
  }
  revalidatePath("/planning");
  revalidatePath("/today");
  redirect("/planning");
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<void> {
  try {
    const input = parseInput(formData);
    await updateEvent(eventId, input);
  } catch (error) {
    redirectWithError(`/events/${eventId}/edit`, error);
  }
  revalidatePath("/planning");
  revalidatePath("/today");
  redirect("/planning");
}

export async function deleteEventAction(eventId: string): Promise<void> {
  try {
    await deleteEvent(eventId);
  } catch (error) {
    redirectWithError(`/events/${eventId}/edit`, error);
  }
  revalidatePath("/planning");
  revalidatePath("/today");
  redirect("/planning");
}
