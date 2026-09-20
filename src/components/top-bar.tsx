import { logoutAction } from "@/app/(app)/logout-action";

export function TopBar({ familyName, role }: { familyName: string; role: "PARENT" | "VIEWER" }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-slate-900">{familyName}</p>
        <p className="text-xs text-slate-500">{role === "PARENT" ? "Parent" : "Consultation seule"}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="tap-target rounded-lg px-3 py-2 text-sm font-medium text-slate-500">
          Déconnexion
        </button>
      </form>
    </header>
  );
}
