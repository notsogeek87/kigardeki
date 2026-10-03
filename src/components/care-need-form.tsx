"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ChildDTO } from "@/lib/data/dto";

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function CareNeedForm({
  action,
  familyChildren,
  error,
  defaultDate,
}: {
  action: (formData: FormData) => Promise<void>;
  familyChildren: ChildDTO[];
  error?: string;
  defaultDate: string;
}) {
  const [picked, setPicked] = useState(defaultDate);
  const [dates, setDates] = useState<string[]>([]);

  function addDate() {
    if (picked && !dates.includes(picked)) setDates([...dates, picked].sort());
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate-700">Enfant(s)</legend>
        <div className="flex flex-col gap-2">
          {familyChildren.map((child) => (
            <label
              key={child.id}
              className="tap-target flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input type="checkbox" name="childIds" value={child.id} className="h-5 w-5 rounded border-slate-300" />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: child.color }} />
              {child.firstName}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Jours où une garde est nécessaire</span>
        <div className="flex gap-2">
          <input
            type="date"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="tap-target flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={addDate}
            className="tap-target rounded-xl border border-brand-600 px-4 text-sm font-semibold text-brand-600 active:bg-brand-50"
          >
            + Ajouter ce jour
          </button>
        </div>
        {dates.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun jour sélectionné.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <li
                key={d}
                className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm capitalize text-slate-700"
              >
                {formatDay(d)}
                <input type="hidden" name="dates" value={d} />
                <button
                  type="button"
                  aria-label={`Retirer ${formatDay(d)}`}
                  onClick={() => setDates(dates.filter((x) => x !== d))}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 active:bg-slate-200"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SubmitButton className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
