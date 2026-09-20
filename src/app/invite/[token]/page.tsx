import Image from "next/image";
import { getInvitationPreview } from "@/lib/data/invitations";
import { acceptInvitationAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  PARENT: "Parent",
  VIEWER: "Consultation uniquement",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invitation = await getInvitationPreview(token);

  if (!invitation || !invitation.valid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <Image src="/logo.png" alt="Kigardeki" width={64} height={64} />
        <h1 className="text-xl font-semibold">Invitation invalide ou expirée</h1>
        <p className="text-slate-500">Demandez à un parent de vous envoyer une nouvelle invitation.</p>
      </main>
    );
  }

  const action = acceptInvitationAction.bind(null, token);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <Image src="/logo.png" alt="Kigardeki" width={80} height={80} className="mx-auto" />
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Rejoindre {invitation.familyName}</h1>
        <p className="mt-1 text-slate-500">
          Rôle : <span className="font-medium">{ROLE_LABEL[invitation.role]}</span>
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">{invitation.email}</p>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Votre prénom</span>
          <input
            name="name"
            required
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Choisir un mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <button
          type="submit"
          className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700"
        >
          Rejoindre la famille
        </button>
      </form>
    </main>
  );
}
