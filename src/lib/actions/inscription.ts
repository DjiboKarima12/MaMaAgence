"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
import type { TypeDocument } from "@/lib/database.types";
import {
  caseACocher,
  champsDepuisZod,
  dateOptionnelle,
  messagePostgres,
  montantXof,
  texteOptionnel,
  type EtatAction,
} from "./commun";

/* -------------------------------------------------------------------------- */
/* Étape 1 — identité                                                          */
/* -------------------------------------------------------------------------- */

const schemaIdentite = z.object({
  pelerin_id: texteOptionnel,
  nom: z.string().trim().min(2, "Le nom est obligatoire"),
  prenom: z.string().trim().min(2, "Le prénom est obligatoire"),
  sexe: z.enum(["M", "F"], { message: "Sélectionnez le sexe" }),
  date_naissance: dateOptionnelle,
  lieu_naissance: texteOptionnel,
  nin: texteOptionnel,
  telephone: texteOptionnel,
  region: texteOptionnel,
  ville: texteOptionnel,
  profession: texteOptionnel,
  passeport_numero: texteOptionnel,
  passeport_delivre_le: dateOptionnelle,
  passeport_expire_le: dateOptionnelle,
  passeport_lieu: texteOptionnel,
  mahram_pelerin_id: texteOptionnel,
  mahram_lien: texteOptionnel,
  contact_urgence_nom: texteOptionnel,
  contact_urgence_tel: texteOptionnel,
  contact_urgence_lien: texteOptionnel,
  deja_effectue_hajj: caseACocher,
});

/**
 * Crée le pèlerin, ou le met à jour si l'agent revient en arrière dans le
 * parcours. Chaque étape est enregistrée : une coupure de connexion au
 * milieu de l'inscription ne fait pas reperdre la saisie.
 */
export async function enregistrerIdentite(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaIdentite.safeParse(Object.fromEntries(formData));

  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Vérifiez les champs signalés.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const { pelerin_id, ...champs } = parse.data;
  const supabase = await creerClientServeur();

  if (pelerin_id) {
    const { error } = await supabase.from("pelerins").update(champs).eq("id", pelerin_id);
    if (error) return { statut: "erreur", message: messagePostgres(error) };

    revalidatePath("/pelerins");
    return { statut: "ok", message: "Identité mise à jour.", id: pelerin_id };
  }

  const { data, error } = await supabase
    .from("pelerins")
    .insert({ ...champs, agence_id: session.agence.id, cree_par: session.utilisateurId })
    .select("id")
    .single();

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/pelerins");
  return { statut: "ok", message: "Pèlerin enregistré.", id: data.id };
}

/* -------------------------------------------------------------------------- */
/* Étape 2 — dossier, santé et pièces                                          */
/* -------------------------------------------------------------------------- */

const schemaDossier = z.object({
  pelerin_id: z.uuid("Pèlerin introuvable"),
  dossier_id: texteOptionnel,
  forfait_id: z.uuid("Sélectionnez un forfait"),
  groupe_id: texteOptionnel,
  aeroport_prefere: texteOptionnel,
  type_chambre: texteOptionnel,
  remise_xof: montantXof,
  groupe_sanguin: texteOptionnel,
  antecedents_medicaux: texteOptionnel,
  notes: texteOptionnel,
});

export async function enregistrerDossier(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaDossier.safeParse(Object.fromEntries(formData));

  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Vérifiez les champs signalés.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const {
    pelerin_id,
    dossier_id,
    forfait_id,
    groupe_sanguin,
    antecedents_medicaux,
    ...reste
  } = parse.data;

  const supabase = await creerClientServeur();

  // Les données de santé appartiennent à la personne, pas à la campagne.
  await supabase
    .from("pelerins")
    .update({ groupe_sanguin, antecedents_medicaux })
    .eq("id", pelerin_id);

  const { data: forfait, error: erreurForfait } = await supabase
    .from("forfaits")
    .select("id, saison_id, prix_xof")
    .eq("id", forfait_id)
    .single();

  if (erreurForfait || !forfait) return { statut: "erreur", message: "Forfait introuvable." };

  if (reste.remise_xof > forfait.prix_xof) {
    return {
      statut: "erreur",
      message: "La remise dépasse le prix du forfait.",
      champs: { remise_xof: "Remise trop élevée" },
    };
  }

  if (dossier_id) {
    const { error } = await supabase
      .from("dossiers")
      .update({ ...reste, forfait_id, saison_id: forfait.saison_id, prix_xof: forfait.prix_xof })
      .eq("id", dossier_id);

    if (error) return { statut: "erreur", message: messagePostgres(error) };

    revalidatePath(`/dossiers/${dossier_id}`);
    return { statut: "ok", message: "Dossier mis à jour.", id: dossier_id };
  }

  const { data, error } = await supabase
    .from("dossiers")
    .insert({
      ...reste,
      agence_id: session.agence.id,
      pelerin_id,
      forfait_id,
      saison_id: forfait.saison_id,
      prix_xof: forfait.prix_xof,
      cree_par: session.utilisateurId,
    })
    .select("id")
    .single();

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/dossiers");
  return { statut: "ok", message: "Dossier ouvert.", id: data.id };
}

/* -------------------------------------------------------------------------- */
/* Pièces justificatives                                                       */
/* -------------------------------------------------------------------------- */

const TYPES: TypeDocument[] = [
  "passeport",
  "photo_identite",
  "carnet_vaccination",
  "acte_naissance",
  "certificat_medical",
  "autorisation_mahram",
  "visa",
  "billet_avion",
  "autre",
];

/**
 * Rattache un fichier déjà téléversé dans le stockage à la pièce du dossier.
 * Le fichier est envoyé depuis le navigateur ; ici on ne fait qu'enregistrer
 * son chemin, après avoir vérifié qu'il appartient bien à l'agence.
 */
export async function rattacherPiece(
  dossierId: string,
  type: string,
  chemin: string,
): Promise<EtatAction> {
  const session = await exigerSession();

  if (!TYPES.includes(type as TypeDocument)) {
    return { statut: "erreur", message: "Type de pièce inconnu." };
  }

  // Le chemin doit commencer par l'identifiant de l'agence : sans ce contrôle,
  // un appel forgé pourrait pointer vers le dossier d'une autre agence.
  if (!chemin.startsWith(`${session.agence.id}/`)) {
    return { statut: "erreur", message: "Chemin de fichier refusé." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("documents").upsert(
    {
      agence_id: session.agence.id,
      dossier_id: dossierId,
      type: type as TypeDocument,
      statut: "fourni",
      chemin_fichier: chemin,
    },
    { onConflict: "dossier_id,type" },
  );

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  return { statut: "ok", message: "Pièce enregistrée." };
}

/* -------------------------------------------------------------------------- */
/* Fin de parcours                                                             */
/* -------------------------------------------------------------------------- */

/** Récapitulatif affiché à la dernière étape. */
export async function resumeInscription(dossierId: string) {
  await exigerSession();
  const supabase = await creerClientServeur();

  const [{ data: finance }, { data: pieces }] = await Promise.all([
    supabase.from("v_dossiers_finance").select("*").eq("dossier_id", dossierId).maybeSingle(),
    supabase.from("documents").select("type, statut").eq("dossier_id", dossierId),
  ]);

  return { finance, pieces: pieces ?? [] };
}
