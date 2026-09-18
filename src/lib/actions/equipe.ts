"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession, peut } from "@/lib/session";
import { champsDepuisZod, messagePostgres, texteOptionnel, type EtatAction } from "./commun";

const ROLES = ["proprietaire", "gestionnaire", "comptable", "agent"] as const;

const schemaInvitation = z.object({
  role: z.enum(ROLES),
  nom_prevu: texteOptionnel,
  jours: z.coerce.number().int().min(1).max(90).catch(14),
});

/**
 * Génère un code d'invitation. Pas d'envoi d'e-mail : le code se transmet de
 * vive voix, par SMS ou par WhatsApp, ce qui évite de dépendre d'une
 * distribution de courrier qui arrive mal.
 */
export async function genererInvitation(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Seul le propriétaire peut inviter un collaborateur." };
  }

  const parse = schemaInvitation.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Vérifiez les champs signalés.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("creer_invitation", {
    p_role: parse.data.role,
    p_nom_prevu: parse.data.nom_prevu,
    p_jours: parse.data.jours,
  });

  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: String(data), id: String(data) };
}

export async function revoquerInvitation(invitationId: string): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Action réservée au propriétaire." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("invitations").delete().eq("id", invitationId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: "Invitation annulée." };
}
