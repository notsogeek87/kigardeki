import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { resolveShareToken } from "@/lib/data/shareLinks";
import { listChildrenForFamily } from "@/lib/data/children";
import { listCaregiversForFamily } from "@/lib/data/caregivers";
import { listEventOccurrencesForFamily, type EventOccurrenceDTO } from "@/lib/data/events";
import {
  countUncoveredNeedDaysForFamily,
  listCareNeedsForFamily,
} from "@/lib/data/care-needs";
import {
  CareNeedBanner,
  RAINBOW,
  RainbowBadge,
  groupNeeds,
  needLabel,
  slotsLabel,
  type NeedDay,
} from "@/components/care-need-display";
import { OccurrenceCard } from "@/components/occurrence-card";
import {
  addUTCDays,
  formatDateLong,
  startOfUTCDay,
  startOfUTCMonth,
  startOfUTCWeek,
  toDateInputValue,
} from "@/lib/wall-time";

/*
 * This page is mostly opened by grandparents (60+), often not at ease with
 * computers: big text (see `.share-root` in globals.css), labelled buttons
 * rather than bare arrows, plain-language wording, no JavaScript needed to
 * filter, and a one-tap "who are you?" shortcut to someone's own care days.
 */

type View = "day" | "week" | "month" | "needs";

type Children = Awaited<ReturnType<typeof listChildrenForFamily>>;
type Caregivers = Awaited<ReturnType<typeof listCaregiversForFamily>>;

// generateMetadata and the page both need the share; resolve it once per request.
const getShare = cache(resolveShareToken);

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const share = await getShare(token);
  return {
    title: share ? `Planning — ${share.familyName}` : "Kigardeki",
    // A private family planning: keep it out of search engines.
    robots: { index: false, follow: false },
    // "Add to home screen" must reopen this planning, not the parents' login.
    manifest: share ? `/share/${token}/manifest` : undefined,
    appleWebApp: { capable: true, title: "Planning", statusBarStyle: "default" },
  };
}

function parseDate(value: string | undefined): Date {
  if (!value) return new Date();
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function ucfirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shareHref(token: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) sp.set(key, value);
  const qs = sp.toString();
  return `/share/${token}${qs ? `?${qs}` : ""}`;
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
  searchParams: Promise<{ view?: string; date?: string; child?: string; caregiver?: string }>;
}) {
  const { token } = await params;
  const share = await getShare(token);

  if (!share) {
    return (
      <main className="share-root mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <Image src="/logo.png" alt="" width={64} height={64} />
        <h1 className="text-2xl font-bold text-slate-900">Ce lien ne fonctionne plus</h1>
        <p className="text-lg text-slate-700">
          Les parents ont peut-être créé un nouveau lien. Demandez-leur de vous le renvoyer par SMS ou par
          e-mail.
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const view: View = sp.view === "day" || sp.view === "month" || sp.view === "needs" ? sp.view : "week";
  const anchor = parseDate(sp.date);
  const childId = sp.child || undefined;
  const caregiverId = sp.caregiver || undefined;

  const [children, caregivers, needCount] = await Promise.all([
    listChildrenForFamily(share.familyId),
    listCaregiversForFamily(share.familyId),
    view === "needs" ? Promise.resolve(0) : countUncoveredNeedDaysForFamily(share.familyId),
  ]);

  const query = `${sp.child ? `&child=${sp.child}` : ""}${sp.caregiver ? `&caregiver=${sp.caregiver}` : ""}`;
  const selectedCaregiver = caregivers.find((c) => c.id === caregiverId);

  return (
    <div className="share-root min-h-screen bg-slate-50 pb-10">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{share.familyName}</h1>
            <p className="text-sm text-slate-600">Le planning des enfants, tenu à jour par les parents</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-4">
        {children.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
            Aucun enfant enregistré pour le moment.
          </p>
        ) : selectedCaregiver ? (
          <>
            <Link
              href={shareHref(token, { child: childId })}
              className="tap-target flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm active:bg-slate-100"
            >
              ← Revenir au planning complet
            </Link>
            <h2 className="text-lg font-bold text-slate-900">
              Les prochaines gardes de {selectedCaregiver.firstName}
            </h2>
            <CaregiverAgenda
              familyId={share.familyId}
              children_={children}
              caregivers={caregivers}
              childId={childId}
              caregiverId={selectedCaregiver.id}
            />
          </>
        ) : (
          <>
            <CareNeedBanner href={shareHref(token, { view: "needs", child: childId })} count={needCount} />

            <WhoAreYou token={token} caregivers={caregivers} childId={childId} />

            {children.length > 1 && <ChildChips token={token} children_={children} childId={childId} view={view} />}

            <nav aria-label="Affichage" className="flex rounded-xl bg-slate-200 p-1">
              {(["day", "week", "month", "needs"] as const).map((v) => (
                <Link
                  key={v}
                  href={`/share/${token}?view=${v}&date=${toDateInputValue(anchor)}${query}`}
                  aria-current={view === v ? "page" : undefined}
                  className={`tap-target flex-1 rounded-lg text-center text-base font-semibold leading-[44px] ${
                    view === v ? "bg-white text-brand-700 shadow-sm" : "text-slate-700"
                  }`}
                >
                  {v === "day" ? "Jour" : v === "week" ? "Semaine" : v === "month" ? "Mois" : "À garder"}
                </Link>
              ))}
            </nav>

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
                query={query}
              />
            )}
          </>
        )}

        <HelpBox />
      </div>
    </div>
  );
}

