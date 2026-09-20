import { describe, expect, it } from "vitest";
import { expandEventOccurrences } from "@/lib/recurrence";

function utc(y: number, m: number, d: number, h = 0, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

describe("expandEventOccurrences", () => {
  it("returns a single occurrence for a non-recurring event inside the range", () => {
    const event = {
      id: "e1",
      startAt: utc(2026, 9, 23, 16, 30),
      endAt: utc(2026, 9, 23, 19, 30),
      recurrenceFrequency: null,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    };
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 21), utc(2026, 9, 28));
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]!.occurrenceDate).toBe("2026-09-23");
  });

  it("excludes a non-recurring event outside the range", () => {
    const event = {
      id: "e1",
      startAt: utc(2026, 9, 10, 16, 30),
      endAt: utc(2026, 9, 10, 19, 30),
      recurrenceFrequency: null,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    };
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 21), utc(2026, 9, 28));
    expect(occurrences).toHaveLength(0);
  });

  it("expands a weekly recurrence on specific days across several weeks", () => {
    const event = {
      id: "e1",
      // First Wednesday.
      startAt: utc(2026, 9, 23, 16, 30),
      endAt: utc(2026, 9, 23, 19, 30),
      recurrenceFrequency: "WEEKLY" as const,
      recurrenceDaysOfWeek: [3], // Wednesday
      recurrenceEndDate: null,
    };
    // Four-week window.
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 21), utc(2026, 10, 19));
    expect(occurrences).toHaveLength(4);
    expect(occurrences.map((o) => o.occurrenceDate)).toEqual([
      "2026-09-23",
      "2026-09-30",
      "2026-10-07",
      "2026-10-14",
    ]);
    // Time of day is preserved on every occurrence.
    for (const occ of occurrences) {
      expect(occ.startAt.getUTCHours()).toBe(16);
      expect(occ.startAt.getUTCMinutes()).toBe(30);
    }
  });

  it("never produces an occurrence before the recurrence's own start date", () => {
    const event = {
      id: "e1",
      startAt: utc(2026, 9, 23, 16, 30), // Wednesday
      endAt: utc(2026, 9, 23, 19, 30),
      recurrenceFrequency: "WEEKLY" as const,
      recurrenceDaysOfWeek: [3],
      recurrenceEndDate: null,
    };
    // Range starts a full week before the event's own start date.
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 14), utc(2026, 9, 28));
    expect(occurrences.map((o) => o.occurrenceDate)).toEqual(["2026-09-23"]);
  });

  it("stops at recurrenceEndDate (inclusive)", () => {
    const event = {
      id: "e1",
      startAt: utc(2026, 9, 23, 16, 30),
      endAt: utc(2026, 9, 23, 19, 30),
      recurrenceFrequency: "WEEKLY" as const,
      recurrenceDaysOfWeek: [3],
      recurrenceEndDate: utc(2026, 9, 30),
    };
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 21), utc(2026, 10, 19));
    expect(occurrences.map((o) => o.occurrenceDate)).toEqual(["2026-09-23", "2026-09-30"]);
  });

  it("supports several selected weekdays (e.g. every weekday)", () => {
    const event = {
      id: "e1",
      startAt: utc(2026, 9, 21, 8, 30), // Monday
      endAt: utc(2026, 9, 21, 16, 30),
      recurrenceFrequency: "WEEKLY" as const,
      recurrenceDaysOfWeek: [1, 2, 3, 4, 5],
      recurrenceEndDate: null,
    };
    const occurrences = expandEventOccurrences(event, utc(2026, 9, 21), utc(2026, 9, 28));
    expect(occurrences).toHaveLength(5);
  });

  it("allows two independent events to overlap without interfering", () => {
    const schoolRun = {
      id: "school",
      startAt: utc(2026, 9, 23, 8, 30),
      endAt: utc(2026, 9, 23, 16, 30),
      recurrenceFrequency: null,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    };
    const caregiving = {
      id: "caregiving",
      startAt: utc(2026, 9, 23, 15, 0), // overlaps the tail end of school
      endAt: utc(2026, 9, 23, 19, 0),
      recurrenceFrequency: null,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    };
    const range = [utc(2026, 9, 21), utc(2026, 9, 28)] as const;
    expect(expandEventOccurrences(schoolRun, ...range)).toHaveLength(1);
    expect(expandEventOccurrences(caregiving, ...range)).toHaveLength(1);
  });
});
