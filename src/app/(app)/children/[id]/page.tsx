import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/permissions";
import { getChild } from "@/lib/data/children";
import { ChildForm } from "@/components/child-form";
import { updateChildAction, deleteChildAction } from "../actions";

export default async function EditChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/children");
  const { id } = await params;
  const { error } = await searchParams;
  const child = await getChild(id);
  if (!child) notFound();

  const update = updateChildAction.bind(null, id);
  const remove = deleteChildAction.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Modifier {child.firstName}</h1>
      <ChildForm action={update} child={child} error={error} submitLabel="Enregistrer" />

      <form action={remove}>
        <button
          type="submit"
          className="tap-target w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 active:bg-red-50"
        >
          Supprimer cet enfant
        </button>
      </form>
    </div>
  );
}
