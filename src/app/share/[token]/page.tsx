import Image from "next/image";
import Link from "next/link";
import { resolveShareToken } from "@/lib/data/shareLinks";
import { listChildrenForFamily } from "@/lib/data/children";
import { listCaregiversForFamily } from "@/lib/data/caregivers";
import { listEventOccurrencesForFamily, type EventOccurrenceDTO } from "@/lib/data/events";
import { OccurrenceCard } from "@/components/occurrence-card";
import {
  addUTCDays,
  formatDateLong,
  formatDateShort,
  startOfUTCMonth,
  startOfUTCWeek,
  toDateInputValue,
} from "@/lib/wall-time";

type View = "day" | "week" | "month";

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
        <Image src="/logo.png" alt="Kigardeki" width={64} height={64} />
        <h1 className="text-xl font-semibold">Lien invalide ou révoqué</h1>
        <p className="text-slate-500">Demandez à la famille de vous envoyer un nouveau lien de partage.</p>
      </main>
    );
  }

  const sp = await searchParams;
  const view: View = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const anchor = parseDate(sp.date);

  const [children, caregivers] = await Promise.all([
    listChildrenForFamily(share.familyId),
    listCaregiversForFamily(share.familyId),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
        <Image src="/logo.png" alt="Kigardeki" width={32} height={32} className="rounded-lg" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Lecture seule</p>
          <h1 className="text-lg font-bold text-slate-900">{share.familyName}</h1>
        </div>
      </header>

      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <Link
              key={v}
              href={`/share/${token}?view=${v}&date=${toDateInputValue(anchor)}`}
              className={`tap-target flex-1 rounded-lg text-center text-sm font-medium leading-[38px] ${
                view === v ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
            </Link>
          ))}
        </div>

        {children.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
            Aucun enfant enregistré pour le moment.
          </p>
        ) : view === "day" ? (
          <DayView token={token} anchor={anchor} familyId={share.familyId} children_={children} caregivers={caregivers} />
        ) : view === "week" ? (
          <WeekView token={token} anchor={anchor} familyId={share.familyId} children_={children} caregivers={caregivers} />
        ) : (
          <MonthView token={token} anchor={anchor} familyId={share.familyId} />
        )}
      </div>
    </div>
  );
}

function NavArrows({ token, view, prev, next, label }: { token: string; view: View; prev: Date; next: Date; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/share/${token}?view=${view}&date=${toDateInputValue(prev)}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Précédent"
      >
        ←
      </Link>
      <p className="font-medium capitalize text-slate-700">{label}</p>
      <Link
        href={`/share/${token}?view=${view}&date=${toDateInputValue(next)}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Suivant"
      >
        →
      </Link>
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
      <NavArrows
        token={token}
        view="day"
        prev={addUTCDays(dayStart, -1)}
        next={addUTCDays(dayStart, 1)}
        label={formatDateLong(dayStart)}
      />

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
  caregivers,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i));
  const occurrences = await listEventOccurrencesForFamily(familyId, weekStart, weekEnd);

  const byDay = new Map<string, EventOccurrenceDTO[]>();
  for (const occ of occurrences) {
    const key = occ.occurrenceDate;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(occ);
  }
  for (const dayOccurrences of byDay.values()) {
    dayOccurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  }

  const todayKey = toDateInputValue(new Date());

  return (
    <div className="flex flex-col gap-4">
      <NavArrows
        token={token}
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`${formatDateShort(weekStart)} — ${formatDateShort(addUTCDays(weekStart, 6))}`}
      />

      <div className="flex flex-col gap-4">
        {days.map((d) => {
          const key = toDateInputValue(d);
          const dayOccurrences = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <p className={`text-sm font-semibold capitalize ${isToday ? "text-brand-600" : "text-slate-700"}`}>
                  {formatDateLong(d)}
                </p>
                {isToday && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                    Aujourd&apos;hui
                  </span>
                )}
              </div>
              {dayOccurrences.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-400 shadow-sm">Rien de prévu.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayOccurrences.map((occ, i) => (
                    <OccurrenceCard
                      key={`${occ.id}-${i}`}
                      occurrence={occ}
                      familyChildren={children_}
                      caregivers={caregivers}
                      editable={false}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function MonthView({ token, anchor, familyId }: { token: string; anchor: Date; familyId: string }) {
  const monthStart = startOfUTCMonth(anchor);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const gridStart = startOfUTCWeek(monthStart);
  const gridEnd = addUTCDays(startOfUTCWeek(addUTCDays(nextMonthStart, 6)), 7);

  const occurrences = await listEventOccurrencesForFamily(familyId, gridStart, gridEnd);
  const countByDay = new Map<string, number>();
  for (const occ of occurrences) {
    countByDay.set(occ.occurrenceDate, (countByDay.get(occ.occurrenceDate) ?? 0) + 1);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d < gridEnd; d = addUTCDays(d, 1)) days.push(d);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    monthStart
  );

  return (
    <div className="flex flex-col gap-3">
      <NavArrows token={token} view="month" prev={addUTCDays(monthStart, -1)} next={nextMonthStart} label={monthLabel} />

      <div className="grid grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="pb-1 text-center text-xs font-semibold text-slate-400">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = toDateInputValue(d);
          const inMonth = d.getUTCMonth() === monthStart.getUTCMonth();
          const count = countByDay.get(key) ?? 0;
          return (
            <Link
              key={key}
              href={`/share/${token}?view=day&date=${key}`}
              className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 text-sm ${
                inMonth ? "text-slate-700" : "text-slate-300"
              }`}
            >
              {d.getUTCDate()}
              {count > 0 && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
