import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/permissions";
import { getEvent } from "@/lib/data/events";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { EventForm } from "@/components/event-form";
import { updateEventAction, deleteEventAction } from "../../actions";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/planning");
  const { id } = await params;
  const { error } = await searchParams;

  const [event, familyChildren, caregivers] = await Promise.all([getEvent(id), listChildren(), listCaregivers()]);
  if (!event) notFound();

  const update = updateEventAction.bind(null, id);
  const remove = deleteEventAction.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Modifier l&apos;événement</h1>
      <EventForm
        action={update}
        familyChildren={familyChildren}
        caregivers={caregivers}
        event={event}
        error={error}
        submitLabel="Enregistrer"
      />

      <form action={remove}>
        <button
          type="submit"
          className="tap-target w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 active:bg-red-50"
        >
          Supprimer cet événement
        </button>
      </form>
    </div>
  );
}
