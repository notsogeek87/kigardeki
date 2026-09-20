"use client";

import { useState } from "react";
import { WEEKDAY_CHECKBOX_LABELS } from "@/lib/labels";
import { toDateInputValue } from "@/lib/wall-time";
import type { CaregiverDTO } from "@/lib/data/dto";

const DEFAULT_DAYS = [1, 2, 3, 4, 5];
const INPUT_CLASS =
  "tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

type ScheduleType = "NONE" | "SCHOOL" | "DAYCARE" | "CAREGIVING";

const DEFAULT_TIMES: Record<ScheduleType, { start: string; end: string }> = {
  NONE: { start: "08:30", end: "16:30" },
  SCHOOL: { start: "08:30", end: "16:30" },
  DAYCARE: { start: "08:00", end: "17:30" },
  CAREGIVING: { start: "16:30", end: "19:30" },
};

/**
 * Optional "default schedule" shown only when creating a child: picking
 * école/crèche-nounou/garde here creates a single weekly-recurring event
 * for a whole period (start date → optional end date) right away, instead
 * of leaving a brand-new child with an empty planning until someone adds
 * events one day at a time.
 */
export function ChildDefaultScheduleFields({ caregivers }: { caregivers: CaregiverDTO[] }) {
  const [type, setType] = useState<ScheduleType>("NONE");
  const [times, setTimes] = useState(DEFAULT_TIMES.NONE);

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">Planning par défaut (optionnel)</legend>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Cet enfant est habituellement…</span>
        <select
          name="scheduleType"
          value={type}
          onChange={(e) => {
            const next = e.target.value as ScheduleType;
            setType(next);
            setTimes(DEFAULT_TIMES[next]);
          }}
          className={INPUT_CLASS}
        >
          <option value="NONE">Non défini — j&apos;ajouterai les événements moi-même</option>
          <option value="SCHOOL">🏫 À l&apos;école</option>
          <option value="DAYCARE">👶 À la crèche / chez la nounou</option>
          <option value="CAREGIVING">👵 Gardé(e) par une personne (Papi, Mamie...)</option>
        </select>
      </label>

      {type === "CAREGIVING" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Qui garde cet enfant ?</span>
          {caregivers.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Aucune personne enregistrée. Ajoutez-en une depuis l&apos;onglet <strong>Famille</strong>, puis
              créez l&apos;événement de garde depuis le Planning.
            </p>
          ) : (
            <select name="scheduleCaregiverId" required className={INPUT_CLASS}>
              {caregivers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {type !== "NONE" && !(type === "CAREGIVING" && caregivers.length === 0) && (
        <>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_CHECKBOX_LABELS.map((d) => (
              <label
                key={d.value}
                className="tap-target flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input
                  type="checkbox"
                  name="scheduleDays"
                  value={d.value}
                  defaultChecked={DEFAULT_DAYS.includes(d.value)}
                  className="sr-only"
                />
                {d.label}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-slate-600">Début</span>
              <input
                type="time"
                name="scheduleStartTime"
                value={times.start}
                onChange={(e) => setTimes((t) => ({ ...t, start: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-slate-600">Fin</span>
              <input
                type="time"
                name="scheduleEndTime"
                value={times.end}
                onChange={(e) => setTimes((t) => ({ ...t, end: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-slate-600">Depuis le</span>
              <input
                type="date"
                name="scheduleStartDate"
                defaultValue={toDateInputValue(new Date())}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-slate-600">Jusqu&apos;au (optionnel)</span>
              <input type="date" name="scheduleEndDate" className={INPUT_CLASS} />
            </label>
          </div>

          <p className="text-xs text-slate-400">
            Crée un événement qui se répète chaque semaine sur ces jours, pour toute la période.
            Modifiable ensuite depuis le Planning.
          </p>
        </>
      )}
    </fieldset>
  );
}
