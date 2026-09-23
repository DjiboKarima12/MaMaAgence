import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnTetePage } from "@/components/ui";
import { InscriptionGuidee } from "@/components/inscription-guidee";

export const metadata: Metadata = { title: "Inscription d'un pèlerin" };

export default async function PageInscriptionGuidee() {
  const session = await exigerAcces("pelerins");
  const supabase = await creerClientServeur();

  const [{ data: forfaits }, { data: groupes }, { data: mahrams }] = await Promise.all([
    supabase
      .from("forfaits")
      .select("id, nom, saison_id, prix_xof, acompte_xof, saisons(libelle, ouverte)")
      .eq("actif", true)
      .order("prix_xof"),
    supabase.from("groupes").select("id, nom, saison_id, aeroport_depart").order("date_depart"),
    supabase.from("pelerins").select("id, nom, prenom, matricule").eq("sexe", "M").order("nom"),
  ]);

  type ForfaitJoint = {
    id: string;
    nom: string;
    saison_id: string;
    prix_xof: number;
    acompte_xof: number;
    saisons: { libelle: string; ouverte: boolean } | null;
  };

  // Seules les campagnes encore ouvertes acceptent une nouvelle inscription.
  const forfaitsOuverts = ((forfaits ?? []) as ForfaitJoint[])
    .filter((f) => f.saisons?.ouverte !== false)
    .map((f) => ({
      id: f.id,
      nom: f.nom,
      saison_id: f.saison_id,
      saison_libelle: f.saisons?.libelle ?? "Saison",
      prix_xof: f.prix_xof,
      acompte_xof: f.acompte_xof,
    }));

  return (
    <>
      <EnTetePage
        titre="Inscription d'un pèlerin"
        description="Identité, pièces justificatives et premier versement. Chaque étape est enregistrée au fur et à mesure."
      />
      <InscriptionGuidee
        agenceId={session.agence.id}
        forfaits={forfaitsOuverts}
        groupes={groupes ?? []}
        mahrams={mahrams ?? []}
      />
    </>
  );
}
