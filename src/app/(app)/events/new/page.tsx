import Link from "next/link";
import { requireParentPage } from "@/lib/permissions";
import { listChildren } from "@/lib/data/children";
import { listCaregivers } from "@/lib/data/caregivers";
import { EventForm } from "@/components/event-form";
import { CareNeedForm } from "@/components/care-need-form";
import { toDateInputValue } from "@/lib/wall-time";
import { createEventAction } from "../actions";
import { createCareNeedsAction } from "../care-needs-actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; date?: string; mode?: string }>;
}) {
  await requireParentPage("/planning");
  const { error, date, mode } = await searchParams;
  const [familyChildren, caregivers] = await Promise.all([listChildren(), listCaregivers()]);
  const careNeed = mode === "care-need";
  const defaultDate = date ?? toDateInputValue(new Date());

  const tabs = [
    { href: "/events/new", label: "Événement", active: !careNeed },
    { href: "/events/new?mode=care-need", label: "Besoin de garde", active: careNeed },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Ajouter</h1>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tap-target flex-1 rounded-lg text-center text-sm font-medium leading-[38px] ${
              tab.active ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {familyChildren.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
          Ajoutez d&apos;abord un enfant avant de créer un événement.
        </p>
      ) : careNeed ? (
        <CareNeedForm
          action={createCareNeedsAction}
          familyChildren={familyChildren}
          error={error}
          defaultDate={defaultDate}
        />
      ) : (
        <EventForm
          action={createEventAction}
          familyChildren={familyChildren}
          caregivers={caregivers}
          error={error}
          submitLabel="Enregistrer"
          defaultDate={defaultDate}
        />
      )}
    </div>
  );
}
