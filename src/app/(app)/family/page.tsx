import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { listFamilyMembers, listPendingInvitations } from "@/lib/data/family";
import { listCaregivers } from "@/lib/data/caregivers";
import { RELATION_ICON, RELATION_LABEL } from "@/lib/labels";
import { CopyLinkButton } from "@/components/copy-link-button";

export default async function FamilyPage() {
  const user = await requireSession();
  const isParent = user.role === "PARENT";

  const [members, caregivers, pendingInvitations] = await Promise.all([
    listFamilyMembers(),
    listCaregivers(),
    isParent ? listPendingInvitations() : Promise.resolve([]),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const memberByUserId = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Famille</h1>
        {isParent && (
          <Link
            href="/family/invite"
            className="tap-target rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Inviter
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personnes</h2>
        {caregivers.map((c) => (
          <Link
            key={c.id}
            href={isParent ? `/family/caregivers/${c.id}` : "#"}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:opacity-70"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white"
              style={{ backgroundColor: c.color }}
            >
              {RELATION_ICON[c.relation]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {c.firstName} {c.lastName ?? ""}
              </p>
              <p className="text-sm text-slate-500">
                {RELATION_LABEL[c.relation]}
                {c.userId && memberByUserId.get(c.userId) && (
                  <> · {memberByUserId.get(c.userId)!.role === "PARENT" ? "Parent" : "Consultation"}</>
                )}
              </p>
            </div>
          </Link>
        ))}

        {isParent && (
          <Link
            href="/family/caregivers/new"
            className="tap-target rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-500"
          >
            + Ajouter une personne de garde
          </Link>
        )}
      </section>

      {isParent && pendingInvitations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invitations en attente
          </h2>
          {pendingInvitations.map((inv) => {
            const link = `${appUrl}/invite/${inv.token}`;
            return (
              <div key={inv.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-700">{inv.email}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {inv.role === "PARENT" ? "Parent" : "Consultation"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-400">{link}</p>
                  <CopyLinkButton link={link} />
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
