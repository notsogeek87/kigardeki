/**
 * Development seed data — a demo family with two parents, two children, two
 * caregivers and a representative spread of events (school, daycare,
 * caregiving, a two-children event, and a weekly recurring event).
 *
 * Run with: npm run seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

function utc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "papa@demo.kigardeki.app" } });
  if (existing) {
    console.log("Seed already applied — skipping.");
    return;
  }

  const family = await prisma.family.create({ data: { name: encrypt("Famille de démonstration") } });

  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const papa = await prisma.user.create({
    data: {
      email: "papa@demo.kigardeki.app",
      passwordHash,
      name: encrypt("Papa"),
      role: "PARENT",
      familyId: family.id,
    },
  });

  const maman = await prisma.user.create({
    data: {
      email: "maman@demo.kigardeki.app",
      passwordHash,
      name: encrypt("Maman"),
      role: "PARENT",
      familyId: family.id,
    },
  });

  const mamieUser = await prisma.user.create({
    data: {
      email: "mamie@demo.kigardeki.app",
      passwordHash,
      name: encrypt("Mamie"),
      role: "VIEWER",
      familyId: family.id,
    },
  });

  const [papaCaregiver, mamanCaregiver, mamieCaregiver, papiCaregiver] = await Promise.all([
    prisma.caregiver.create({
      data: { familyId: family.id, userId: papa.id, firstName: encrypt("Papa"), relation: "FATHER", color: "#2563eb" },
    }),
    prisma.caregiver.create({
      data: { familyId: family.id, userId: maman.id, firstName: encrypt("Maman"), relation: "MOTHER", color: "#db2777" },
    }),
    prisma.caregiver.create({
      data: {
        familyId: family.id,
        userId: mamieUser.id,
        firstName: encrypt("Mamie"),
        relation: "GRANDMOTHER",
        color: "#16a34a",
      },
    }),
    prisma.caregiver.create({
      data: { familyId: family.id, firstName: encrypt("Papi"), relation: "GRANDFATHER", color: "#d97706", phone: encrypt("0601020304") },
    }),
  ]);

  const charlie = await prisma.child.create({
    data: {
      familyId: family.id,
      firstName: encrypt("Charlie"),
      color: "#2563eb",
      defaultLocation: encrypt("École Jean Jaurès"),
    },
  });

  const lucie = await prisma.child.create({
    data: {
      familyId: family.id,
      firstName: encrypt("Lucie"),
      color: "#db2777",
      defaultLocation: encrypt("Crèche Les Petits Pas"),
    },
  });

  const today = new Date();
  const monday = utc(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  // Roll back to the Monday of the current week (UTC weekday math).
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));
  const dateAt = (offsetDays: number, hour: number, minute: number) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
  };

  // Charlie: school every weekday this week.
  for (let i = 0; i < 5; i++) {
    await prisma.event.create({
      data: {
        familyId: family.id,
        type: "SCHOOL",
        startAt: dateAt(i, 8, 30),
        endAt: dateAt(i, 16, 30),
        location: encrypt("École Jean Jaurès"),
        createdBy: papa.id,
        children: { create: [{ childId: charlie.id }] },
      },
    });
  }

  // Lucie: daycare every weekday this week.
  for (let i = 0; i < 5; i++) {
    await prisma.event.create({
      data: {
        familyId: family.id,
        type: "DAYCARE",
        startAt: dateAt(i, 8, 0),
        endAt: dateAt(i, 17, 30),
        location: encrypt("Crèche Les Petits Pas"),
        createdBy: maman.id,
        children: { create: [{ childId: lucie.id }] },
      },
    });
  }

  // Charlie: recurring caregiving at Mamie's every Wednesday, 16h30-19h30.
  await prisma.event.create({
    data: {
      familyId: family.id,
      type: "CAREGIVING",
      startAt: dateAt(2, 16, 30),
      endAt: dateAt(2, 19, 30),
      location: encrypt("Chez Mamie"),
      notes: encrypt("Penser aux affaires de piscine."),
      recurrenceFrequency: "WEEKLY",
      recurrenceDaysOfWeek: [3], // Wednesday
      createdBy: papa.id,
      children: { create: [{ childId: charlie.id }] },
      caregivers: { create: [{ caregiverId: mamieCaregiver.id }] },
    },
  });

  // Lucie: one-off caregiving at Papi's on Wednesday too.
  await prisma.event.create({
    data: {
      familyId: family.id,
      type: "CAREGIVING",
      startAt: dateAt(2, 17, 30),
      endAt: dateAt(2, 19, 30),
      location: encrypt("Chez Papi"),
      createdBy: maman.id,
      children: { create: [{ childId: lucie.id }] },
      caregivers: { create: [{ caregiverId: papiCaregiver.id }] },
    },
  });

  // Both children together with Papa on Friday evening.
  await prisma.event.create({
    data: {
      familyId: family.id,
      type: "PARENT",
      startAt: dateAt(4, 16, 30),
      endAt: dateAt(4, 21, 0),
      location: encrypt("Maison"),
      notes: encrypt("Soirée pizza."),
      createdBy: papa.id,
      children: { create: [{ childId: charlie.id }, { childId: lucie.id }] },
      caregivers: { create: [{ caregiverId: papaCaregiver.id }] },
    },
  });

  // Both children with Maman on Saturday (overlaps with nothing — sanity check for weekends).
  await prisma.event.create({
    data: {
      familyId: family.id,
      type: "PARENT",
      startAt: dateAt(5, 9, 0),
      endAt: dateAt(5, 12, 0),
      location: encrypt("Marché"),
      createdBy: maman.id,
      children: { create: [{ childId: charlie.id }, { childId: lucie.id }] },
      caregivers: { create: [{ caregiverId: mamanCaregiver.id }] },
    },
  });

  console.log("Seed complete:");
  console.log("  papa@demo.kigardeki.app / Demo1234!  (PARENT)");
  console.log("  maman@demo.kigardeki.app / Demo1234! (PARENT)");
  console.log("  mamie@demo.kigardeki.app / Demo1234! (VIEWER)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
