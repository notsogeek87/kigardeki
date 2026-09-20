import type { TimeSlot } from "@/lib/time-slots";

const OPTIONS: { value: TimeSlot; label: string; icon: string }[] = [
  { value: "MORNING", label: "Matin", icon: "🌅" },
  { value: "AFTERNOON", label: "Après-midi", icon: "🌇" },
];

export function TimeSlotCheckboxes({
  name = "slots",
  defaultSlots,
}: {
  name?: string;
  defaultSlots: TimeSlot[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-slate-700">Quand</legend>
      <div className="flex gap-3">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="tap-target flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
          >
            <input
              type="checkbox"
              name={name}
              value={opt.value}
              defaultChecked={defaultSlots.includes(opt.value)}
              className="h-5 w-5 rounded border-slate-300"
            />
            {opt.icon} {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
