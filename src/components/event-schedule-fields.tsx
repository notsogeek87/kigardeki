"use client";

import { useState } from "react";
import { WEEKDAY_CHECKBOX_LABELS } from "@/lib/labels";
import { TimeSlotCheckboxes } from "@/components/time-slot-checkboxes";
import type { TimeSlot } from "@/lib/time-slots";

const INPUT_CLASS =
  "tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

/**
 * Unified date/time section for the event form:
 * - "Date de début" + optional "Date de fin" cover the common cases —
 *   a single half-day (same date, one slot unchecked) or several
 *   consecutive days (later end date, both slots checked by default) —
 *   without the user ever having to think about weekdays.
 * - "Se répète chaque semaine" is a separate, opt-in advanced mode for a
 *   standing pattern on specific weekdays with no end date (e.g. "tous
 *   les mercredis") — turning it on hides the simple end date, since the
 *   weekly mode has its own.
 */
export function EventScheduleFields({
  defaultDateStart,
  defaultDateEnd,
  defaultSlots,
  defaultRecurring,
  defaultRecurrenceDays,
  defaultRecurrenceEndDate,
}: {
  defaultDateStart?: string;
  defaultDateEnd?: string;
  defaultSlots: TimeSlot[];
  defaultRecurring: boolean;
  defaultRecurrenceDays: number[];
  defaultRecurrenceEndDate: string;
}) {
  const [recurring, setRecurring] = useState(defaultRecurring);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Date de début</span>
          <input type="date" name="date" required defaultValue={defaultDateStart} className={INPUT_CLASS} />
        </label>
        {!recurring && (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Date de fin (optionnel)</span>
            <input type="date" name="dateEnd" defaultValue={defaultDateEnd} className={INPUT_CLASS} />
          </label>
        )}
      </div>

      <TimeSlotCheckboxes defaultSlots={defaultSlots} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="recurring"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">
            Avancé : se répète chaque semaine sur des jours précis
          </span>
        </label>

        {recurring && (
          <>
            <p className="text-xs text-slate-400">
              Pour un planning permanent (ex. « tous les mercredis »). La date de fin ci-dessus est
              remplacée par celle-ci.
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_CHECKBOX_LABELS.map((d) => (
                <label
                  key={d.value}
                  className="tap-target flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                >
                  <input
                    type="checkbox"
                    name="recurrenceDays"
                    value={d.value}
                    defaultChecked={defaultRecurrenceDays.includes(d.value)}
                    className="sr-only"
                  />
                  {d.label}
                </label>
              ))}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Jusqu&apos;au (optionnel)</span>
              <input
                type="date"
                name="recurrenceEndDate"
                defaultValue={defaultRecurrenceEndDate}
                className={INPUT_CLASS}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
