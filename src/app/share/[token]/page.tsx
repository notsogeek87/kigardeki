import Link from "next/link";
import { resolveShareToken } from "@/lib/data/shareLinks";
import { listChildrenForFamily } from "@/lib/data/children";
import { listCaregiversForFamily } from "@/lib/data/caregivers";
import { listEventOccurrencesForFamily } from "@/lib/data/events";
import { OccurrenceCard } from "@/components/occurrence-card";
import { formatSlotOrTimeShort } from "@/lib/time-slots";
import {
  addUTCDays,
  formatDateLong,
  formatDateShort,
  startOfUTCWeek,
  toDateInputValue,
} from "@/lib/wall-time";

function parseDate(value: string | undefined): Date {
  if (!value) return new Date();
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default async function SharedPlanningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { token } = await params;
  const share = await resolveShareToken(token);

  if (!share) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-semibold">Lien invalide ou révoqué</h1>
        <p className="text-slate-500">Demandez à la famille de vous envoyer un nouveau lien de partage.</p>
      </main>
    );
  }

  const sp = await searchParams;
  const view = sp.view === "day" ? "day" : "week";
  const anchor = parseDate(sp.date);

  const [children, caregivers] = await Promise.all([
    listChildrenForFamily(share.familyId),
    listCaregiversForFamily(share.familyId),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Lecture seule</p>
        <h1 className="text-lg font-bold text-slate-900">{share.familyName}</h1>
      </header>

      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["day", "week"] as const).map((v) => (
            <Link
              key={v}
              href={`/share/${token}?view=${v}&date=${toDateInputValue(anchor)}`}
              className={`tap-target flex-1 rounded-lg text-center text-sm font-medium leading-[38px] ${
                view === v ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "day" ? "Jour" : "Semaine"}
            </Link>
          ))}
        </div>

        {children.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
            Aucun enfant enregistré pour le moment.
          </p>
        ) : view === "day" ? (
          <DayView token={token} anchor={anchor} familyId={share.familyId} children_={children} caregivers={caregivers} />
        ) : (
          <WeekView token={token} anchor={anchor} familyId={share.familyId} children_={children} />
        )}
      </div>
    </div>
  );
}

async function DayView({
  token,
  anchor,
  familyId,
  children_,
  caregivers,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
}) {
  const dayStart = new Date(anchor);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = addUTCDays(dayStart, 1);
  const occurrences = await listEventOccurrencesForFamily(familyId, dayStart, dayEnd);
  occurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/share/${token}?view=day&date=${toDateInputValue(addUTCDays(dayStart, -1))}`}
          className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        >
          ←
        </Link>
        <p className="font-medium capitalize text-slate-700">{formatDateLong(dayStart)}</p>
        <Link
          href={`/share/${token}?view=day&date=${toDateInputValue(addUTCDays(dayStart, 1))}`}
          className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        >
          →
        </Link>
      </div>

      {occurrences.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">Rien de prévu ce jour.</p>
      ) : (
        occurrences.map((occ, i) => (
          <OccurrenceCard key={`${occ.id}-${i}`} occurrence={occ} familyChildren={children_} caregivers={caregivers} editable={false} />
        ))
      )}
    </div>
  );
}

async function WeekView({
  token,
  anchor,
  familyId,
  children_,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i));
  const occurrences = await listEventOccurrencesForFamily(familyId, weekStart, weekEnd);

  const byChildAndDay = new Map<string, Map<string, typeof occurrences>>();
  for (const child of children_) byChildAndDay.set(child.id, new Map());
  for (const occ of occurrences) {
    for (const childId of occ.childIds) {
      const dayMap = byChildAndDay.get(childId);
      if (!dayMap) continue;
      const key = occ.occurrenceDate;
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(occ);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/share/${token}?view=week&date=${toDateInputValue(addUTCDays(weekStart, -7))}`}
          className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        >
          ←
        </Link>
        <p className="font-medium text-slate-700">
          {formatDateShort(weekStart)} — {formatDateShort(addUTCDays(weekStart, 6))}
        </p>
        <Link
          href={`/share/${token}?view=week&date=${toDateInputValue(addUTCDays(weekStart, 7))}`}
          className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        >
          →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[88px] bg-white p-2 text-left text-xs font-semibold text-slate-400">
                &nbsp;
              </th>
              {days.map((d) => (
                <th key={toDateInputValue(d)} className="min-w-[100px] p-2 text-center text-xs font-semibold text-slate-500">
                  {formatDateShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children_.map((child) => (
              <tr key={child.id} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 bg-white p-2 align-top">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: child.color }} />
                    {child.firstName}
                  </span>
                </td>
                {days.map((d) => {
                  const key = toDateInputValue(d);
                  const dayOccurrences = (byChildAndDay.get(child.id)?.get(key) ?? []).sort(
                    (a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime()
                  );
                  return (
                    <td key={key} className="p-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        {dayOccurrences.map((occ, i) => (
                          <span
                            key={`${occ.id}-${i}`}
                            className="rounded-lg px-1.5 py-1 text-[11px] leading-tight text-white"
                            style={{ backgroundColor: child.color }}
                          >
                            {formatSlotOrTimeShort(occ.occurrenceStartAt, occ.occurrenceEndAt)}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
