import type { CaregiverRelation, EventType } from "@prisma/client";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  SCHOOL: "École",
  DAYCARE: "Crèche / Nounou",
  CAREGIVING: "Garde",
  PARENT: "Parent",
  OTHER: "Autre",
};

export const EVENT_TYPE_ICON: Record<EventType, string> = {
  SCHOOL: "🏫",
  DAYCARE: "👶",
  CAREGIVING: "👵",
  PARENT: "👨‍👩‍👧",
  OTHER: "📌",
};

export const RELATION_LABEL: Record<CaregiverRelation, string> = {
  MOTHER: "Maman",
  FATHER: "Papa",
  GRANDMOTHER: "Grand-mère",
  GRANDFATHER: "Grand-père",
  AUNT: "Tante",
  UNCLE: "Oncle",
  NANNY: "Nounou",
  OTHER: "Autre",
};

export const RELATION_ICON: Record<CaregiverRelation, string> = {
  MOTHER: "👩",
  FATHER: "👨",
  GRANDMOTHER: "👵",
  GRANDFATHER: "👴",
  AUNT: "👩",
  UNCLE: "👨",
  NANNY: "🧑",
  OTHER: "🧑",
};

export const WEEKDAY_CHECKBOX_LABELS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];
