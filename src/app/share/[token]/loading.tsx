import Image from "next/image";

/** Shown instantly after any tap on the share page, while the server prepares the next view. */
export default function Loading() {
  return (
    <div
      className="share-root flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
      role="status"
    >
      <Image src="/logo.png" alt="" width={56} height={56} className="rounded-lg" />
      <svg className="h-10 w-10 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p className="text-lg font-semibold text-slate-700">Chargement du planning…</p>
    </div>
  );
}
