import type { Caregiver, Child, Event, Family } from "@prisma/client";
import { decrypt, decryptNullable } from "@/lib/crypto";

export type FamilyDTO = { id: string; name: string; createdAt: Date };

export function toFamilyDTO(row: Family): FamilyDTO {
  return { id: row.id, name: decrypt(row.name), createdAt: row.createdAt };
}

export type ChildDTO = {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  color: string;
  defaultLocation: string | null;
  notes: string | null;
};

export function toChildDTO(row: Child): ChildDTO {
  return {
    id: row.id,
    familyId: row.familyId,
    firstName: decrypt(row.firstName),
    lastName: decryptNullable(row.lastName),
    birthDate: decryptNullable(row.birthDate),
    avatarUrl: row.avatarUrl,
    color: row.color,
    defaultLocation: decryptNullable(row.defaultLocation),
    notes: decryptNullable(row.notes),
  };
}

export type CaregiverDTO = {
  id: string;
  familyId: string;
  userId: string | null;
  firstName: string;
  lastName: string | null;
  relation: Caregiver["relation"];
  phone: string | null;
  avatarUrl: string | null;
  color: string;
};

export function toCaregiverDTO(row: Caregiver): CaregiverDTO {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    firstName: decrypt(row.firstName),
    lastName: decryptNullable(row.lastName),
    relation: row.relation,
    phone: decryptNullable(row.phone),
    avatarUrl: row.avatarUrl,
    color: row.color,
  };
}

export type EventDTO = {
  id: string;
  familyId: string;
  type: Event["type"];
  startAt: Date;
  endAt: Date;
  location: string | null;
  notes: string | null;
  recurrenceFrequency: Event["recurrenceFrequency"];
  recurrenceDaysOfWeek: number[];
  recurrenceEndDate: Date | null;
  createdBy: string;
  childIds: string[];
  caregiverIds: string[];
};

export function toEventDTO(
  row: Event & { children: { childId: string }[]; caregivers: { caregiverId: string }[] }
): EventDTO {
  return {
    id: row.id,
    familyId: row.familyId,
    type: row.type,
    startAt: row.startAt,
    endAt: row.endAt,
    location: decryptNullable(row.location),
    notes: decryptNullable(row.notes),
    recurrenceFrequency: row.recurrenceFrequency,
    recurrenceDaysOfWeek: row.recurrenceDaysOfWeek,
    recurrenceEndDate: row.recurrenceEndDate,
    createdBy: row.createdBy,
    childIds: row.children.map((c) => c.childId),
    caregiverIds: row.caregivers.map((c) => c.caregiverId),
  };
}
