import { COLOR_PALETTE } from "@/lib/colors";

export function ColorPickerField({ defaultValue }: { defaultValue?: string }) {
  const initial = defaultValue ?? COLOR_PALETTE[0]!.value;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-slate-700">Couleur</legend>
      <div className="flex flex-wrap gap-3">
        {COLOR_PALETTE.map((c) => (
          <label key={c.value} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={c.value}
              defaultChecked={c.value === initial}
              className="peer sr-only"
            />
            <span
              className="tap-target flex h-11 w-11 items-center justify-center rounded-full border-2 border-transparent peer-checked:border-slate-900"
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
