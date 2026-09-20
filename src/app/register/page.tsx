import Image from "next/image";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { registerAction } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <Image src="/logo.png" alt="Kigardeki" width={80} height={80} className="mx-auto" />
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Créer ma famille</h1>
        <p className="mt-1 text-slate-500">Vous serez le premier parent de la famille.</p>
      </div>

      <form action={registerAction} className="flex flex-col gap-4">
        {params.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{params.error}</p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Nom de la famille</span>
          <input
            name="familyName"
            required
            placeholder="Famille Dupont"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Votre prénom</span>
          <input
            name="parentName"
            required
            placeholder="Julie"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Vous êtes</span>
          <select
            name="parentRelation"
            required
            defaultValue="MOTHER"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="MOTHER">Maman</option>
            <option value="FATHER">Papa</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <SubmitButton className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700">
          Créer ma famille
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-slate-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
