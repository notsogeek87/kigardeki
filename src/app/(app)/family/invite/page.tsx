import { requireParentPage } from "@/lib/permissions";
import { RELATION_LABEL } from "@/lib/labels";
import type { CaregiverRelation } from "@prisma/client";
import { inviteAction } from "../actions";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireParentPage("/family");
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Inviter quelqu&apos;un</h1>
      <p className="text-sm text-slate-500">
        Un lien d&apos;invitation valable 7 jours sera généré. La personne créera son propre compte et
        rejoindra automatiquement votre famille.
      </p>

      <form action={inviteAction} className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            required
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Rôle</span>
          <select
            name="role"
            required
            defaultValue="VIEWER"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="VIEWER">Consultation uniquement (grand-parent, etc.)</option>
            <option value="PARENT">Parent (mêmes droits)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Relation</span>
          <select
            name="relation"
            required
            defaultValue="GRANDMOTHER"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {(Object.keys(RELATION_LABEL) as CaregiverRelation[]).map((key) => (
              <option key={key} value={key}>
                {RELATION_LABEL[key]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700"
        >
          Envoyer l&apos;invitation
        </button>
      </form>
    </div>
  );
}
