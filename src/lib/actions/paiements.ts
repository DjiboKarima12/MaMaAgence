"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
import { MOYENS_PAIEMENT } from "@/lib/niger";
import {
  champsDepuisZod,
  messagePostgres,
  montantXof,
  texteOptionnel,
  type EtatAction,
} from "./commun";

const MOYENS = [
  "especes",
  "airtel_money",
  "moov_money",
  "virement_bancaire",
  "cheque",
  "autre",
] as const;

const schemaPaiement = z.object({
  dossier_id: z.uuid("Dossier introuvable"),
  montant_xof: montantXof.pipe(z.number().min(1, "Le montant doit être supérieur à zéro")),
  moyen: z.enum(MOYENS),
  paye_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date obligatoire"),
  reference_operateur: texteOptionnel,
  note: texteOptionnel,
});

export async function enregistrerPaiement(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  const parse = schemaPaiement.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Certains champs sont invalides.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const { dossier_id, montant_xof, moyen, reference_operateur } = parse.data;

  // Les paiements mobile money et bancaires doivent être traçables.
  if (MOYENS_PAIEMENT[moyen].besoinReference && !reference_operateur) {
    return {
      statut: "erreur",
      message: `Renseignez la référence de la transaction ${MOYENS_PAIEMENT[moyen].label}.`,
      champs: { reference_operateur: "Référence obligatoire" },
    };
  }

  const supabase = await creerClientServeur();

  // Contrôle du solde : on refuse un encaissement qui dépasse le reste dû.
  const { data: finance } = await supabase
    .from("v_dossiers_finance")
    .select("solde_xof, reference")
    .eq("dossier_id", dossier_id)
    .maybeSingle();

  if (!finance) return { statut: "erreur", message: "Dossier introuvable." };

  if (montant_xof > finance.solde_xof) {
    return {
      statut: "erreur",
      message: `Le montant dépasse le solde restant dû (${finance.solde_xof.toLocaleString("fr-FR")} FCFA).`,
      champs: { montant_xof: "Montant supérieur au solde" },
    };
  }

  const { data, error } = await supabase
    .from("paiements")
    .insert({
      ...parse.data,
      agence_id: session.agence.id,
      encaisse_par: session.utilisateurId,
    })
    .select("id, numero_recu")
    .single();

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/paiements");
  revalidatePath("/tableau-de-bord");
  revalidatePath(`/dossiers/${dossier_id}`);
  return { statut: "ok", message: `Reçu ${data.numero_recu} enregistré.`, id: data.id };
}

export async function annulerPaiement(
  paiementId: string,
  dossierId: string,
): Promise<EtatAction> {
  await exigerSession();
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("paiements")
    .update({ statut: "annule" })
    .eq("id", paiementId);

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/paiements");
  revalidatePath(`/dossiers/${dossierId}`);
  return { statut: "ok", message: "Paiement annulé." };
}
