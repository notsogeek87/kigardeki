import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { listEventOccurrences, type EventOccurrenceDTO } from "@/lib/data/events";
import { OccurrenceCard } from "@/components/occurrence-card";
import { PlanningFilters } from "@/components/planning-filters";
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

function filterOccurrences(
  occurrences: EventOccurrenceDTO[],
  childId: string | undefined,
  caregiverId: string | undefined
): EventOccurrenceDTO[] {
  return occurrences.filter(
    (occ) =>
      (!childId || occ.childIds.includes(childId)) && (!caregiverId || occ.caregiverIds.includes(caregiverId))
  );
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; child?: string; caregiver?: string }>;
}) {
  const params = await searchParams;
  const user = await requireSession();
  const view: View = params.view === "day" || params.view === "month" ? params.view : "week";
  const anchor = parseDate(params.date);
  const childId = params.child || undefined;
  const caregiverId = params.caregiver || undefined;

  const [children, caregivers] = await Promise.all([listChildren(), listCaregivers()]);
  const isViewer = user.role !== "PARENT";

  const query = `${params.child ? `&child=${params.child}` : ""}${
    params.caregiver ? `&caregiver=${params.caregiver}` : ""
  }`;

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

      <ViewSwitcher view={view} date={anchor} query={query} />

      {isViewer && <PlanningFilters children_={children} caregivers={caregivers} />}

      {view === "week" && (
        <WeekView
          anchor={anchor}
          children_={children}
          caregivers={caregivers}
          editable={user.role === "PARENT"}
          childId={childId}
          caregiverId={caregiverId}
          query={query}
        />
      )}
      {view === "day" && (
        <DayView
          anchor={anchor}
          children_={children}
          caregivers={caregivers}
          editable={user.role === "PARENT"}
          childId={childId}
          caregiverId={caregiverId}
          query={query}
        />
      )}
      {view === "month" && (
        <MonthView anchor={anchor} childId={childId} caregiverId={caregiverId} caregivers={caregivers} />
      )}
    </div>
  );
}

function ViewSwitcher({ view, date, query }: { view: View; date: Date; query: string }) {
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
          href={`/planning?view=${tab.key}&date=${dateStr}${query}`}
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

function NavArrows({
  view,
  prev,
  next,
  label,
  query,
}: {
  view: View;
  prev: Date;
  next: Date;
  label: string;
  query: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/planning?view=${view}&date=${toDateInputValue(prev)}${query}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Précédent"
      >
        ←
      </Link>
      <p className="font-medium capitalize text-slate-700">{label}</p>
      <Link
        href={`/planning?view=${view}&date=${toDateInputValue(next)}${query}`}
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
  caregivers,
  editable,
  childId,
  caregiverId,
  query,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
  childId: string | undefined;
  caregiverId: string | undefined;
  query: string;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i));
  const occurrences = filterOccurrences(await listEventOccurrences(weekStart, weekEnd), childId, caregiverId);

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
  const visibleDays = caregiverId ? days.filter((d) => (byDay.get(toDateInputValue(d))?.length ?? 0) > 0) : days;

  return (
    <div className="flex flex-col gap-4">
      <NavArrows
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`${formatDateShort(weekStart)} — ${formatDateShort(addUTCDays(weekStart, 6))}`}
        query={query}
      />

      {children_.length === 0 && <EmptyChildren />}

      {caregiverId && visibleDays.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">
          Cette personne ne garde pas d&apos;enfant cette semaine.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleDays.map((d) => {
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
                        editable={editable}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function DayView({
  anchor,
  children_,
  caregivers,
  editable,
  childId,
  caregiverId,
  query,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
  childId: string | undefined;
  caregiverId: string | undefined;
  query: string;
}) {
  const dayStart = new Date(anchor);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = addUTCDays(dayStart, 1);
  const occurrences = filterOccurrences(await listEventOccurrences(dayStart, dayEnd), childId, caregiverId);
  occurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        view="day"
        prev={addUTCDays(dayStart, -1)}
        next={addUTCDays(dayStart, 1)}
        label={formatDateLong(dayStart)}
        query={query}
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

async function MonthView({
  anchor,
  childId,
  caregiverId,
  caregivers,
}: {
  anchor: Date;
  childId: string | undefined;
  caregiverId: string | undefined;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
}) {
  const monthStart = startOfUTCMonth(anchor);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const gridStart = startOfUTCWeek(monthStart);
  const gridEnd = addUTCDays(startOfUTCWeek(addUTCDays(nextMonthStart, 6)), 7);

  const occurrences = filterOccurrences(await listEventOccurrences(gridStart, gridEnd), childId, caregiverId);
  const countByDay = new Map<string, number>();
  const colorsByDay = new Map<string, string[]>();
  for (const occ of occurrences) {
    countByDay.set(occ.occurrenceDate, (countByDay.get(occ.occurrenceDate) ?? 0) + 1);
    const dayColors = colorsByDay.get(occ.occurrenceDate) ?? [];
    for (const caregiverIdForOcc of occ.caregiverIds) {
      const color = caregivers.find((c) => c.id === caregiverIdForOcc)?.color;
      if (color && !dayColors.includes(color)) dayColors.push(color);
    }
    colorsByDay.set(occ.occurrenceDate, dayColors);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d < gridEnd; d = addUTCDays(d, 1)) days.push(d);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    monthStart
  );

  const query = `${childId ? `&child=${childId}` : ""}${caregiverId ? `&caregiver=${caregiverId}` : ""}`;

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        view="month"
        prev={addUTCDays(monthStart, -1)}
        next={nextMonthStart}
        label={monthLabel}
        query={query}
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
          const dayColors = colorsByDay.get(key) ?? [];
          return (
            <Link
              key={key}
              href={`/planning?view=day&date=${key}${query}`}
              className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 text-sm ${
                inMonth ? "text-slate-700" : "text-slate-300"
              }`}
            >
              {d.getUTCDate()}
              {count > 0 && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {dayColors.length > 0 ? (
                    dayColors
                      .slice(0, 3)
                      .map((color, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                      ))
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                  )}
                </span>
              )}
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
