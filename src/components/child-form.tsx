import { ColorPickerField } from "@/components/color-picker";
import { SubmitButton } from "@/components/submit-button";
import type { ChildDTO } from "@/lib/data/dto";

export function ChildForm({
  action,
  child,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  child?: ChildDTO;
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
          defaultValue={child?.firstName}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Nom (optionnel)</span>
        <input
          name="lastName"
          defaultValue={child?.lastName ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Date de naissance (optionnel)</span>
        <input
          type="date"
          name="birthDate"
          defaultValue={child?.birthDate ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <ColorPickerField defaultValue={child?.color} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Lieu habituel (optionnel)</span>
        <input
          name="defaultLocation"
          placeholder="École, crèche, nounou..."
          defaultValue={child?.defaultLocation ?? ""}
          className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Notes (optionnel)</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={child?.notes ?? ""}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <SubmitButton className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
