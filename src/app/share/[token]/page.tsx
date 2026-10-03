import Image from "next/image";
import Link from "next/link";
import { resolveShareToken } from "@/lib/data/shareLinks";
import { listChildrenForFamily } from "@/lib/data/children";
import { listCaregiversForFamily } from "@/lib/data/caregivers";
import { listEventOccurrencesForFamily, type EventOccurrenceDTO } from "@/lib/data/events";
import {
  countUncoveredNeedDaysForFamily,
  listCareNeedsForFamily,
} from "@/lib/data/care-needs";
import { CareNeedBanner, RAINBOW, RainbowBadge, groupNeeds, needLabel } from "@/components/care-need-display";
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
} from "@/lib/wall-time";

type View = "day" | "week" | "month" | "needs";

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

export default async function SharedPlanningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; date?: string; child?: string; caregiver?: string; needs?: string }>;
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
  const view: View = sp.view === "day" || sp.view === "month" || sp.view === "needs" ? sp.view : "week";
  const anchor = parseDate(sp.date);
  const childId = sp.child || undefined;
  const caregiverId = sp.caregiver || undefined;
  const needsOnly = sp.needs === "1";

  const [children, caregivers, needCount] = await Promise.all([
    listChildrenForFamily(share.familyId),
    listCaregiversForFamily(share.familyId),
    view === "needs" ? Promise.resolve(0) : countUncoveredNeedDaysForFamily(share.familyId),
  ]);

  const query = `${sp.child ? `&child=${sp.child}` : ""}${sp.caregiver ? `&caregiver=${sp.caregiver}` : ""}${
    needsOnly ? "&needs=1" : ""
  }`;

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
        <CareNeedBanner href={`/share/${token}?view=needs`} count={needCount} />

        {children.length > 0 && <PlanningFilters children_={children} caregivers={caregivers} />}

        {children.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
            Aucun enfant enregistré pour le moment.
          </p>
        ) : caregiverId ? (
          <CaregiverAgenda
            familyId={share.familyId}
            children_={children}
            caregivers={caregivers}
            childId={childId}
            caregiverId={caregiverId}
          />
        ) : (
          <>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(["day", "week", "month", "needs"] as const).map((v) => (
                <Link
                  key={v}
                  href={`/share/${token}?view=${v}&date=${toDateInputValue(anchor)}${query}`}
                  className={`tap-target flex-1 rounded-lg text-center text-sm font-medium leading-[38px] ${
                    view === v ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {v === "day" ? "Jour" : v === "week" ? "Semaine" : v === "month" ? "Mois" : "À garder"}
                </Link>
              ))}
            </div>

            {view === "needs" ? (
              <NeedsList familyId={share.familyId} children_={children} childId={childId} token={token} query={query} />
            ) : view === "day" ? (
              <DayView
                token={token}
                anchor={anchor}
                familyId={share.familyId}
                children_={children}
                caregivers={caregivers}
                childId={childId}
                needsOnly={needsOnly}
                query={query}
              />
            ) : view === "week" ? (
              <WeekView
                token={token}
                anchor={anchor}
                familyId={share.familyId}
                children_={children}
                caregivers={caregivers}
                childId={childId}
                needsOnly={needsOnly}
                query={query}
              />
            ) : (
              <MonthView
                token={token}
                anchor={anchor}
                familyId={share.familyId}
                caregivers={caregivers}
                children_={children}
                childId={childId}
                needsOnly={needsOnly}
                query={query}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NavArrows({
  token,
  view,
  prev,
  next,
  label,
  query,
}: {
  token: string;
  view: View;
  prev: Date;
  next: Date;
  label: string;
  query: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/share/${token}?view=${view}&date=${toDateInputValue(prev)}${query}`}
        className="tap-target rounded-full px-3 py-2 text-lg text-slate-500"
        aria-label="Précédent"
      >
        ←
      </Link>
      <p className="font-medium capitalize text-slate-700">{label}</p>
      <Link
        href={`/share/${token}?view=${view}&date=${toDateInputValue(next)}${query}`}
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
  childId,
  needsOnly,
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
  childId: string | undefined;
  needsOnly: boolean;
  query: string;
}) {
  const dayStart = new Date(anchor);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = addUTCDays(dayStart, 1);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrencesForFamily(familyId, dayStart, dayEnd),
    listCareNeedsForFamily(familyId, dayStart, dayEnd),
  ]);
  const occurrences = filterOccurrences(rawOccurrences, childId, undefined);
  occurrences.sort((a, b) => a.occurrenceStartAt.getTime() - b.occurrenceStartAt.getTime());
  const need = groupNeeds(rawNeeds.filter((n) => !childId || n.childId === childId), occurrences).get(
    toDateInputValue(dayStart)
  );

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        token={token}
        view="day"
        prev={addUTCDays(dayStart, -1)}
        next={addUTCDays(dayStart, 1)}
        label={formatDateLong(dayStart)}
        query={query}
      />

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
  childId,
  needsOnly,
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
  childId: string | undefined;
  needsOnly: boolean;
  query: string;
}) {
  const weekStart = startOfUTCWeek(anchor);
  const weekEnd = addUTCDays(weekStart, 7);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrencesForFamily(familyId, weekStart, weekEnd),
    listCareNeedsForFamily(familyId, weekStart, weekEnd),
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
        token={token}
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`${formatDateShort(weekStart)} — ${formatDateShort(addUTCDays(weekStart, 6))}`}
        query={query}
      />

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

