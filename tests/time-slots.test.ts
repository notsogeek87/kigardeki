import { describe, expect, it } from "vitest";
import { slotsToTimeRange, timeToSlots, timeRangeToSlotLabel, MORNING_START, MIDDAY, AFTERNOON_END } from "@/lib/time-slots";

describe("time-slots", () => {
  it("maps slot selections to their canonical time range", () => {
    expect(slotsToTimeRange(["MORNING"])).toEqual({ startTime: MORNING_START, endTime: MIDDAY });
    expect(slotsToTimeRange(["AFTERNOON"])).toEqual({ startTime: MIDDAY, endTime: AFTERNOON_END });
    expect(slotsToTimeRange(["MORNING", "AFTERNOON"])).toEqual({ startTime: MORNING_START, endTime: AFTERNOON_END });
  });

  it("throws when no slot is selected", () => {
    expect(() => slotsToTimeRange([])).toThrow();
  });

  it("round-trips a canonical range back to the same slots", () => {
    expect(timeToSlots(MORNING_START, MIDDAY)).toEqual(["MORNING"]);
    expect(timeToSlots(MIDDAY, AFTERNOON_END)).toEqual(["AFTERNOON"]);
    expect(timeToSlots(MORNING_START, AFTERNOON_END)).toEqual(["MORNING", "AFTERNOON"]);
  });

  it("labels known slot combinations and falls back to null otherwise", () => {
    expect(timeRangeToSlotLabel(MORNING_START, MIDDAY)).toBe("Matin");
    expect(timeRangeToSlotLabel(MIDDAY, AFTERNOON_END)).toBe("Après-midi");
    expect(timeRangeToSlotLabel(MORNING_START, AFTERNOON_END)).toBe("Journée");
    expect(timeRangeToSlotLabel("09:15", "17:45")).toBeNull();
  });
});
