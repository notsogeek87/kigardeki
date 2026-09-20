import Link from "next/link";
import type { EventOccurrenceDTO } from "@/lib/data/events";
import type { CaregiverDTO, ChildDTO } from "@/lib/data/dto";
import { EVENT_TYPE_ICON, EVENT_TYPE_LABEL } from "@/lib/labels";
import { formatSlotOrTime } from "@/lib/time-slots";

function namesFor(ids: string[], all: { id: string; firstName: string; color?: string }[]): string {
  return ids
    .map((id) => all.find((x) => x.id === id)?.firstName)
    .filter(Boolean)
    .join(" + ");
}

export function OccurrenceCard({
  occurrence,
  familyChildren,
  caregivers,
  editable,
  showChildren = true,
}: {
  occurrence: EventOccurrenceDTO;
  familyChildren: ChildDTO[];
  caregivers: CaregiverDTO[];
  editable: boolean;
  showChildren?: boolean;
}) {
  const childNames = namesFor(occurrence.childIds, familyChildren);
  const occurrenceCaregivers = occurrence.caregiverIds
    .map((id) => caregivers.find((c) => c.id === id))
    .filter((c): c is CaregiverDTO => Boolean(c));
  const accentColor = familyChildren.find((c) => occurrence.childIds.includes(c.id))?.color;

  const content = (
    <div
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      style={accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined}
    >
      <span className="text-2xl leading-none">{EVENT_TYPE_ICON[occurrence.type]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">
            {showChildren ? childNames : EVENT_TYPE_LABEL[occurrence.type]}
          </p>
          <p className="shrink-0 text-sm font-medium text-slate-600">
            {formatSlotOrTime(occurrence.occurrenceStartAt, occurrence.occurrenceEndAt)}
          </p>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
          <span>{EVENT_TYPE_LABEL[occurrence.type]}</span>
          {occurrenceCaregivers.length > 0 && (
            <>
              <span>·</span>
              {occurrenceCaregivers.map((caregiver) => (
                <span key={caregiver.id} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: caregiver.color }}
                    aria-hidden="true"
                  />
                  {caregiver.firstName}
                </span>
              ))}
            </>
          )}
        </p>
        {occurrence.location && <p className="mt-0.5 text-sm text-slate-400">📍 {occurrence.location}</p>}
      </div>
    </div>
  );

  if (!editable) return content;

  return (
    <Link href={`/events/${occurrence.id}/edit`} className="block active:opacity-70">
      {content}
    </Link>
  );
}
