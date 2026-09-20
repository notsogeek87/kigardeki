"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { registerFamily } from "@/lib/data/users";

const schema = z.object({
  familyName: z.string().trim().min(1, "Le nom de famille est requis."),
  parentName: z.string().trim().min(1, "Votre prénom est requis."),
  parentRelation: z.enum(["MOTHER", "FATHER", "OTHER"]),
  email: z.string().trim().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    familyName: formData.get("familyName"),
    parentName: formData.get("parentName"),
    parentRelation: formData.get("parentRelation"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Erreur")}`);
  }

  try {
    await registerFamily(parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Une erreur est survenue.";
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/today",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }
}
