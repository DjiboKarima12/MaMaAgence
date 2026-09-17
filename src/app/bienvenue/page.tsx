import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sessionCourante } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import FormulaireAgence from "./formulaire";

export const metadata: Metadata = { title: "Finaliser votre agence" };

export default async function PageBienvenue() {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // L'agence existe déjà : rien à finaliser.
  if (await sessionCourante()) redirect("/tableau-de-bord");

  const nomSuggere =
    (user.user_metadata?.nom_complet as string | undefined) ?? user.email?.split("@")[0] ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ardoise-950">
        Dernière étape : votre agence
      </h1>
      <p className="mt-2 text-sm text-ardoise-500">
        Votre compte <span className="font-medium text-ardoise-700">{user.email}</span> est confirmé.
        Renseignez votre agence pour ouvrir votre espace de travail.
      </p>

      <div className="mt-8">
        <FormulaireAgence nomSuggere={nomSuggere} />
      </div>
    </main>
  );
}
