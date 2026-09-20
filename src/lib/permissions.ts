import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor() {
    super("Vous devez être connecté.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Action réservée aux parents.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  familyId: string;
};

/**
 * Every server action / route handler that touches family data MUST go
 * through this (or requireParent). This is the single server-side
 * enforcement point for "parents organize, viewers only consult" — the UI
 * hiding buttons for viewers is a convenience, not a security boundary.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user as SessionUser;
}

/** Requires an authenticated PARENT. Viewers are rejected server-side. */
export async function requireParent(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "PARENT") throw new ForbiddenError();
  return user;
}

/**
 * Same enforcement as requireParent, for use directly in a page component:
 * redirects instead of throwing, so a viewer who navigates straight to an
 * admin URL lands back on a normal page instead of an error screen. This is
 * a UX nicety on top of, never a replacement for, the server action checks.
 */
export async function requireParentPage(redirectTo = "/today"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    redirect(redirectTo);
  }
  return session.user as SessionUser;
}

/**
 * Strict family isolation: a resource's familyId must match the session's
 * familyId, or the request is rejected. Call this before returning or
 * mutating any row that carries a familyId.
 */
export function assertSameFamily(user: SessionUser, resourceFamilyId: string): void {
  if (user.familyId !== resourceFamilyId) {
    throw new ForbiddenError("Cette ressource n'appartient pas à votre famille.");
  }
}
