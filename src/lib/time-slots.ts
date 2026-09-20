import { toTimeInputValue, formatTime } from "@/lib/wall-time";

/**
 * Events are scheduled by half-day slot (Matin / Après-midi) rather than a
 * free-form clock time — simpler to fill in, and it makes "who has this
 * child this half-day" unambiguous, which is what the auto-supersede logic
 * in src/lib/data/events.ts relies on to know exactly which half of a
 * conflicting day survives.
 */
export const MORNING_START = "08:00";
export const MIDDAY = "13:00";
export const AFTERNOON_END = "18:30";

export type TimeSlot = "MORNING" | "AFTERNOON";

export function slotsToTimeRange(slots: TimeSlot[]): { startTime: string; endTime: string } {
  const hasMorning = slots.includes("MORNING");
  const hasAfternoon = slots.includes("AFTERNOON");
  if (hasMorning && hasAfternoon) return { startTime: MORNING_START, endTime: AFTERNOON_END };
  if (hasMorning) return { startTime: MORNING_START, endTime: MIDDAY };
  if (hasAfternoon) return { startTime: MIDDAY, endTime: AFTERNOON_END };
  throw new Error("Sélectionnez au moins Matin ou Après-midi.");
}

/** Best-effort reverse mapping, for pre-checking the boxes when editing an existing event. */
export function timeToSlots(startTime: string, endTime: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  if (startTime < MIDDAY) slots.push("MORNING");
  if (endTime > MIDDAY) slots.push("AFTERNOON");
  return slots;
}

/** For display: a human label when the range matches a known slot combination, else null (fall back to clock time). */
export function timeRangeToSlotLabel(startTime: string, endTime: string): string | null {
  if (startTime === MORNING_START && endTime === AFTERNOON_END) return "Journée";
  if (startTime === MORNING_START && endTime === MIDDAY) return "Matin";
  if (startTime === MIDDAY && endTime === AFTERNOON_END) return "Après-midi";
  return null;
}

/** Slot label when the Dates match a known slot combination, else "HH:mm → HH:mm". */
export function formatSlotOrTime(start: Date, end: Date): string {
  const label = timeRangeToSlotLabel(toTimeInputValue(start), toTimeInputValue(end));
  return label ?? `${formatTime(start)} → ${formatTime(end)}`;
}

/** Compact variant for tight spaces (week-grid chips): abbreviates "Après-midi" to "Aprèm". */
export function formatSlotOrTimeShort(start: Date, end: Date): string {
  const label = timeRangeToSlotLabel(toTimeInputValue(start), toTimeInputValue(end));
  if (label === "Après-midi") return "Aprèm";
  return label ?? formatTime(start);
}
