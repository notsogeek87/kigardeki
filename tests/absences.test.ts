import { describe, expect, it } from "vitest";
import { absentCaregiversByDay, type AbsenceDTO } from "@/lib/absences";

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const absence = (caregiverId: string, startDate: string, endDate: string): AbsenceDTO => ({
  id: `${caregiverId}-${startDate}`,
  caregiverId,
  startDate,
  endDate,
});

describe("absentCaregiversByDay", () => {
  it("covers every day of the absence, both ends included", () => {
    const byDay = absentCaregiversByDay([absence("mary", "2026-11-03", "2026-11-05")], day("2026-11-01"), day("2026-12-01"));
    expect(Array.from(byDay.keys())).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(byDay.get("2026-11-04")).toEqual(["mary"]);
  });

  it("clips absences to the requested range (end exclusive)", () => {
    const byDay = absentCaregiversByDay([absence("mary", "2026-10-28", "2026-11-02")], day("2026-11-01"), day("2026-11-02"));
    expect(Array.from(byDay.keys())).toEqual(["2026-11-01"]);
  });

  it("handles a single-day absence and month boundaries", () => {
    const byDay = absentCaregiversByDay(
      [absence("mary", "2026-11-30", "2026-12-01"), absence("mary", "2026-11-15", "2026-11-15")],
      day("2026-11-01"),
      day("2026-12-31")
    );
    expect(Array.from(byDay.keys()).sort()).toEqual(["2026-11-15", "2026-11-30", "2026-12-01"]);
  });

  it("does not list the same caregiver twice for overlapping absences", () => {
    const byDay = absentCaregiversByDay(
      [absence("mary", "2026-11-01", "2026-11-03"), absence("mary", "2026-11-02", "2026-11-04"), absence("bob", "2026-11-02", "2026-11-02")],
      day("2026-11-01"),
      day("2026-12-01")
    );
    expect(byDay.get("2026-11-02")).toEqual(["mary", "bob"]);
    expect(byDay.get("2026-11-04")).toEqual(["mary"]);
  });

  it("ignores absences entirely outside the range", () => {
    expect(absentCaregiversByDay([absence("mary", "2026-09-01", "2026-09-10")], day("2026-11-01"), day("2026-12-01")).size).toBe(0);
  });
});
