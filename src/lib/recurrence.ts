import type { RecurrenceFrequency } from "@prisma/client";

export type RecurringEventInput = {
  id: string;
  startAt: Date;
  endAt: Date;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDaysOfWeek: number[];
  recurrenceEndDate: Date | null;
};

export type Occurrence = {
  occurrenceDate: string; // YYYY-MM-DD, stable key for a given occurrence
  startAt: Date;
  endAt: Date;
};

// All dates in this app are "wall clock" values stored using UTC getters/
// setters (see src/lib/wall-time.ts) — there is no real timezone
// conversion anywhere. Using the UTC variants here (not getDay/setHours/…)
// keeps this deterministic regardless of the server's local timezone.

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Expands a (possibly recurring) event into its concrete occurrences that
 * intersect [rangeStart, rangeEnd). Recurrence is intentionally simple:
 * weekly, on a fixed set of week days, from startAt's date until an
 * optional end date — no exceptions, no monthly/yearly rules.
 */
export function expandEventOccurrences(
  event: RecurringEventInput,
  rangeStart: Date,
  rangeEnd: Date
): Occurrence[] {
  const durationMs = event.endAt.getTime() - event.startAt.getTime();

  if (!event.recurrenceFrequency) {
    if (event.startAt < rangeEnd && event.endAt > rangeStart) {
      return [{ occurrenceDate: toISODate(event.startAt), startAt: event.startAt, endAt: event.endAt }];
    }
    return [];
  }

  const daysOfWeek =
    event.recurrenceDaysOfWeek.length > 0 ? event.recurrenceDaysOfWeek : [event.startAt.getUTCDay()];

  const eventStartDay = startOfDay(event.startAt);
  const searchStart = eventStartDay > startOfDay(rangeStart) ? eventStartDay : startOfDay(rangeStart);
  const hardEnd = event.recurrenceEndDate
    ? new Date(Math.min(rangeEnd.getTime(), event.recurrenceEndDate.getTime() + 24 * 60 * 60 * 1000))
    : rangeEnd;

  const occurrences: Occurrence[] = [];
  const hours = event.startAt.getUTCHours();
  const minutes = event.startAt.getUTCMinutes();

  for (let d = new Date(searchStart); d < hardEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!daysOfWeek.includes(d.getUTCDay())) continue;

    const occStart = new Date(d);
    occStart.setUTCHours(hours, minutes, 0, 0);
    const occEnd = new Date(occStart.getTime() + durationMs);

    if (occStart < rangeEnd && occEnd > rangeStart) {
      occurrences.push({ occurrenceDate: toISODate(occStart), startAt: occStart, endAt: occEnd });
    }
  }

  return occurrences;
}
