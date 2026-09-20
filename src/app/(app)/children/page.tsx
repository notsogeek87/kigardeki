import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";

export default async function ChildrenPage() {
  const user = await requireSession();
  const children = await listChildren();
  const isParent = user.role === "PARENT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Enfants</h1>
        {isParent && (
          <Link
            href="/children/new"
            className="tap-target rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Ajouter
          </Link>
        )}
      </div>

      {children.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">Aucun enfant pour le moment.</p>
      )}

      <div className="flex flex-col gap-2">
        {children.map((child) => (
          <Link
            key={child.id}
            href={isParent ? `/children/${child.id}` : "#"}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:opacity-70"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ backgroundColor: child.color }}
            >
              {child.firstName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {child.firstName} {child.lastName ?? ""}
              </p>
              {child.defaultLocation && <p className="truncate text-sm text-slate-500">{child.defaultLocation}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
