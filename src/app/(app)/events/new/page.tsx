import { requireParentPage } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { EventForm } from "@/components/event-form";
import { toDateInputValue } from "@/lib/wall-time";
import { createEventAction } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; date?: string }>;
}) {
  await requireParentPage("/planning");
  const { error, date } = await searchParams;
  const [familyChildren, caregivers] = await Promise.all([listChildren(), listCaregivers()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Ajouter un événement</h1>
      {familyChildren.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
          Ajoutez d&apos;abord un enfant avant de créer un événement.
        </p>
      ) : (
        <EventForm
          action={createEventAction}
          familyChildren={familyChildren}
          caregivers={caregivers}
          error={error}
          submitLabel="Enregistrer"
          defaultDate={date ?? toDateInputValue(new Date())}
        />
      )}
    </div>
  );
}
