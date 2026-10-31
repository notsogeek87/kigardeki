import { ColorPickerField } from "@/components/color-picker";
import { SubmitButton } from "@/components/submit-button";
import { RELATION_LABEL } from "@/lib/labels";
import type { CaregiverDTO } from "@/lib/data/dto";
import type { CaregiverRelation } from "@prisma/client";

export function CaregiverForm({
  action,
  caregiver,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  caregiver?: CaregiverDTO;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Prénom</span>
        <input
          name="firstName"
          required
          defaultValue={caregiver?.firstName}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Nom (optionnel)</span>
        <input
          name="lastName"
          defaultValue={caregiver?.lastName ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Relation</span>
        <select
          name="relation"
          required
          defaultValue={caregiver?.relation ?? "GRANDMOTHER"}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {(Object.keys(RELATION_LABEL) as CaregiverRelation[]).map((key) => (
            <option key={key} value={key}>
              {RELATION_LABEL[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Téléphone (optionnel)</span>
        <input
          type="tel"
          name="phone"
          defaultValue={caregiver?.phone ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <ColorPickerField defaultValue={caregiver?.color} />

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <input
          type="checkbox"
          name="tracksAbsences"
          defaultChecked={caregiver?.tracksAbsences ?? false}
          className="mt-1 h-5 w-5 accent-brand-600"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-700">Suivre ses absences</span>
          <span className="text-xs text-slate-500">
            Permet de saisir ses périodes d&apos;absence, affichées en gris hachuré sur le calendrier du mois.
          </span>
        </span>
      </label>

      <SubmitButton className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
