"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
import {
  champsDepuisZod,
  dateOptionnelle,
  messagePostgres,
  montantXof,
  texteOptionnel,
  type EtatAction,
} from "./commun";

const schemaDossier = z.object({
  pelerin_id: z.uuid("Sélectionnez un pèlerin"),
  forfait_id: z.uuid("Sélectionnez un forfait"),
  groupe_id: texteOptionnel,
  remise_xof: montantXof,
  type_chambre: texteOptionnel,
  notes: texteOptionnel,
});

/**
 * Ouvre un dossier d'inscription. Le prix est repris du forfait côté serveur :
 * il ne vient jamais du formulaire, et reste figé ensuite. Les pièces
 * obligatoires et l'échéance d'acompte sont ajoutées par un déclencheur SQL.
 */
export async function creerDossier(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaDossier.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Certains champs sont invalides.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();

  const { data: forfait, error: erreurForfait } = await supabase
    .from("forfaits")
    .select("id, saison_id, prix_xof, acompte_xof")
    .eq("id", parse.data.forfait_id)
    .single();

  if (erreurForfait || !forfait) {
    return { statut: "erreur", message: "Forfait introuvable." };
  }

  if (parse.data.remise_xof > forfait.prix_xof) {
    return {
      statut: "erreur",
      message: "La remise ne peut pas dépasser le prix du forfait.",
      champs: { remise_xof: "Remise supérieure au prix" },
    };
  }

  const { data: dossier, error } = await supabase
    .from("dossiers")
    .insert({
      agence_id: session.agence.id,
      pelerin_id: parse.data.pelerin_id,
      forfait_id: forfait.id,
      saison_id: forfait.saison_id,
      groupe_id: parse.data.groupe_id,
      prix_xof: forfait.prix_xof,
      remise_xof: parse.data.remise_xof,
      type_chambre: parse.data.type_chambre,
      notes: parse.data.notes,
      cree_par: session.utilisateurId,
    })
    .select("id")
    .single();

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  // Les pièces obligatoires et l'échéance d'acompte sont créées par le
  // déclencheur `trg_init_dossier` côté base.

  revalidatePath("/dossiers");
  revalidatePath("/tableau-de-bord");
  return { statut: "ok", message: "Dossier créé.", id: dossier.id };
}

const STATUTS = [
  "brouillon",
  "preinscrit",
  "confirme",
  "visa_depose",
  "visa_obtenu",
  "parti",
  "revenu",
  "annule",
] as const;

export async function changerStatutDossier(
  dossierId: string,
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  await exigerSession();
  const parse = z
    .object({ statut: z.enum(STATUTS), motif: texteOptionnel })
    .safeParse(Object.fromEntries(formData));
  if (!parse.success) return { statut: "erreur", message: "Statut invalide." };

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("dossiers")
    .update({
      statut: parse.data.statut,
      annule_le: parse.data.statut === "annule" ? new Date().toISOString() : null,
      motif_annulation: parse.data.statut === "annule" ? parse.data.motif : null,
    })
    .eq("id", dossierId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/dossiers");
  return { statut: "ok", message: "Statut mis à jour." };
}

export async function affecterGroupe(
  dossierId: string,
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  await exigerSession();
  const groupeId = String(formData.get("groupe_id") ?? "") || null;
  const chambre = String(formData.get("numero_chambre") ?? "").trim() || null;

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("dossiers")
    .update({ groupe_id: groupeId, numero_chambre: chambre })
    .eq("id", dossierId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/groupes");
  return { statut: "ok", message: "Affectation enregistrée." };
}

const STATUTS_DOC = ["manquant", "fourni", "valide", "refuse", "expire"] as const;

export async function majPieceDossier(
  dossierId: string,
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = z
    .object({
      document_id: z.uuid(),
      statut: z.enum(STATUTS_DOC),
      expire_le: dateOptionnelle,
      note: texteOptionnel,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parse.success) return { statut: "erreur", message: "Pièce invalide." };

  const valide = parse.data.statut === "valide";
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("documents")
    .update({
      statut: parse.data.statut,
      expire_le: parse.data.expire_le,
      note: parse.data.note,
      verifie_le: valide ? new Date().toISOString() : null,
      verifie_par: valide ? session.utilisateurId : null,
    })
    .eq("id", parse.data.document_id)
    .eq("dossier_id", dossierId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  return { statut: "ok", message: "Pièce mise à jour." };
}

export async function ajouterEcheance(
  dossierId: string,
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = z
    .object({
      libelle: z.string().trim().min(1, "Libellé obligatoire"),
      montant_xof: montantXof.pipe(z.number().min(1, "Montant obligatoire")),
      echue_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date obligatoire"),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Échéance invalide.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();
  const { count } = await supabase
    .from("echeances")
    .select("id", { count: "exact", head: true })
    .eq("dossier_id", dossierId);

  const { error } = await supabase.from("echeances").insert({
    ...parse.data,
    agence_id: session.agence.id,
    dossier_id: dossierId,
    rang: (count ?? 0) + 1,
  });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  return { statut: "ok", message: "Échéance ajoutée." };
}

export async function supprimerEcheance(dossierId: string, echeanceId: string): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("echeances")
    .delete()
    .eq("id", echeanceId)
    .eq("dossier_id", dossierId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath(`/dossiers/${dossierId}`);
  return { statut: "ok", message: "Échéance supprimée." };
}
