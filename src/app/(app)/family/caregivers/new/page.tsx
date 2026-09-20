import { requireParentPage } from "@/lib/permissions";
import { CaregiverForm } from "@/components/caregiver-form";
import { createCaregiverAction } from "../../actions";

export default async function NewCaregiverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/family");
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Ajouter une personne</h1>
      <CaregiverForm action={createCaregiverAction} error={error} submitLabel="Ajouter" />
    </div>
  );
}
