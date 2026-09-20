export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl">📡</p>
      <h1 className="text-xl font-semibold">Pas de connexion</h1>
      <p className="max-w-sm text-slate-600">
        Impossible de charger cette page. Vérifiez votre connexion et réessayez — les pages déjà
        consultées restent disponibles.
      </p>
    </main>
  );
}
