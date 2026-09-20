import { requireParentPage } from "@/lib/permissions";
import { ChildForm } from "@/components/child-form";
import { createChildAction } from "../actions";

export default async function NewChildPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/children");
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Ajouter un enfant</h1>
      <ChildForm action={createChildAction} error={error} submitLabel="Ajouter" />
    </div>
  );
}
