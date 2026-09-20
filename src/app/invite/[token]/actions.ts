"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { acceptInvitation, getInvitationPreview } from "@/lib/data/invitations";

const schema = z.object({
  name: z.string().trim().min(1, "Votre prénom est requis."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function acceptInvitationAction(token: string, formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/invite/${token}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Erreur")}`);
  }

  const preview = await getInvitationPreview(token);
  if (!preview) redirect(`/invite/${token}?error=Invitation%20introuvable.`);

  let email: string;
  try {
    const result = await acceptInvitation({ token, name: parsed.data.name, password: parsed.data.password });
    email = result.email;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Une erreur est survenue.";
    redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
    return;
  }

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/today" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}
