import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnTetePage } from "@/components/ui";
import FormulairePelerin from "@/components/formulaire-pelerin";
import { creerPelerin } from "@/lib/actions/pelerins";

export const metadata: Metadata = { title: "Nouveau pèlerin" };

export default async function PageNouveauPelerin() {
  await exigerAcces("pelerins");
  const supabase = await creerClientServeur();

  // Mahram possibles : les pèlerins masculins déjà enregistrés.
  const { data } = await supabase
    .from("pelerins")
    .select("id, nom, prenom, matricule")
    .eq("sexe", "M")
    .order("nom");

  return (
    <>
      <EnTetePage
        titre="Nouveau pèlerin"
        description="La fiche sert de base à tous les dossiers d'inscription du pèlerin."
      />
      <FormulairePelerin
        action={creerPelerin}
        mahramPossibles={data ?? []}
        redirectionBase="/pelerins"
      />
    </>
  );
}
