import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Carte, EnTetePage, EtatVide, LienBouton } from "@/components/ui";
import { MatriceChambres, type OccupantBrut } from "@/components/matrice-chambres";
import type { ChambreOccupation, Groupe, VilleSejour } from "@/lib/database.types";

export const metadata: Metadata = { title: "Hébergement" };

export default async function PageLogistique({
  searchParams,
}: {
  searchParams: Promise<{ groupe?: string; ville?: string; etage?: string; capacite?: string }>;
}) {
  await exigerSession();
  const params = await searchParams;
  const supabase = await creerClientServeur();

  const { data: groupesBruts } = await supabase
    .from("groupes")
    .select("*")
    .order("date_depart", { ascending: true });
  const groupes = (groupesBruts ?? []) as Groupe[];

  if (groupes.length === 0) {
    return (
      <>
        <EnTetePage
          titre="Hébergement"
          description="Répartition des pèlerins dans les chambres de Makkah et Madinah."
        />
        <Carte>
          <EtatVide
            titre="Aucun groupe de départ"
            description="Le plan d'hébergement se fait groupe par groupe : créez d'abord un groupe."
            action={<LienBouton href="/groupes">Créer un groupe</LienBouton>}
          />
        </Carte>
      </>
    );
  }

  const groupeId =
    params.groupe && groupes.some((g) => g.id === params.groupe)
      ? params.groupe
      : groupes[0].id;
  const ville: VilleSejour = params.ville === "madinah" ? "madinah" : "makkah";

  const [{ data: chambresBrutes }, { data: dossiersBruts }] = await Promise.all([
    supabase
      .from("v_chambres_occupation")
      .select("*")
      .eq("groupe_id", groupeId)
      .eq("ville", ville)
      .order("etage")
      .order("numero"),
    supabase
      .from("dossiers")
      .select(
        "id, chambre_makkah_id, chambre_madinah_id, pelerins(nom, prenom, sexe, matricule, telephone)",
      )
      .eq("groupe_id", groupeId)
      .neq("statut", "annule"),
  ]);

  const chambres = (chambresBrutes ?? []) as ChambreOccupation[];

  type DossierJoint = {
    id: string;
    chambre_makkah_id: string | null;
    chambre_madinah_id: string | null;
    pelerins: {
      nom: string;
      prenom: string;
      sexe: "M" | "F";
      matricule: string;
      telephone: string | null;
    } | null;
  };

  const occupants: OccupantBrut[] = ((dossiersBruts ?? []) as DossierJoint[])
    .filter((d) => d.pelerins !== null)
    .map((d) => ({
      dossierId: d.id,
      nom: d.pelerins!.nom,
      prenom: d.pelerins!.prenom,
      sexe: d.pelerins!.sexe,
      matricule: d.pelerins!.matricule,
      telephone: d.pelerins!.telephone,
      chambreId: ville === "makkah" ? d.chambre_makkah_id : d.chambre_madinah_id,
    }));

  const groupe = groupes.find((g) => g.id === groupeId)!;

  return (
    <MatriceChambres
      groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
      groupeId={groupeId}
      groupeNom={groupe.nom}
      ville={ville}
      chambres={chambres}
      occupants={occupants}
      etageFiltre={params.etage ?? ""}
      capaciteFiltre={params.capacite ?? ""}
    />
  );
}
