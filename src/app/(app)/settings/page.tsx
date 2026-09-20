import { requireSession } from "@/lib/permissions";
import { getMyFamily } from "@/lib/data/family";
import { InstallPwaHint } from "@/components/install-pwa-hint";
import { changePasswordAction, renameFamilyAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireSession();
  const family = await getMyFamily();
  const { error, success } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold text-slate-900">Réglages</h1>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">Modifications enregistrées.</p>}

      <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mon compte</h2>
        <p className="text-slate-900">{user.name}</p>
        <p className="text-sm text-slate-500">{user.email}</p>
        <p className="text-sm text-slate-500">{user.role === "PARENT" ? "Rôle : Parent" : "Rôle : Consultation uniquement"}</p>
      </section>

      {user.role === "PARENT" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Nom de la famille</h2>
          <form action={renameFamilyAction} className="flex gap-2">
            <input
              name="name"
              defaultValue={family.name}
              required
              className="tap-target flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button type="submit" className="tap-target rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
              OK
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mot de passe</h2>
        <form action={changePasswordAction} className="flex flex-col gap-3">
          <input
            type="password"
            name="currentPassword"
            placeholder="Mot de passe actuel"
            required
            autoComplete="current-password"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <input
            type="password"
            name="newPassword"
            placeholder="Nouveau mot de passe"
            required
            minLength={8}
            autoComplete="new-password"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            className="tap-target rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white active:bg-slate-800"
          >
            Changer le mot de passe
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Application</h2>
        <InstallPwaHint />
      </section>
    </div>
  );
}
