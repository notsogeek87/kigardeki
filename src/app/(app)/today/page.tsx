import { redirect } from "next/navigation";

// Ancienne page d'accueil. Les apps déjà installées gardent "/today" comme
// adresse de démarrage (le téléphone ne relit pas le manifeste) : on les
// renvoie vers l'accueil actuel, le Planning en vue mois.
export default function LegacyTodayPage() {
  redirect("/planning");
}
