/**
 * Integration tests for the checklist in section 28 of the spec: parent vs
 * viewer permissions, and strict family-to-family isolation. These hit a
 * real Postgres database (via Prisma) because that is the only place the
 * enforcement actually matters — the whole point is that it happens
 * server-side, not in a mock.
 *
 * They only run when TEST_DATABASE_URL points at a real, disposable
 * database (e.g. a dedicated Neon test branch) — never run this against a
 * database with real family data, since it creates and deletes rows.
 * Locally / in CI: `TEST_DATABASE_URL=... npm test`.
 *
 * Note this is deliberately its own variable, not DATABASE_URL: CI (and
 * some local setups) always sets *some* DATABASE_URL so that unrelated
 * steps like `prisma generate` have a syntactically valid value, even when
 * no real test database is configured — gating on DATABASE_URL itself
 * would make these tests "pass" by silently never running.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

// Prisma's datasource requires *some* value for the constructor to succeed;
// when there's no real test database this stays unused because every test
// below is skipped.
process.env.DATABASE_URL = hasDb
  ? process.env.TEST_DATABASE_URL
  : "postgresql://invalid:invalid@localhost:5432/invalid";
process.env.ENCRYPTION_KEY ??= "6fh/oNujAEB5RYY9FYn3io/1Ood2/gfdKe1vPBQowkA=";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe.skipIf(!hasDb)("permissions & family isolation", async () => {
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { encrypt } = await import("@/lib/crypto");
  const { createChild, updateChild, deleteChild, listChildren } = await import("@/lib/data/children");
  const { createEvent } = await import("@/lib/data/events");
  const { ForbiddenError, UnauthorizedError } = await import("@/lib/permissions");

  const mockedAuth = vi.mocked(auth);

  let familyAId: string;
  let familyBId: string;
  let parentA: string;
  let viewerA: string;
  let parentB: string;

  function sessionFor(userId: string, familyId: string, role: "PARENT" | "VIEWER") {
    return { user: { id: userId, email: `${userId}@test.local`, name: "Test", role, familyId } } as never;
  }

  beforeAll(async () => {
    const familyA = await prisma.family.create({ data: { name: encrypt("Test Family A") } });
    const familyB = await prisma.family.create({ data: { name: encrypt("Test Family B") } });
    familyAId = familyA.id;
    familyBId = familyB.id;

    const pw = "hash-not-tested-here";
    const uA = await prisma.user.create({
      data: { email: `parentA-${Date.now()}@test.local`, passwordHash: pw, name: encrypt("Parent A"), role: "PARENT", familyId: familyAId },
    });
    const vA = await prisma.user.create({
      data: { email: `viewerA-${Date.now()}@test.local`, passwordHash: pw, name: encrypt("Viewer A"), role: "VIEWER", familyId: familyAId },
    });
    const uB = await prisma.user.create({
      data: { email: `parentB-${Date.now()}@test.local`, passwordHash: pw, name: encrypt("Parent B"), role: "PARENT", familyId: familyBId },
    });
    parentA = uA.id;
    viewerA = vA.id;
    parentB = uB.id;
  });

  afterAll(async () => {
    const ids = [familyAId, familyBId].filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      await prisma.family.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("a parent can create a child in their own family", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "Charlie", color: "#2563eb" });
    expect(child.familyId).toBe(familyAId);
  });

  it("a viewer cannot create a child (server-side, not just UI)", async () => {
    mockedAuth.mockResolvedValue(sessionFor(viewerA, familyAId, "VIEWER"));
    await expect(createChild({ firstName: "Nope", color: "#2563eb" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("an unauthenticated request is rejected", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(listChildren()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("a parent can update and delete a child in their own family", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "Lucie", color: "#db2777" });
    const updated = await updateChild(child.id, { firstName: "Lucie B.", color: "#db2777" });
    expect(updated.firstName).toBe("Lucie B.");
    await expect(deleteChild(child.id)).resolves.toBeUndefined();
  });

  it("family B cannot read, update or delete family A's data", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "Isolated", color: "#16a34a" });

    mockedAuth.mockResolvedValue(sessionFor(parentB, familyBId, "PARENT"));
    await expect(updateChild(child.id, { firstName: "Hacked", color: "#000000" })).rejects.toBeInstanceOf(
      ForbiddenError
    );
    await expect(deleteChild(child.id)).rejects.toBeInstanceOf(ForbiddenError);

    const familyBChildren = await listChildren();
    expect(familyBChildren.find((c) => c.id === child.id)).toBeUndefined();
  });

  it("an event cannot reference another family's child", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const childA = await createChild({ firstName: "OnlyA", color: "#7c3aed" });

    mockedAuth.mockResolvedValue(sessionFor(parentB, familyBId, "PARENT"));
    await expect(
      createEvent({
        type: "CAREGIVING",
        startAt: new Date("2026-09-23T16:30:00Z"),
        endAt: new Date("2026-09-23T19:30:00Z"),
        childIds: [childA.id],
        caregiverIds: [],
      })
    ).rejects.toThrow();
  });

  it("supports an event with several children, and overlapping events", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const c1 = await createChild({ firstName: "One", color: "#2563eb" });
    const c2 = await createChild({ firstName: "Two", color: "#db2777" });

    const multiChildEvent = await createEvent({
      type: "PARENT",
      startAt: new Date("2026-09-25T16:30:00Z"),
      endAt: new Date("2026-09-25T21:00:00Z"),
      childIds: [c1.id, c2.id],
      caregiverIds: [],
    });
    expect(multiChildEvent.childIds.sort()).toEqual([c1.id, c2.id].sort());

    // Overlapping event for the same child — must be allowed, not rejected.
    const overlapping = await createEvent({
      type: "CAREGIVING",
      startAt: new Date("2026-09-25T18:00:00Z"),
      endAt: new Date("2026-09-25T20:00:00Z"),
      childIds: [c1.id],
      caregiverIds: [],
    });
    expect(overlapping.id).not.toBe(multiChildEvent.id);
  });

  it("supports a weekly recurring event", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "Recurring", color: "#d97706" });
    const event = await createEvent({
      type: "CAREGIVING",
      startAt: new Date("2026-09-23T16:30:00Z"),
      endAt: new Date("2026-09-23T19:30:00Z"),
      childIds: [child.id],
      caregiverIds: [],
      recurrence: { frequency: "WEEKLY", daysOfWeek: [3], endDate: null },
    });
    expect(event.recurrenceFrequency).toBe("WEEKLY");
    expect(event.recurrenceDaysOfWeek).toEqual([3]);
  });

  it("a new weekly-recurring event removes the overlapping weekday from a superseded one", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "Superseded", color: "#0891b2" });

    const daycare = await createEvent({
      type: "DAYCARE",
      startAt: new Date("2026-09-21T08:00:00Z"),
      endAt: new Date("2026-09-21T18:00:00Z"),
      childIds: [child.id],
      caregiverIds: [],
      recurrence: { frequency: "WEEKLY", daysOfWeek: [1, 2, 3, 4, 5], endDate: null },
    });
    expect(daycare.recurrenceDaysOfWeek).toEqual([1, 2, 3, 4, 5]);

    // A standing Wednesday-afternoon caregiving arrangement overlaps the
    // tail of the daycare event — Wednesday should be dropped from it.
    await createEvent({
      type: "CAREGIVING",
      startAt: new Date("2026-09-23T16:30:00Z"),
      endAt: new Date("2026-09-23T19:30:00Z"),
      childIds: [child.id],
      caregiverIds: [],
      recurrence: { frequency: "WEEKLY", daysOfWeek: [3], endDate: null },
    });

    const refreshed = await prisma.event.findUniqueOrThrow({ where: { id: daycare.id } });
    expect(refreshed.recurrenceDaysOfWeek.sort()).toEqual([1, 2, 4, 5]);
  });

  it("a one-off (non-recurring) event never supersedes a standing recurring schedule", async () => {
    mockedAuth.mockResolvedValue(sessionFor(parentA, familyAId, "PARENT"));
    const child = await createChild({ firstName: "NotSuperseded", color: "#dc2626" });

    const daycare = await createEvent({
      type: "DAYCARE",
      startAt: new Date("2026-09-21T08:00:00Z"),
      endAt: new Date("2026-09-21T18:00:00Z"),
      childIds: [child.id],
      caregiverIds: [],
      recurrence: { frequency: "WEEKLY", daysOfWeek: [1, 2, 3, 4, 5], endDate: null },
    });

    // A single exceptional Wednesday outing must not silently cancel the
    // standing daycare schedule for every future Wednesday.
    await createEvent({
      type: "PARENT",
      startAt: new Date("2026-09-23T16:30:00Z"),
      endAt: new Date("2026-09-23T18:30:00Z"),
      childIds: [child.id],
      caregiverIds: [],
    });

    const refreshed = await prisma.event.findUniqueOrThrow({ where: { id: daycare.id } });
    expect(refreshed.recurrenceDaysOfWeek.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
