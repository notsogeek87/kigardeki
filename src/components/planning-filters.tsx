"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CaregiverDTO, ChildDTO } from "@/lib/data/dto";

const SELECT_CLASS =
  "tap-target flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function PlanningFilters({
  children_,
  caregivers,
}: {
  children_: ChildDTO[];
  caregivers: CaregiverDTO[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: "child" | "caregiver", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <select
        aria-label="Filtrer par enfant"
        className={SELECT_CLASS}
        value={searchParams.get("child") ?? "ALL"}
        onChange={(e) => setParam("child", e.target.value)}
      >
        <option value="ALL">Tous les enfants</option>
        {children_.map((child) => (
          <option key={child.id} value={child.id}>
            {child.firstName}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrer par personne qui garde"
        className={SELECT_CLASS}
        value={searchParams.get("caregiver") ?? "ALL"}
        onChange={(e) => setParam("caregiver", e.target.value)}
      >
        <option value="ALL">Toutes les personnes</option>
        {caregivers.map((caregiver) => (
          <option key={caregiver.id} value={caregiver.id}>
            {caregiver.firstName}
          </option>
        ))}
      </select>
    </div>
  );
}
