"use client";

import { useState } from "react";
import { WEEKDAY_CHECKBOX_LABELS } from "@/lib/labels";

export function RecurrenceFields({
  defaultRecurring,
  defaultDays,
  defaultEndDate,
}: {
  defaultRecurring: boolean;
  defaultDays: number[];
  defaultEndDate: string;
}) {
  const [recurring, setRecurring] = useState(defaultRecurring);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="recurring"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="text-sm font-medium text-slate-700">Se répète chaque semaine</span>
      </label>

      {recurring && (
        <>
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
                  defaultChecked={defaultDays.includes(d.value)}
                  className="sr-only"
                />
                {d.label}
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Jusqu&apos;au (optionnel)</span>
            <input
              type="date"
              name="recurrenceEndDate"
              defaultValue={defaultEndDate}
              className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </>
      )}
    </div>
  );
}
