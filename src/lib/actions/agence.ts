"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession, peut } from "@/lib/session";
import { champsDepuisZod, messagePostgres, texteOptionnel, type EtatAction } from "./commun";

const schemaAgence = z.object({
  nom: z.string().trim().min(2, "Nom obligatoire"),
  numero_agrement: texteOptionnel,
  nif: texteOptionnel,
  telephone: texteOptionnel,
  email: texteOptionnel,
  adresse: texteOptionnel,
  ville: texteOptionnel,
  region: texteOptionnel,
});

export async function modifierAgence(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Seul le propriétaire peut modifier l'agence." };
  }

  const parse = schemaAgence.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return { statut: "erreur", message: "Champs invalides.", champs: champsDepuisZod(parse.error) };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("agences").update(parse.data).eq("id", session.agence.id);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: "Informations enregistrées." };
}

const ROLES = ["proprietaire", "gestionnaire", "agent", "comptable"] as const;

export async function changerRole(profilId: string, role: string): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Action réservée au propriétaire." };
  }
  if (profilId === session.utilisateurId) {
    return { statut: "erreur", message: "Vous ne pouvez pas modifier votre propre rôle." };
  }

  const parse = z.enum(ROLES).safeParse(role);
  if (!parse.success) return { statut: "erreur", message: "Rôle inconnu." };

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ role: parse.data }).eq("id", profilId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: "Rôle mis à jour." };
}

export async function basculerActivation(profilId: string, actif: boolean): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Action réservée au propriétaire." };
  }
  if (profilId === session.utilisateurId) {
    return { statut: "erreur", message: "Vous ne pouvez pas vous désactiver vous-même." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ actif }).eq("id", profilId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: actif ? "Accès rétabli." : "Accès suspendu." };
}
