/** Grey diagonal hatch painted over a calendar day when someone is absent. */
export const ABSENCE_HATCH =
  "repeating-linear-gradient(135deg, rgba(100, 116, 139, 0.16) 0 3px, transparent 3px 7px)";

/** Overlay covering its (relatively positioned) parent with the absence hatch. */
export function AbsenceHatch({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: ABSENCE_HATCH }}
      aria-hidden="true"
    />
  );
}

/** Legend line: "Absence de Mary" / "Absences de Mary et Paul". */
export function absenceLegendLabel(names: string[]): string {
  if (names.length <= 1) return `Absence de ${names[0] ?? ""}`;
  return `Absences de ${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/** Hatched swatch matching the calendar overlay, for legends. */
export function AbsenceSwatch({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shrink-0 border border-slate-300 ${className}`}
      style={{ backgroundImage: ABSENCE_HATCH }}
      aria-hidden="true"
    />
  );
}

/** "Mary absente" / "Mary et Paul absents". */
export function absenceLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} absent(e)`;
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]} absent(e)s`;
}
