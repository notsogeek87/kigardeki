import { addUTCDays, toDateInputValue } from "@/lib/wall-time";

export type AbsenceDTO = {
  id: string;
  caregiverId: string;
  /** First absent day, `YYYY-MM-DD`. */
  startDate: string;
  /** Last absent day (inclusive), `YYYY-MM-DD`. */
  endDate: string;
};

/**
 * Days in [rangeStart, rangeEnd) covered by at least one absence, mapped to
 * the ids of the caregivers absent that day (no duplicates, input order).
 */
export function absentCaregiversByDay(
  absences: AbsenceDTO[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, string[]> {
  const byDay = new Map<string, string[]>();
  const from = toDateInputValue(rangeStart);
  const to = toDateInputValue(addUTCDays(rangeEnd, -1));
  for (const absence of absences) {
    const first = absence.startDate > from ? absence.startDate : from;
    const last = absence.endDate < to ? absence.endDate : to;
    for (let d = new Date(`${first}T00:00:00.000Z`); toDateInputValue(d) <= last; d = addUTCDays(d, 1)) {
      const key = toDateInputValue(d);
      const ids = byDay.get(key) ?? [];
      if (!ids.includes(absence.caregiverId)) ids.push(absence.caregiverId);
      byDay.set(key, ids);
    }
  }
  return byDay;
}
