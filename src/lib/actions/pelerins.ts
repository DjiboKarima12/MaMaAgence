"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
import {
  caseACocher,
  champsDepuisZod,
  dateOptionnelle,
  messagePostgres,
  texteOptionnel,
  type EtatAction,
} from "./commun";

const schemaPelerin = z.object({
  nom: z.string().trim().min(2, "Le nom est obligatoire"),
  prenom: z.string().trim().min(2, "Le prénom est obligatoire"),
  sexe: z.enum(["M", "F"]),
  date_naissance: dateOptionnelle,
  lieu_naissance: texteOptionnel,
  nin: texteOptionnel,
  telephone: texteOptionnel,
  telephone_secondaire: texteOptionnel,
  email: texteOptionnel,
  region: texteOptionnel,
  ville: texteOptionnel,
  adresse: texteOptionnel,
  profession: texteOptionnel,
  passeport_numero: texteOptionnel,
  passeport_delivre_le: dateOptionnelle,
  passeport_expire_le: dateOptionnelle,
  passeport_lieu: texteOptionnel,
  contact_urgence_nom: texteOptionnel,
  contact_urgence_tel: texteOptionnel,
  contact_urgence_lien: texteOptionnel,
  mahram_pelerin_id: texteOptionnel,
  mahram_lien: texteOptionnel,
  groupe_sanguin: texteOptionnel,
  antecedents_medicaux: texteOptionnel,
  notes: texteOptionnel,
  deja_effectue_hajj: caseACocher,
});

function lire(formData: FormData) {
  return schemaPelerin.safeParse(Object.fromEntries(formData));
}

export async function creerPelerin(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = lire(formData);
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Certains champs sont invalides.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("pelerins")
    .insert({
      ...parse.data,
      agence_id: session.agence.id,
      cree_par: session.utilisateurId,
    })
    .select("id")
    .single();

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/pelerins");
  return { statut: "ok", message: "Pèlerin enregistré.", id: data.id };
}

export async function modifierPelerin(
  pelerinId: string,
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  await exigerSession();
  const parse = lire(formData);
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Certains champs sont invalides.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("pelerins").update(parse.data).eq("id", pelerinId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/pelerins");
  revalidatePath(`/pelerins/${pelerinId}`);
  return { statut: "ok", message: "Fiche mise à jour.", id: pelerinId };
}

export async function supprimerPelerin(pelerinId: string): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();

  const { count } = await supabase
    .from("dossiers")
    .select("id", { count: "exact", head: true })
    .eq("pelerin_id", pelerinId);

  if (count && count > 0) {
    return {
      statut: "erreur",
      message: "Ce pèlerin a des dossiers d'inscription : annulez-les avant de le supprimer.",
    };
  }

  const { error } = await supabase.from("pelerins").delete().eq("id", pelerinId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/pelerins");
  return { statut: "ok", message: "Pèlerin supprimé." };
}