/** One big button per person: tapping your own name shows only your care days. */
function WhoAreYou({
  token,
  caregivers,
  childId,
}: {
  token: string;
  caregivers: Caregivers;
  childId: string | undefined;
}) {
  if (caregivers.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Voir seulement les gardes de :</h2>
      <div className="flex flex-wrap gap-2">
        {caregivers.map((c) => (
          <Link
            key={c.id}
            href={shareHref(token, { caregiver: c.id, child: childId })}
            className="tap-target inline-flex items-center gap-2 rounded-full border-2 px-4 text-base font-semibold text-slate-800 active:bg-slate-100"
            style={{ borderColor: c.color }}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
            {c.firstName}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ChildChips({
  token,
  children_,
  childId,
  view,
}: {
  token: string;
  children_: Children;
  childId: string | undefined;
  view: View;
}) {
  const chip = (active: boolean) =>
    `tap-target inline-flex items-center gap-2 rounded-full px-4 text-base font-semibold ${
      active ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 active:bg-slate-100"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choisir un enfant">
      <span className="text-base text-slate-700">Enfant :</span>
      <Link href={shareHref(token, { view })} className={chip(!childId)} aria-current={!childId ? "true" : undefined}>
        Tous
      </Link>
      {children_.map((child) => (
        <Link
          key={child.id}
          href={shareHref(token, { view, child: child.id })}
          className={chip(childId === child.id)}
          aria-current={childId === child.id ? "true" : undefined}
        >
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: child.color }} aria-hidden="true" />
          {child.firstName}
        </Link>
      ))}
    </div>
  );
}

/** Uncovered need: rainbow "Garde à trouver"; covered: a calm green "Garde trouvée". */
function NeedBadge({ need, children_, large = false }: { need: NeedDay; children_: Children; large?: boolean }) {
  if (need.uncovered) {
    const label = needLabel(need, children_, "Garde à trouver");
    return large ? (
      <p className="rounded-xl px-4 py-3 text-base font-semibold text-white" style={{ background: RAINBOW }}>
        {label}
      </p>
    ) : (
      <RainbowBadge label={label} />
    );
  }
  const label = `✓ ${needLabel(need, children_, "Garde trouvée")}`;
  return large ? (
    <p className="rounded-xl bg-green-50 px-4 py-3 text-base font-semibold text-green-800">{label}</p>
  ) : (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">{label}</span>
  );
}

function NavButtons({
  token,
  view,
  prev,
  next,
  label,
  isCurrent,
  query,
}: {
  token: string;
  view: View;
  prev: Date;
  next: Date;
  label: string;
  isCurrent: boolean;
  query: string;
}) {
  const unit = view === "day" ? "Jour" : view === "week" ? "Semaine" : "Mois";
  const button =
    "tap-target flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-2 text-base font-semibold text-slate-700 shadow-sm active:bg-slate-100";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-lg font-bold text-slate-900">{label}</p>
      <div className="flex gap-2">
        <Link
          href={`/share/${token}?view=${view}&date=${toDateInputValue(prev)}${query}`}
          className={button}
          aria-label={`${unit} précédent${unit === "Semaine" ? "e" : ""}`}
        >
          ← Avant
        </Link>
        {!isCurrent && (
          <Link href={`/share/${token}?view=${view}${query}`} className={`${button} text-brand-700`}>
            Aujourd&apos;hui
          </Link>
        )}
        <Link
          href={`/share/${token}?view=${view}&date=${toDateInputValue(next)}${query}`}
          className={button}
          aria-label={`${unit} suivant${unit === "Semaine" ? "e" : ""}`}
        >
          Après →
        </Link>
      </div>
    </div>
  );
}

function TodayBadge() {
  return (
    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
      Aujourd&apos;hui
    </span>
  );
}

async function DayView({
  token,
  anchor,
  familyId,
  children_,
  caregivers,
  childId,
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Children;
  caregivers: Caregivers;
  childId: string | undefined;
  query: string;
}) {
  const dayStart = startOfUTCDay(anchor);
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
      <NavButtons
        token={token}
        view="day"
        prev={addUTCDays(dayStart, -1)}
        next={addUTCDays(dayStart, 1)}
        label={ucfirst(formatDateLong(dayStart))}
        isCurrent={toDateInputValue(dayStart) === toDateInputValue(new Date())}
        query={query}
      />

      {need && <NeedBadge need={need} children_={children_} large />}

      {occurrences.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">Rien de prévu ce jour-là.</p>
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
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  children_: Children;
  caregivers: Caregivers;
  childId: string | undefined;
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
  const days = Array.from({ length: 7 }, (_, i) => addUTCDays(weekStart, i));

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
  const isCurrent = toDateInputValue(weekStart) === toDateInputValue(startOfUTCWeek(new Date()));

  return (
    <div className="flex flex-col gap-4">
      <NavButtons
        token={token}
        view="week"
        prev={addUTCDays(weekStart, -7)}
        next={addUTCDays(weekStart, 7)}
        label={`Semaine du ${formatDateLong(weekStart)}`}
        isCurrent={isCurrent}
        query={query}
      />

      <div className="flex flex-col gap-5">
        {days.map((d) => {
          const key = toDateInputValue(d);
          const dayOccurrences = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const need = needsByDay.get(key);
          return (
            <section
              key={key}
              className={`flex flex-col gap-2 ${isToday ? "-mx-2 rounded-2xl bg-brand-50 p-2 ring-2 ring-brand-500" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2 px-1">
                <h3 className={`text-base font-bold ${isToday ? "text-brand-700" : "text-slate-900"}`}>
                  {ucfirst(formatDateLong(d))}
                </h3>
                {isToday && <TodayBadge />}
                {need && <NeedBadge need={need} children_={children_} />}
              </div>
              {dayOccurrences.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-3 text-base text-slate-600 shadow-sm">Rien de prévu.</p>
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
            </section>
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
  children_: Children;
  caregivers: Caregivers;
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
      <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
        Aucune garde prévue dans les 3 prochains mois.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sortedDays.map((key) => {
        const d = new Date(`${key}T00:00:00.000Z`);
        const isToday = key === todayKey;
        return (
          <section key={key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <h3 className={`text-base font-bold ${isToday ? "text-brand-700" : "text-slate-900"}`}>
                {ucfirst(formatDateLong(d))}
              </h3>
              {isToday && <TodayBadge />}
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
          </section>
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
  query,
}: {
  token: string;
  anchor: Date;
  familyId: string;
  caregivers: Caregivers;
  children_: Children;
  childId: string | undefined;
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
  const colorsByDay = new Map<string, string[]>();
  for (const occ of occurrences) {
    const dayColors = colorsByDay.get(occ.occurrenceDate) ?? [];
    for (const caregiverIdForOcc of occ.caregiverIds) {
      const color = caregivers.find((c) => c.id === caregiverIdForOcc)?.color;
      if (color && !dayColors.includes(color)) dayColors.push(color);
    }
    colorsByDay.set(occ.occurrenceDate, dayColors);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d < gridEnd; d = addUTCDays(d, 1)) days.push(d);
  const todayKey = toDateInputValue(new Date());

  return (
    <div className="flex flex-col gap-3">
      <NavButtons
        token={token}
        view="month"
        prev={addUTCDays(monthStart, -1)}
        next={nextMonthStart}
        label={ucfirst(monthLabel)}
        isCurrent={toDateInputValue(monthStart) === toDateInputValue(startOfUTCMonth(new Date()))}
        query={query}
      />

      <p className="px-1 text-sm text-slate-600">Touchez un jour pour voir le détail.</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid flex-1 grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-semibold text-slate-600">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const key = toDateInputValue(d);
            const inMonth = d.getUTCMonth() === monthStart.getUTCMonth();
            const dayColors = colorsByDay.get(key) ?? [];
            const hasEvents = colorsByDay.has(key);
            const need = needsByDay.get(key);
            const rainbow = need?.uncovered ?? false;
            const isToday = key === todayKey;
            return (
              <Link
                key={key}
                href={`/share/${token}?view=day&date=${key}${query}`}
                aria-label={`${formatDateLong(d)}${rainbow ? ", garde à trouver" : ""}`}
                className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 text-base ${
                  rainbow ? "font-bold text-white" : inMonth ? "text-slate-900" : "text-slate-400"
                } ${isToday ? "ring-2 ring-brand-600" : ""}`}
                style={rainbow ? { background: RAINBOW } : undefined}
              >
                {d.getUTCDate()}
                {hasEvents && (
                  <span className="mt-0.5 flex items-center gap-0.5" aria-hidden="true">
                    {dayColors.length > 0 ? (
                      dayColors
                        .slice(0, 3)
                        .map((color, i) => (
                          <span
                            key={i}
                            className="h-2 w-2 rounded-full ring-1 ring-white"
                            style={{ backgroundColor: color }}
                          />
                        ))
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <CaregiverLegend caregivers={caregivers} />
      </div>
      <p className="px-1 text-sm text-slate-700">
        <span className="rounded px-1.5 py-0.5 font-semibold text-white" style={{ background: RAINBOW }}>
          Jour en couleurs
        </span>{" "}
        = il faut encore trouver quelqu&apos;un pour garder.
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
  children_: Children;
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
      <p className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
        Pour l&apos;instant, les parents n&apos;ont besoin de personne. 🎉
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-base text-slate-700">
        Les jours où les parents ont besoin de quelqu&apos;un pour garder les enfants. Si vous êtes disponible,
        prévenez-les directement.
      </p>
      <ul className="flex flex-col gap-2">
        {sortedDays.map((key) => {
          const day = needsByDay.get(key)!;
          const dayNeeds = needs.filter((n) => n.date === key);
          return (
            <li key={key}>
              <Link
                href={`/share/${token}?view=day&date=${key}${query}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-slate-900">
                    {ucfirst(formatDateLong(new Date(`${key}T00:00:00.000Z`)))}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-brand-700" aria-hidden="true">
                    Voir →
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {dayNeeds.map((n) => {
                    const child = children_.find((c) => c.id === n.childId);
                    return (
                      <span key={n.id} className="flex items-center gap-1.5 text-base text-slate-800">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: child?.color }} aria-hidden="true" />
                        {child?.firstName} ({slotsLabel(n.slots).toLowerCase()})
                      </span>
                    );
                  })}
                  {day.uncovered ? (
                    <RainbowBadge label="Garde à trouver" />
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">
                      ✓ Garde trouvée
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CaregiverLegend({ caregivers }: { caregivers: { id: string; firstName: string; color: string }[] }) {
  if (caregivers.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:w-44">
      <p className="text-sm font-semibold text-slate-700">Qui garde :</p>
      <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 sm:flex-col">
        {caregivers.map((caregiver) => (
          <div key={caregiver.id} className="flex items-center gap-2 text-base text-slate-800">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: caregiver.color }}
              aria-hidden="true"
            />
            {caregiver.firstName}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plain-language help, folded by default so it never gets in the way. */
function HelpBox() {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-700 shadow-sm">
      <summary className="tap-target flex cursor-pointer items-center font-semibold text-slate-900">
        ❓ Comment utiliser ce planning ?
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p>
          Ce planning est tenu à jour par les parents. Vous pouvez seulement le <strong>consulter</strong> : rien
          de ce que vous touchez ici ne peut le modifier ou le casser.
        </p>
        <p>
          Touchez <strong>votre prénom</strong> en haut pour ne voir que <strong>vos</strong> gardes.
        </p>
        <p>
          <strong>Pour retrouver facilement ce planning</strong>, ajoutez-le à l&apos;écran d&apos;accueil de
          votre téléphone :
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>iPhone</strong> : touchez le bouton Partager (carré avec une flèche vers le haut), puis « Sur
            l&apos;écran d&apos;accueil ».
          </li>
          <li>
            <strong>Android</strong> : touchez les trois points en haut à droite, puis « Ajouter à l&apos;écran
            d&apos;accueil ».
          </li>
        </ul>
      </div>
    </details>
  );
}
