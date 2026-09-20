import type { CaregiverDTO, ChildDTO, EventDTO } from "@/lib/data/dto";
import { EVENT_TYPE_ICON, EVENT_TYPE_LABEL } from "@/lib/labels";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { toDateInputValue, toTimeInputValue } from "@/lib/wall-time";
import type { EventType } from "@prisma/client";

const EVENT_TYPES: EventType[] = ["SCHOOL", "DAYCARE", "CAREGIVING", "PARENT", "OTHER"];

export function EventForm({
  action,
  familyChildren,
  caregivers,
  event,
  error,
  submitLabel,
  defaultDate,
}: {
  action: (formData: FormData) => Promise<void>;
  familyChildren: ChildDTO[];
  caregivers: CaregiverDTO[];
  event?: EventDTO;
  error?: string;
  submitLabel: string;
  defaultDate?: string;
}) {
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
              <input
                type="checkbox"
                name="childIds"
                value={child.id}
                defaultChecked={event?.childIds.includes(child.id)}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: child.color }} />
              {child.firstName}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Type</span>
        <select
          name="type"
          required
          defaultValue={event?.type ?? "CAREGIVING"}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_ICON[t]} {EVENT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate-700">Responsable(s)</legend>
        <div className="flex flex-col gap-2">
          {caregivers.map((c) => (
            <label
              key={c.id}
              className="tap-target flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="checkbox"
                name="caregiverIds"
                value={c.id}
                defaultChecked={event?.caregiverIds.includes(c.id)}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.firstName}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Date</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={event ? toDateInputValue(event.startAt) : defaultDate}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Début</span>
          <input
            type="time"
            name="startTime"
            required
            defaultValue={event ? toTimeInputValue(event.startAt) : "16:30"}
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Fin</span>
          <input
            type="time"
            name="endTime"
            required
            defaultValue={event ? toTimeInputValue(event.endAt) : "19:30"}
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Lieu (optionnel)</span>
        <input
          name="location"
          defaultValue={event?.location ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Note (optionnel)</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={event?.notes ?? ""}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <RecurrenceFields
        defaultRecurring={Boolean(event?.recurrenceFrequency)}
        defaultDays={event?.recurrenceDaysOfWeek ?? []}
        defaultEndDate={event?.recurrenceEndDate ? toDateInputValue(event.recurrenceEndDate) : ""}
      />

      <button
        type="submit"
        className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
