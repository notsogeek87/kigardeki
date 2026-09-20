import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/permissions";
import { getCaregiver } from "@/lib/data/caregivers";
import { CaregiverForm } from "@/components/caregiver-form";
import { updateCaregiverAction, deleteCaregiverAction } from "../../actions";

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Modifier {caregiver.firstName}</h1>
      <CaregiverForm action={update} caregiver={caregiver} error={error} submitLabel="Enregistrer" />

      {!caregiver.userId && (
        <form action={remove}>
          <button
            type="submit"
            className="tap-target w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 active:bg-red-50"
          >
            Supprimer cette personne
          </button>
        </form>
      )}
    </div>
  );
}
