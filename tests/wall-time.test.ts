import { describe, expect, it } from "vitest";
import {
  addUTCDays,
  combineDateAndTime,
  formatTime,
  startOfUTCWeek,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/wall-time";

describe("wall-time helpers", () => {
  it("combines a date and time input into the matching wall-clock Date", () => {
    const d = combineDateAndTime("2026-09-23", "16:30");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(8); // 0-indexed
    expect(d.getUTCDate()).toBe(23);
    expect(d.getUTCHours()).toBe(16);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it("round-trips through the date/time input helpers", () => {
    const d = combineDateAndTime("2026-01-05", "08:05");
    expect(toDateInputValue(d)).toBe("2026-01-05");
    expect(toTimeInputValue(d)).toBe("08:05");
    expect(formatTime(d)).toBe("08:05");
  });

  it("computes a Monday-start week regardless of the anchor's weekday", () => {
    // 2026-09-23 is a Wednesday.
    const wed = combineDateAndTime("2026-09-23", "12:00");
    expect(toDateInputValue(startOfUTCWeek(wed))).toBe("2026-09-21");

    // 2026-09-20 is a Sunday — should roll back to the *previous* Monday.
    const sun = combineDateAndTime("2026-09-20", "12:00");
    expect(toDateInputValue(startOfUTCWeek(sun))).toBe("2026-09-14");

    // Monday itself should map to itself.
    const mon = combineDateAndTime("2026-09-21", "00:00");
    expect(toDateInputValue(startOfUTCWeek(mon))).toBe("2026-09-21");
  });

  it("adds days without leaking local-timezone DST shifts", () => {
    const d = combineDateAndTime("2026-09-21", "00:00");
    expect(toDateInputValue(addUTCDays(d, 7))).toBe("2026-09-28");
  });
});
