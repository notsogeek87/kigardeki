import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { getTodayDashboard } from "@/lib/data/dashboard";
import { OccurrenceCard } from "@/components/occurrence-card";
import { formatDateLong } from "@/lib/wall-time";

export default async function TodayPage() {
  const user = await requireSession();
  const { children, caregivers, myUpcoming, todayByChild } = await getTodayDashboard();
  const isParent = user.role === "PARENT";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold capitalize text-slate-900">{formatDateLong(new Date())}</h1>
        {isParent && (
          <Link
            href="/events/new"
            className="tap-target rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Ajouter
          </Link>
        )}
      </div>

      {!isParent && myUpcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Mes prochaines gardes
          </h2>
          {myUpcoming.map((occ) => (
            <OccurrenceCard
              key={`${occ.id}-${occ.occurrenceDate}`}
              occurrence={occ}
              familyChildren={children}
              caregivers={caregivers}
              editable={false}
            />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {isParent ? "Aujourd'hui" : "Planning du jour"}
        </h2>

        {children.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
            Ajoutez votre premier enfant pour commencer.{" "}
            <Link href="/children/new" className="font-medium text-brand-600">
              Ajouter un enfant
            </Link>
          </p>
        )}

        {children.map((child) => {
          const occurrences = todayByChild.get(child.id) ?? [];
          return (
            <div key={child.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: child.color }} />
                <h3 className="font-semibold text-slate-900">{child.firstName}</h3>
              </div>
              {occurrences.length === 0 ? (
                <p className="pl-5 text-sm text-slate-400">Rien de prévu aujourd&apos;hui.</p>
              ) : (
                <div className="flex flex-col gap-2 pl-5">
                  {occurrences.map((occ, i) => (
                    <div key={`${occ.id}-${i}`}>
                      {i > 0 && <p className="pl-2 text-slate-300">↓</p>}
                      <OccurrenceCard
                        occurrence={occ}
                        familyChildren={children}
                        caregivers={caregivers}
                        editable={isParent}
                        showChildren={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
