import Link from "next/link";
import type { CareNeedDTO } from "@/lib/data/care-needs";
import { timeToSlots, type TimeSlot } from "@/lib/time-slots";
import { toTimeInputValue } from "@/lib/wall-time";

// Darker (700) stops so the white text on top keeps at least a 4.5:1
// contrast ratio everywhere along the gradient — the previous 500 stops
// dropped to ~2:1 on the yellow band.
export const RAINBOW =
  "linear-gradient(135deg, #b91c1c, #c2410c, #a16207, #15803d, #1d4ed8, #6d28d9)";

export type NeedEntry = { childId: string; slots: TimeSlot[] };
export type NeedDay = {
  childIds: string[];
  entries: NeedEntry[];
  uncovered: boolean;
};

type OccurrenceLike = {
  occurrenceDate: string;
  childIds: string[];
  occurrenceStartAt: Date;
  occurrenceEndAt: Date;
};

/** "Matin" / "Après-midi" / "Journée" for a set of half-days. */
export function slotsLabel(slots: TimeSlot[]): string {
  if (slots.includes("MORNING") && slots.includes("AFTERNOON"))
    return "Journée";
  return slots.includes("MORNING") ? "Matin" : "Après-midi";
}

/**
 * Groups care needs by day. A need is "uncovered" (shown as a rainbow) while
 * some half-day it asks for has nothing planned for the child it concerns.
 */
export function groupNeeds(
  needs: CareNeedDTO[],
  occurrences: OccurrenceLike[],
): Map<string, NeedDay> {
  const result = new Map<string, NeedDay>();
  for (const need of needs) {
    const covered = new Set<TimeSlot>();
    for (const o of occurrences) {
      if (o.occurrenceDate !== need.date || !o.childIds.includes(need.childId))
        continue;
      for (const slot of timeToSlots(
        toTimeInputValue(o.occurrenceStartAt),
        toTimeInputValue(o.occurrenceEndAt),
      )) {
        covered.add(slot);
      }
    }
    const day = result.get(need.date) ?? {
      childIds: [],
      entries: [],
      uncovered: false,
    };
    day.childIds.push(need.childId);
    day.entries.push({ childId: need.childId, slots: need.slots });
    day.uncovered ||= need.slots.some((slot) => !covered.has(slot));
    result.set(need.date, day);
  }
  return result;
}

export function RainbowBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${className}`}
      style={{ background: RAINBOW }}
    >
      {label}
    </span>
  );
}

export function needLabel(
  day: NeedDay,
  children_: { id: string; firstName: string }[],
  prefix = "Garde nécessaire",
): string {
  const names = day.entries
    .map((e) => {
      const name = children_.find((c) => c.id === e.childId)?.firstName;
      if (!name) return null;
      return e.slots.length === 2
        ? name
        : `${name} (${slotsLabel(e.slots).toLowerCase()})`;
    })
    .filter(Boolean);
  return `${prefix}${names.length > 0 ? ` · ${names.join(", ")}` : ""}`;
}

/** Prominent call-out linking to the "À garder" list, shown to everyone. */
export function CareNeedBanner({
  href,
  count,
}: {
  href: string;
  count: number;
}) {
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
