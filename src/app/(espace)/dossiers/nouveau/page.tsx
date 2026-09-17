import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnTetePage } from "@/components/ui";
import FormulaireDossier from "./formulaire";

export const metadata: Metadata = { title: "Nouveau dossier" };

export default async function PageNouveauDossier({
  searchParams,
}: {
  searchParams: Promise<{ pelerin?: string }>;
}) {
  await exigerSession();
  const { pelerin } = await searchParams;
  const supabase = await creerClientServeur();

  const [{ data: pelerins }, { data: forfaits }, { data: groupes }] = await Promise.all([
    supabase.from("pelerins").select("id, nom, prenom, matricule").order("nom"),
    supabase
      .from("forfaits")
      .select("id, nom, type, prix_xof, acompte_xof, saison_id, saisons(libelle, ouverte)")
      .eq("actif", true)
      .order("nom"),
    supabase.from("groupes").select("id, nom, saison_id").order("date_depart"),
  ]);

  type ForfaitJoint = {
    id: string;
    nom: string;
    type: string;
    prix_xof: number;
    acompte_xof: number;
    saison_id: string;
    saisons: { libelle: string; ouverte: boolean } | null;
  };

  const forfaitsOuverts = ((forfaits ?? []) as ForfaitJoint[])
    .filter((f) => f.saisons?.ouverte !== false)
    .map((f) => ({
      id: f.id,
      nom: f.nom,
      type: f.type,
      prix_xof: f.prix_xof,
      acompte_xof: f.acompte_xof,
      saison_id: f.saison_id,
      saison_libelle: f.saisons?.libelle ?? "Saison",
    }));

  return (
    <>
      <EnTetePage
        titre="Nouveau dossier"
        description="Le prix est repris du forfait sélectionné et figé à l'inscription."
      />
      <FormulaireDossier
        pelerins={pelerins ?? []}
        forfaits={forfaitsOuverts}
        groupes={groupes ?? []}
        pelerinInitial={pelerin}
      />
    </>
  );
}
