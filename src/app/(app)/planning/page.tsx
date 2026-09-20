import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { listEventOccurrences, type EventOccurrenceDTO } from "@/lib/data/events";
import { OccurrenceCard } from "@/components/occurrence-card";
import { EVENT_TYPE_ICON } from "@/lib/labels";
import {
  addUTCDays,
  formatDateLong,
  formatDateShort,
  formatTime,
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

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const user = await requireSession();
  const view: View = params.view === "day" || params.view === "month" ? params.view : "week";
  const anchor = parseDate(params.date);

  const [children, caregivers] = await Promise.all([listChildren(), listCaregivers()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Planning</h1>
        {user.role === "PARENT" && (
          <Link
            href="/events/new"
            className="tap-target rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Ajouter
          </Link>
        )}
      </div>

      <ViewSwitcher view={view} date={anchor} />

      {view === "week" && <WeekView anchor={anchor} children_={children} editable={user.role === "PARENT"} />}
      {view === "day" && <DayView anchor={anchor} children_={children} caregivers={caregivers} editable={user.role === "PARENT"} />}
      {view === "month" && <MonthView anchor={anchor} />}
    </div>
  );
}

function ViewSwitcher({ view, date }: { view: View; date: Date }) {
  const dateStr = toDateInputValue(date);
  const tabs: { key: View; label: string }[] = [
    { key: "day", label: "Jour" },
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
  ];
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/planning?view=${tab.key}&date=${dateStr}`}
          className={`tap-target flex-1 rounded-lg text-center text-sm font-medium leading-[38px] ${
            view === tab.key ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function NavArrows({ view, prev, next, label }: { view: View; prev: Date; next: Date; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/planning?view=${view}&date=${toDateInputValue(prev)}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Précédent"
      >
        ←
      </Link>
      <p className="font-medium capitalize text-slate-700">{label}</p>
      <Link
        href={`/planning?view=${view}&date=${toDateInputValue(next)}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Suivant"
      >
        →
      </Link>
    </div>
  );
}

async function WeekView({
  anchor,
  children_,
  editable,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  editable: boolean;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i));
  const occurrences = await listEventOccurrences(weekStart, weekEnd);

  const byChildAndDay = new Map<string, Map<string, EventOccurrenceDTO[]>>();
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
      <NavArrows
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`${formatDateShort(weekStart)} — ${formatDateShort(addUTCDays(weekStart, 6))}`}
      />

      {children_.length === 0 && <EmptyChildren />}

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
                          <Link
                            key={`${occ.id}-${i}`}
                            href={editable ? `/events/${occ.id}/edit` : "#"}
                            className="rounded-lg px-1.5 py-1 text-[11px] leading-tight text-white"
                            style={{ backgroundColor: child.color }}
                          >
                            <span>{EVENT_TYPE_ICON[occ.type]}</span> {formatTime(occ.occurrenceStartAt)}
                          </Link>
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

async function DayView({
  anchor,
  children_,
  caregivers,
  editable,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
}) {
  const dayStart = new Date(anchor);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = addUTCDays(dayStart, 1);
  const occurrences = await listEventOccurrences(dayStart, dayEnd);
  occurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        view="day"
        prev={addUTCDays(dayStart, -1)}
        next={addUTCDays(dayStart, 1)}
        label={formatDateLong(dayStart)}
      />

      {children_.length === 0 && <EmptyChildren />}

      {occurrences.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">Rien de prévu ce jour.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {occurrences.map((occ, i) => (
            <OccurrenceCard
              key={`${occ.id}-${i}`}
              occurrence={occ}
              familyChildren={children_}
              caregivers={caregivers}
              editable={editable}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function MonthView({ anchor }: { anchor: Date }) {
  const monthStart = startOfUTCMonth(anchor);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const gridStart = startOfUTCWeek(monthStart);
  const gridEnd = addUTCDays(startOfUTCWeek(addUTCDays(nextMonthStart, 6)), 7);

  const occurrences = await listEventOccurrences(gridStart, gridEnd);
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
      <NavArrows
        view="month"
        prev={addUTCDays(monthStart, -1)}
        next={nextMonthStart}
        label={monthLabel}
      />

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
              href={`/planning?view=day&date=${key}`}
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

function EmptyChildren() {
  return (
    <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
      Ajoutez votre premier enfant pour commencer.{" "}
      <Link href="/children/new" className="font-medium text-brand-600">
        Ajouter un enfant
      </Link>
    </p>
  );
}
