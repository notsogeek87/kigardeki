/**
 * This is a single-family, single-timezone app: every parent, viewer and
 * server sees the same wall-clock time for an event ("16h30" always means
 * 16h30, regardless of where the request is processed). Rather than
 * tracking a real IANA timezone, every Date is stored and read back using
 * its UTC getters/setters — i.e. "UTC" is used purely as a neutral
 * container for wall-clock numbers, never converted. This sidesteps a
 * whole class of off-by-a-few-hours bugs between browser and server
 * timezones without needing timezone data at all.
 */

export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0));
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toTimeInputValue(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatTime(date: Date): string {
  return toTimeInputValue(date);
}

const WEEKDAY_LABELS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const WEEKDAY_LABELS_LONG = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const MONTH_LABELS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatDateShort(date: Date): string {
  return `${WEEKDAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()}`;
}

export function formatDateLong(date: Date): string {
  return `${WEEKDAY_LABELS_LONG[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_LABELS[date.getUTCMonth()]}`;
}

export function isSameUTCDate(a: Date, b: Date): boolean {
  return toDateInputValue(a) === toDateInputValue(b);
}

export function startOfUTCDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addUTCDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Monday-start week containing `date`. */
export function startOfUTCWeek(date: Date): Date {
  const d = startOfUTCDay(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addUTCDays(d, diff);
}

export function startOfUTCMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
