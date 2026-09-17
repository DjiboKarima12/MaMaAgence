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

/* -------------------------------------------------------------------------- */
/* Saisons                                                                     */
/* -------------------------------------------------------------------------- */

const schemaSaison = z.object({
  libelle: z.string().trim().min(2, "Libellé obligatoire"),
  type: z.enum(["hajj", "omra"]),
  annee_greg: z.coerce.number().int().min(2024).max(2100),
  annee_hijri: z.coerce.number().int().min(1400).max(1600).nullable().catch(null),
  quota: z.coerce.number().int().min(0).nullable().catch(null),
});

export async function creerSaison(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaSaison.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return { statut: "erreur", message: "Saison invalide.", champs: champsDepuisZod(parse.error) };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("saisons")
    .insert({ ...parse.data, agence_id: session.agence.id });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/catalogue");
  return { statut: "ok", message: "Saison créée." };
}

export async function basculerSaison(saisonId: string, ouverte: boolean): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("saisons").update({ ouverte }).eq("id", saisonId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/catalogue");
  return { statut: "ok", message: ouverte ? "Saison ouverte." : "Saison clôturée." };
}

/* -------------------------------------------------------------------------- */
/* Forfaits                                                                    */
/* -------------------------------------------------------------------------- */

const schemaForfait = z.object({
  saison_id: z.uuid("Sélectionnez une saison"),
  nom: z.string().trim().min(2, "Nom obligatoire"),
  type: z.enum(["hajj", "omra"]),
  prix_xof: montantXof.pipe(z.number().min(1, "Prix obligatoire")),
  acompte_xof: montantXof,
  duree_jours: z.coerce.number().int().min(1).max(120).nullable().catch(null),
  hotel_makkah: texteOptionnel,
  hotel_madinah: texteOptionnel,
  distance_haram: texteOptionnel,
  inclusions: texteOptionnel,
});

export async function creerForfait(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaForfait.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return { statut: "erreur", message: "Forfait invalide.", champs: champsDepuisZod(parse.error) };
  }

  const { inclusions, ...reste } = parse.data;
  if (reste.acompte_xof > reste.prix_xof) {
    return {
      statut: "erreur",
      message: "L'acompte ne peut pas dépasser le prix du forfait.",
      champs: { acompte_xof: "Acompte supérieur au prix" },
    };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("forfaits").insert({
    ...reste,
    inclusions: inclusions
      ? inclusions
          .split(/[\n;]+/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [],
    agence_id: session.agence.id,
  });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/catalogue");
  return { statut: "ok", message: "Forfait créé." };
}

export async function basculerForfait(forfaitId: string, actif: boolean): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("forfaits").update({ actif }).eq("id", forfaitId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/catalogue");
  return { statut: "ok", message: actif ? "Forfait activé." : "Forfait désactivé." };
}

/* -------------------------------------------------------------------------- */
/* Groupes de départ                                                           */
/* -------------------------------------------------------------------------- */

const schemaGroupe = z.object({
  saison_id: z.uuid("Sélectionnez une saison"),
  nom: z.string().trim().min(2, "Nom obligatoire"),
  date_depart: dateOptionnelle,
  date_retour: dateOptionnelle,
  compagnie_aerienne: texteOptionnel,
  numero_vol: texteOptionnel,
  capacite: z.coerce.number().int().min(1).max(2000).nullable().catch(null),
  encadrant_nom: texteOptionnel,
  encadrant_telephone: texteOptionnel,
});

export async function creerGroupe(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaGroupe.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return { statut: "erreur", message: "Groupe invalide.", champs: champsDepuisZod(parse.error) };
  }

  const { date_depart, date_retour } = parse.data;
  if (date_depart && date_retour && date_retour < date_depart) {
    return {
      statut: "erreur",
      message: "La date de retour précède la date de départ.",
      champs: { date_retour: "Retour avant le départ" },
    };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("groupes")
    .insert({ ...parse.data, agence_id: session.agence.id });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/groupes");
  return { statut: "ok", message: "Groupe créé." };
}
