import Image from "next/image";
import Link from "next/link";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/today";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <Image src="/logo.png" alt="Kigardeki" width={80} height={80} className="mx-auto" priority />
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Kigardeki</h1>
        <p className="mt-1 text-slate-500">Le planning familial des enfants</p>
      </div>

      <form action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {params.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            Email ou mot de passe incorrect.
          </p>
        )}

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
            autoComplete="current-password"
            className="tap-target rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <button
          type="submit"
          className="tap-target mt-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white active:bg-brand-700"
        >
          Se connecter
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Pas encore de famille ?{" "}
        <Link href="/register" className="font-medium text-brand-600">
          Créer ma famille
        </Link>
      </p>
    </main>
  );
}