async function CaregiverAgenda({
  familyId,
  children_,
  caregivers,
  childId,
  caregiverId,
}: {
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
  childId: string | undefined;
  caregiverId: string;
}) {
  const todayStart = startOfUTCDay(new Date());
  const rangeEnd = addUTCDays(todayStart, 90);
  const occurrences = filterOccurrences(
    await listEventOccurrencesForFamily(familyId, todayStart, rangeEnd),
    childId,
    caregiverId
  );

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
                  editable={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function MonthView({
  token,
  anchor,
  familyId,
  caregivers,
  children_,
  childId,
  needsOnly,
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  caregivers: Awaited<ReturnType<typeof listCaregiversForFamily>>;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  childId: string | undefined;
  needsOnly: boolean;
  query: string;
}) {
  const monthStart = startOfUTCMonth(anchor);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    monthStart
  );

  const gridStart = startOfUTCWeek(monthStart);
  const gridEnd = addUTCDays(startOfUTCWeek(addUTCDays(nextMonthStart, 6)), 7);

  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrencesForFamily(familyId, gridStart, gridEnd),
    listCareNeedsForFamily(familyId, gridStart, gridEnd),
  ]);
  const occurrences = filterOccurrences(rawOccurrences, childId, undefined);
  const needsByDay = groupNeeds(rawNeeds.filter((n) => !childId || n.childId === childId), occurrences);
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

  return (
    <div className="flex flex-col gap-3">
      <NavArrows
        token={token}
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
            const count = countByDay.get(key) ?? 0;
            const dayColors = colorsByDay.get(key) ?? [];
            const need = needsByDay.get(key);
            const rainbow = need?.uncovered ?? false;
            const dimmed = needsOnly && !need;
            return (
              <Link
                key={key}
                href={`/share/${token}?view=day&date=${key}${query}`}
                className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 text-sm ${
                  rainbow ? "font-bold text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                } ${dimmed ? "opacity-30" : ""}`}
                style={rainbow ? { background: RAINBOW } : undefined}
                title={need ? needLabel(need.childIds, children_) : undefined}
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
        <CaregiverLegend caregivers={caregivers} />
      </div>
      <p className="px-1 text-xs text-slate-400">
        <span className="rounded px-1 text-white" style={{ background: RAINBOW }}>
          arc-en-ciel
        </span>{" "}
        = garde à trouver
      </p>
    </div>
  );
}

async function NeedsList({
  token,
  familyId,
  children_,
  childId,
  query,
}: {
  token: string;
  familyId: string;
  children_: Awaited<ReturnType<typeof listChildrenForFamily>>;
  childId: string | undefined;
  query: string;
}) {
  const todayStart = startOfUTCDay(new Date());
  const rangeEnd = addUTCDays(todayStart, 365);
  const [rawOccurrences, rawNeeds] = await Promise.all([
    listEventOccurrencesForFamily(familyId, todayStart, rangeEnd),
    listCareNeedsForFamily(familyId, todayStart, rangeEnd),
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
          <li key={key}>
            <Link
              href={`/share/${token}?view=day&date=${key}${query}`}
              className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-sm"
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
          </li>
        );
      })}
    </ul>
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
