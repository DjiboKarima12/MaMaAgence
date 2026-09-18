"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
import type { VilleSejour } from "@/lib/database.types";
import { champsDepuisZod, messagePostgres, texteOptionnel, type EtatAction } from "./commun";

const VILLES = ["makkah", "madinah"] as const;
const OCCUPATIONS = ["hommes", "femmes", "famille"] as const;

/**
 * Les garde-fous de capacité et de mixité vivent dans la base (déclencheur
 * `trg_affectation_chambre`). Ici on se contente de traduire leurs messages.
 */
function messageChambre(erreur: { code?: string; message: string }): string {
  const m = erreur.message;
  if (/est complete|est complète/i.test(m)) {
    return m.replace("complete", "complète").replace("lits)", "lits occupés).");
  }
  if (/reservee aux hommes/i.test(m)) {
    return "Cette chambre est réservée aux hommes.";
  }
  if (/reservee aux femmes/i.test(m)) {
    return "Cette chambre est réservée aux femmes.";
  }
  if (/est a makkah|est a madinah/i.test(m)) {
    return "Cette chambre n'est pas dans la ville sélectionnée.";
  }
  return messagePostgres(erreur);
}

/* -------------------------------------------------------------------------- */
/* Création                                                                    */
/* -------------------------------------------------------------------------- */

const schemaSerie = z.object({
  groupe_id: z.uuid("Sélectionnez un groupe"),
  ville: z.enum(VILLES),
  hotel: texteOptionnel,
  etage: texteOptionnel,
  numero_depart: z.coerce.number().int().min(1, "Numéro de départ invalide").max(99999),
  nombre: z.coerce.number().int().min(1, "Au moins une chambre").max(200, "200 chambres au maximum"),
  capacite: z.coerce.number().int().min(1).max(8),
  occupation: z.enum(OCCUPATIONS),
});

export async function creerChambresEnSerie(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  await exigerSession();
  const parse = schemaSerie.safeParse(Object.fromEntries(formData));

  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Vérifiez les champs signalés.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("creer_chambres_en_serie", {
    p_groupe: parse.data.groupe_id,
    p_ville: parse.data.ville,
    p_hotel: parse.data.hotel,
    p_etage: parse.data.etage,
    p_numero_depart: parse.data.numero_depart,
    p_nombre: parse.data.nombre,
    p_capacite: parse.data.capacite,
    p_occupation: parse.data.occupation,
  });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  const creees = Number(data ?? 0);
  revalidatePath("/logistique");

  if (creees === 0) {
    return {
      statut: "erreur",
      message: "Aucune chambre créée : ces numéros existent déjà pour ce groupe.",
    };
  }

  return {
    statut: "ok",
    message:
      creees < parse.data.nombre
        ? `${creees} chambre(s) créée(s) ; les numéros déjà pris ont été ignorés.`
        : `${creees} chambre(s) créée(s).`,
  };
}

export async function supprimerChambre(chambreId: string): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();

  // La contrainte est `on delete set null` : sans ce contrôle, supprimer une
  // chambre viderait silencieusement les affectations de ses occupants.
  const { data: chambre } = await supabase
    .from("v_chambres_occupation")
    .select("occupants, numero")
    .eq("id", chambreId)
    .maybeSingle();

  if (chambre && chambre.occupants > 0) {
    return {
      statut: "erreur",
      message: `La chambre ${chambre.numero} est occupée : retirez d'abord ses ${chambre.occupants} pèlerin(s).`,
    };
  }

  const { error } = await supabase.from("chambres").delete().eq("id", chambreId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/logistique");
  return { statut: "ok", message: "Chambre supprimée." };
}

/* -------------------------------------------------------------------------- */
/* Affectation                                                                 */
/* -------------------------------------------------------------------------- */

/** Place un pèlerin dans une chambre, ou l'en retire si `chambreId` est nul. */
export async function affecterChambre(
  dossierId: string,
  ville: VilleSejour,
  chambreId: string | null,
): Promise<EtatAction> {
  await exigerSession();

  if (!VILLES.includes(ville)) {
    return { statut: "erreur", message: "Ville inconnue." };
  }

  const supabase = await creerClientServeur();

  // Colonnes littérales : une clé calculée ferait perdre le typage de la table.
  const { error } = await supabase
    .from("dossiers")
    .update(
      ville === "makkah"
        ? { chambre_makkah_id: chambreId }
        : { chambre_madinah_id: chambreId },
    )
    .eq("id", dossierId);

  if (error) return { statut: "erreur", message: messageChambre(error) };

  revalidatePath("/logistique");
  revalidatePath(`/dossiers/${dossierId}`);
  return {
    statut: "ok",
    message: chambreId ? "Pèlerin installé." : "Pèlerin retiré de la chambre.",
  };
}

/** Vide une chambre d'un coup, sans la supprimer. */
export async function viderChambre(
  chambreId: string,
  ville: VilleSejour,
): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();

  const { error } =
    ville === "makkah"
      ? await supabase
          .from("dossiers")
          .update({ chambre_makkah_id: null })
          .eq("chambre_makkah_id", chambreId)
      : await supabase
          .from("dossiers")
          .update({ chambre_madinah_id: null })
          .eq("chambre_madinah_id", chambreId);

  if (error) return { statut: "erreur", message: messageChambre(error) };

  revalidatePath("/logistique");
  return { statut: "ok", message: "Chambre vidée." };
}
