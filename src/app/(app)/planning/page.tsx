import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { listEventOccurrences, type EventOccurrenceDTO } from "@/lib/data/events";
import { listCareNeeds, type CareNeedDTO } from "@/lib/data/care-needs";
import { deleteCareNeedAction } from "../events/care-needs-actions";
import { timeToSlots, type TimeSlot } from "@/lib/time-slots";
import { OccurrenceCard } from "@/components/occurrence-card";
import { PlanningFilters } from "@/components/planning-filters";
import {
  addUTCDays,
  formatDateLong,
  formatDateShort,
  startOfUTCDay,
  startOfUTCMonth,
  startOfUTCWeek,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/wall-time";

type View = "day" | "week" | "month" | "needs";

const RAINBOW =
  "linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)";

type NeedDay = { childIds: string[]; uncovered: boolean };

/**
 * Groups care needs by day. A need is "uncovered" (shown as a rainbow) while
 * nothing is planned that day for the child it concerns.
 */
function groupNeeds(needs: CareNeedDTO[], occurrences: EventOccurrenceDTO[]): Map<string, NeedDay> {
  const result = new Map<string, NeedDay>();
  for (const need of needs) {
    const covered = occurrences.some((o) => o.occurrenceDate === need.date && o.childIds.includes(need.childId));
    const day = result.get(need.date) ?? { childIds: [], uncovered: false };
    day.childIds.push(need.childId);
    day.uncovered ||= !covered;
    result.set(need.date, day);
  }
  return result;
}

function RainbowBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${className}`}
      style={{ background: RAINBOW }}
    >
      {label}
    </span>
  );
}

function needLabel(childIds: string[], children_: { id: string; firstName: string }[]): string {
  const names = childIds.map((id) => children_.find((c) => c.id === id)?.firstName).filter(Boolean);
  return `Garde nécessaire${names.length > 0 ? ` · ${names.join(", ")}` : ""}`;
}

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
  searchParams: Promise<{ view?: string; date?: string; child?: string; caregiver?: string; needs?: string }>;
}) {
  const params = await searchParams;
  const user = await requireSession();
  const view: View =
    params.view === "day" || params.view === "month" || params.view === "needs" ? params.view : "week";
  const anchor = parseDate(params.date);
  const childId = params.child || undefined;
  const caregiverId = params.caregiver || undefined;
  const needsOnly = params.needs === "1";

  const [children, caregivers] = await Promise.all([listChildren(), listCaregivers()]);

  const query = `${params.child ? `&child=${params.child}` : ""}${
    params.caregiver ? `&caregiver=${params.caregiver}` : ""
  }${needsOnly ? "&needs=1" : ""}`;

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

      {(children.length > 0 || caregivers.length > 0) && (
        <PlanningFilters children_={children} caregivers={caregivers} />
      )}

      {caregiverId ? (
        <CaregiverAgenda
          childId={childId}
          caregiverId={caregiverId}
          children_={children}
          caregivers={caregivers}
          editable={user.role === "PARENT"}
        />
      ) : (
        <>
          <ViewSwitcher view={view} date={anchor} query={query} />

          {view === "needs" && (
            <NeedsList
              children_={children}
              childId={childId}
              editable={user.role === "PARENT"}
              query={query}
            />
          )}
          {view === "week" && (
            <WeekView
              anchor={anchor}
              children_={children}
              caregivers={caregivers}
              editable={user.role === "PARENT"}
              childId={childId}
              needsOnly={needsOnly}
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
              needsOnly={needsOnly}
              query={query}
            />
          )}
          {view === "month" && (
            <MonthView anchor={anchor} childId={childId} caregivers={caregivers} children_={children} needsOnly={needsOnly} />
          )}
        </>
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
    { key: "needs", label: "À garder" },
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
  needsOnly,
  query,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
  childId: string | undefined;
  needsOnly: boolean;
  query: string;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrences(weekStart, weekEnd),
    listCareNeeds(weekStart, weekEnd),
  ]);
  const occurrences = filterOccurrences(rawOccurrences, childId, undefined);
  const needsByDay = groupNeeds(rawNeeds.filter((n) => !childId || n.childId === childId), occurrences);
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i)).filter(
    (d) => !needsOnly || needsByDay.has(toDateInputValue(d))
  );

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
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`${formatDateShort(weekStart)} — ${formatDateShort(addUTCDays(weekStart, 6))}`}
        query={query}
      />

      {children_.length === 0 && <EmptyChildren />}

      {needsOnly && days.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">
          Aucune garde à trouver cette semaine.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {days.map((d) => {
          const key = toDateInputValue(d);
          const dayOccurrences = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const need = needsByDay.get(key);
          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 px-1">
                <p className={`text-sm font-semibold capitalize ${isToday ? "text-brand-600" : "text-slate-700"}`}>
                  {formatDateLong(d)}
                </p>
                {isToday && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                    Aujourd&apos;hui
                  </span>
                )}
                {need && (
                  <RainbowBadge
                    label={needLabel(need.childIds, children_)}
                    className={need.uncovered ? "" : "opacity-50"}
                  />
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
    </div>
  );
}

async function CaregiverAgenda({
  childId,
  caregiverId,
  children_,
  caregivers,
  editable,
}: {
  childId: string | undefined;
  caregiverId: string;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
}) {
  const todayStart = startOfUTCDay(new Date());
  const rangeEnd = addUTCDays(todayStart, 90);
  const occurrences = filterOccurrences(await listEventOccurrences(todayStart, rangeEnd), childId, caregiverId);

  const byDay = new Map<string, EventOccurrenceDTO[]>();
  for (const occ of occurrences) {
    const key = occ.occurrenceDate;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(occ);
  }
  const sortedDays = Array.from(byDay.keys()).sort();
  for (const dayOccurrences of byDay.values()) {
    dayOccurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  }
  const todayKey = toDateInputValue(todayStart);

  if (sortedDays.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">
        Aucune garde prévue prochainement pour cette personne.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sortedDays.map((key) => {
        const d = new Date(`${key}T00:00:00.000Z`);
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
            <div className="flex flex-col gap-2">
              {byDay.get(key)!.map((occ, i) => (
                <OccurrenceCard
                  key={`${occ.id}-${i}`}
                  occurrence={occ}
                  familyChildren={children_}
                  caregivers={caregivers}
                  editable={editable}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function DayView({
  anchor,
  children_,
  caregivers,
  editable,
  childId,
  needsOnly,
  query,
}: {
  anchor: Date;
  children_: Awaited<ReturnType<typeof listChildren>>;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  editable: boolean;
  childId: string | undefined;
  needsOnly: boolean;
  query: string;
}) {
  const dayStart = new Date(anchor);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = addUTCDays(dayStart, 1);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrences(dayStart, dayEnd),
    listCareNeeds(dayStart, dayEnd),
  ]);
  const occurrences = filterOccurrences(rawOccurrences, childId, undefined);
  occurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  const need = groupNeeds(rawNeeds.filter((n) => !childId || n.childId === childId), occurrences).get(
    toDateInputValue(dayStart)
  );

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

      {need && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-semibold text-white ${need.uncovered ? "" : "opacity-60"}`}
          style={{ background: RAINBOW }}
        >
          {needLabel(need.childIds, children_)}
        </p>
      )}

      {needsOnly && !need ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">
          Aucune garde à trouver ce jour.
        </p>
      ) : occurrences.length === 0 ? (
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
  caregivers,
  children_,
  needsOnly,
}: {
  anchor: Date;
  childId: string | undefined;
  caregivers: Awaited<ReturnType<typeof listCaregivers>>;
  children_: Awaited<ReturnType<typeof listChildren>>;
  needsOnly: boolean;
}) {
  const monthStart = startOfUTCMonth(anchor);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    monthStart
  );
  const query = `${childId ? `&child=${childId}` : ""}${needsOnly ? "&needs=1" : ""}`;

  const gridStart = startOfUTCWeek(monthStart);
  const gridEnd = addUTCDays(startOfUTCWeek(addUTCDays(nextMonthStart, 6)), 7);

  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrences(gridStart, gridEnd),
    listCareNeeds(gridStart, gridEnd),
  ]);
  const occurrences = filterOccurrences(rawOccurrences, childId, undefined);
  const needsByDay = groupNeeds(rawNeeds.filter((n) => !childId || n.childId === childId), occurrences);
  const FALLBACK_COLOR = "#6366f1";
  // Per day: which half-days each caregiver colour covers.
  const dotsByDay = new Map<string, Map<string, Set<TimeSlot>>>();
  for (const occ of occurrences) {
    const slots = timeToSlots(toTimeInputValue(occ.occurrenceStartAt), toTimeInputValue(occ.occurrenceEndAt));
    const dayDots = dotsByDay.get(occ.occurrenceDate) ?? new Map<string, Set<TimeSlot>>();
    const colors = occ.caregiverIds
      .map((id) => caregivers.find((c) => c.id === id)?.color)
      .filter((c): c is string => !!c);
    for (const color of colors.length > 0 ? colors : [FALLBACK_COLOR]) {
      const covered = dayDots.get(color) ?? new Set<TimeSlot>();
      for (const slot of slots) covered.add(slot);
      dayDots.set(color, covered);
    }
    dotsByDay.set(occ.occurrenceDate, dayDots);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d < gridEnd; d = addUTCDays(d, 1)) days.push(d);

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        view="month"
        prev={addUTCDays(monthStart, -1)}
        next={nextMonthStart}
        label={monthLabel}
        query={query}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid flex-1 grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} className="pb-1 text-center text-xs font-semibold text-slate-400">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const key = toDateInputValue(d);
            const inMonth = d.getUTCMonth() === monthStart.getUTCMonth();
            const dayDots = Array.from(dotsByDay.get(key) ?? []);
            const need = needsByDay.get(key);
            const rainbow = need?.uncovered ?? false;
            const dimmed = needsOnly && !need;
            return (
              <Link
                key={key}
                href={`/planning?view=day&date=${key}${query}`}
                className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 text-sm ${
                  rainbow ? "font-bold text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                } ${dimmed ? "opacity-30" : ""}`}
                style={rainbow ? { background: RAINBOW } : undefined}
                title={need ? needLabel(need.childIds, children_) : undefined}
              >
                {d.getUTCDate()}
                {dayDots.length > 0 && (
                  <span className="mt-0.5 flex items-center gap-0.5">
                    {dayDots.slice(0, 3).map(([color, covered]) => (
                      <HalfDayDot key={color} color={color} morning={covered.has("MORNING")} afternoon={covered.has("AFTERNOON")} />
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <CaregiverLegend caregivers={caregivers} />
      </div>
      <p className="px-1 text-xs text-slate-400">
        Point plein = journée · moitié haute = matin · moitié basse = après-midi ·{" "}
        <span className="rounded px-1 text-white" style={{ background: RAINBOW }}>
          arc-en-ciel
        </span>{" "}
        = garde à trouver
      </p>
    </div>
  );
}

/** Dot filled on the top half for morning, the bottom half for afternoon, fully for both. */
function HalfDayDot({ color, morning, afternoon }: { color: string; morning: boolean; afternoon: boolean }) {
  const top = morning ? color : "transparent";
  const bottom = afternoon ? color : "transparent";
  const label = morning && afternoon ? "Journée" : morning ? "Matin" : "Après-midi";
  return (
    <span
      className="h-2 w-2 rounded-full"
      style={{ background: `linear-gradient(to bottom, ${top} 50%, ${bottom} 50%)`, boxShadow: `inset 0 0 0 1px ${color}` }}
      title={label}
      aria-hidden="true"
    />
  );
}

function CaregiverLegend({ caregivers }: { caregivers: { id: string; firstName: string; color: string }[] }) {
  if (caregivers.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-row flex-wrap gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:w-40 sm:flex-col">
      {caregivers.map((caregiver) => (
        <div key={caregiver.id} className="flex items-center gap-2 text-sm text-slate-600">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: caregiver.color }}
            aria-hidden="true"
          />
          {caregiver.firstName}
        </div>
      ))}
    </div>
  );
}

async function NeedsList({
  children_,
  childId,
  editable,
  query,
}: {
  children_: Awaited<ReturnType<typeof listChildren>>;
  childId: string | undefined;
  editable: boolean;
  query: string;
}) {
  const todayStart = startOfUTCDay(new Date());
  const rangeEnd = addUTCDays(todayStart, 365);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrences(todayStart, rangeEnd),
    listCareNeeds(todayStart, rangeEnd),
  ]);
  const needs = rawNeeds.filter((n) => !childId || n.childId === childId);
  const needsByDay = groupNeeds(needs, rawOccurrences);
  const sortedDays = Array.from(needsByDay.keys()).sort();

  if (sortedDays.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow-sm">
        Aucun jour avec garde à trouver.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sortedDays.map((key) => {
        const day = needsByDay.get(key)!;
        const dayNeeds = needs.filter((n) => n.date === key);
        return (
          <li key={key} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
            <Link
              href={`/planning?view=day&date=${key}${query}`}
              className="flex flex-1 flex-col gap-1"
            >
              <span className="text-sm font-semibold capitalize text-slate-700">
                {formatDateLong(new Date(`${key}T00:00:00.000Z`))}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {dayNeeds.map((n) => {
                  const child = children_.find((c) => c.id === n.childId);
                  return (
                    <span key={n.id} className="flex items-center gap-1 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: child?.color }} />
                      {child?.firstName}
                    </span>
                  );
                })}
                <RainbowBadge
                  label={day.uncovered ? "Garde à trouver" : "Garde trouvée"}
                  className={day.uncovered ? "" : "opacity-50"}
                />
              </span>
            </Link>
            {editable && (
              <div className="flex shrink-0 gap-1">
                {dayNeeds.map((n) => (
                  <form key={n.id} action={deleteCareNeedAction.bind(null, n.id)}>
                    <button
                      type="submit"
                      className="tap-target rounded-full px-2 text-sm text-slate-400 active:bg-slate-100"
                      aria-label={`Retirer le besoin de garde de ${children_.find((c) => c.id === n.childId)?.firstName ?? ""}`}
                      title="Retirer"
                    >
                      ×
                    </button>
                  </form>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
