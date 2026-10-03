import Link from "next/link";
import type { CareNeedDTO } from "@/lib/data/care-needs";

export const RAINBOW = "linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)";

export type NeedDay = { childIds: string[]; uncovered: boolean };

type OccurrenceLike = { occurrenceDate: string; childIds: string[] };

/**
 * Groups care needs by day. A need is "uncovered" (shown as a rainbow) while
 * nothing is planned that day for the child it concerns.
 */
export function groupNeeds(needs: CareNeedDTO[], occurrences: OccurrenceLike[]): Map<string, NeedDay> {
  const result = new Map<string, NeedDay>();
  for (const need of needs) {
    const covered = occurrences.some((o) => o.occurrenceDate === need.date && o.childIds.includes(need.childId));
    const day = result.get(need.date) ?? { childIds: [], uncovered: false };
    day.childIds.push(need.childId);
    day.uncovered ||= !covered;
    result.set(need.date, day);
  }
  return result;
}

export function RainbowBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${className}`}
      style={{ background: RAINBOW }}
    >
      {label}
    </span>
  );
}

export function needLabel(childIds: string[], children_: { id: string; firstName: string }[]): string {
  const names = childIds.map((id) => children_.find((c) => c.id === id)?.firstName).filter(Boolean);
  return `Garde nécessaire${names.length > 0 ? ` · ${names.join(", ")}` : ""}`;
}

/** Prominent call-out linking to the "À garder" list, shown to everyone. */
export function CareNeedBanner({ href, count }: { href: string; count: number }) {
  if (count === 0) return null;
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
      style={{ background: RAINBOW }}
    >
      <span>
        {count === 1 ? "1 jour" : `${count} jours`} où une garde est nécessaire
      </span>
      <span aria-hidden="true">Voir →</span>
    </Link>
  );
}
