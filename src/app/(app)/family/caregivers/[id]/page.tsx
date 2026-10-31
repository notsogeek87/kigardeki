import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/permissions";
import { getCaregiver } from "@/lib/data/caregivers";
import { listCaregiverAbsences } from "@/lib/data/absences";
import { CaregiverForm } from "@/components/caregiver-form";
import { SubmitButton } from "@/components/submit-button";
import { formatDateLong, toDateInputValue } from "@/lib/wall-time";
import type { AbsenceDTO } from "@/lib/absences";
import { updateCaregiverAction, deleteCaregiverAction } from "../../actions";
import { createAbsenceAction, deleteAbsenceAction } from "../../absences-actions";

export default async function EditCaregiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/family");
  const { id } = await params;
  const { error } = await searchParams;
  const caregiver = await getCaregiver(id);
  if (!caregiver) notFound();

  const update = updateCaregiverAction.bind(null, id);
  const remove = deleteCaregiverAction.bind(null, id);
  const absences = caregiver.tracksAbsences ? await listCaregiverAbsences(id) : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Modifier {caregiver.firstName}</h1>
      <CaregiverForm action={update} caregiver={caregiver} error={error} submitLabel="Enregistrer" />

      {caregiver.tracksAbsences && (
        <AbsencesSection caregiverId={id} firstName={caregiver.firstName} absences={absences} />
      )}

      {!caregiver.userId && (
        <form action={remove}>
          <SubmitButton className="tap-target w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 active:bg-red-50">
            Supprimer cette personne
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

const inputClass =
  "tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

function periodLabel(absence: AbsenceDTO): string {
  const start = formatDateLong(new Date(`${absence.startDate}T00:00:00.000Z`));
  if (absence.startDate === absence.endDate) return start.charAt(0).toUpperCase() + start.slice(1);
  return `Du ${start} au ${formatDateLong(new Date(`${absence.endDate}T00:00:00.000Z`))}`;
}

function AbsencesSection({
  caregiverId,
  firstName,
  absences,
}: {
  caregiverId: string;
  firstName: string;
  absences: AbsenceDTO[];
}) {
  const create = createAbsenceAction.bind(null, caregiverId);
  const today = toDateInputValue(new Date());
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Absences de {firstName}</h2>

      {absences.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune absence enregistrée.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {absences.map((absence) => (
            <li key={absence.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className={`flex-1 text-sm text-slate-700 ${absence.endDate < today ? "opacity-50" : ""}`}>
                {periodLabel(absence)}
                {absence.endDate < today && " (passée)"}
              </span>
              <form action={deleteAbsenceAction.bind(null, caregiverId, absence.id)}>
                <button
                  type="submit"
                  className="tap-target rounded-full px-3 text-xl leading-none text-slate-500 active:bg-slate-200"
                  aria-label={`Retirer l'absence : ${periodLabel(absence)}`}
                  title="Retirer"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={create} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Du</span>
            <input type="date" name="startDate" required defaultValue={today} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Au (inclus)</span>
            <input type="date" name="endDate" className={inputClass} />
          </label>
        </div>
        <SubmitButton className="tap-target rounded-xl border border-brand-600 px-4 py-3 text-sm font-semibold text-brand-600 active:bg-brand-50">
          Ajouter une absence
        </SubmitButton>
      </form>
    </section>
  );
}
