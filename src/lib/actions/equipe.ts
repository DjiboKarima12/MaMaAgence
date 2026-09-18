"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";
import { clientAdministrateur, MESSAGE_CLE_MANQUANTE } from "@/lib/supabase/admin";
import { exigerSession, peut } from "@/lib/session";
import { normaliserTelephone } from "@/lib/identifiant";
import {
  champsDepuisZod,
  messagePostgres,
  texteOptionnel,
  type EtatAction,
} from "./commun";
import type { Invitation } from "@/lib/database.types";

const ROLES = ["proprietaire", "gestionnaire", "comptable", "agent"] as const;

const schemaCollaborateur = z.object({
  nom_complet: z.string().trim().min(2, "Le nom est obligatoire"),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide")),
  telephone: texteOptionnel,
  role: z.enum(ROLES),
  jours: z.coerce.number().int().min(1).max(365).catch(30),
});

/**
 * Crée le compte du collaborateur et lui attribue son rôle.
 *
 * Le code d'invitation sert de mot de passe d'entrée : la personne se connecte
 * avec son e-mail et ce code, puis choisit son propre mot de passe. Créer un
 * compte au nom d'autrui exige la clé de service, d'où le client
 * d'administration — le reste passe par la session du propriétaire, pour que
 * les contrôles de rôle en base s'appliquent.
 */
export async function creerCompteCollaborateur(
  _etat: EtatAction,
  formData: FormData,
): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Seul le propriétaire peut ajouter un collaborateur." };
  }

  const parse = schemaCollaborateur.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    return {
      statut: "erreur",
      message: "Vérifiez les champs signalés.",
      champs: champsDepuisZod(parse.error),
    };
  }

  const admin = clientAdministrateur();
  if (!admin) return { statut: "erreur", message: MESSAGE_CLE_MANQUANTE };

  const { nom_complet, email, role, jours } = parse.data;
  const local = parse.data.telephone ? normaliserTelephone(parse.data.telephone) : null;
  const telephone = local ? `+227${local}` : parse.data.telephone;

  const supabase = await creerClientServeur();

  // 1. Le code, créé sous l'identité du propriétaire : la base revérifie son rôle.
  const { data: invitationBrute, error: erreurCode } = await supabase.rpc("creer_invitation", {
    p_role: role,
    p_nom_prevu: nom_complet,
    p_jours: jours,
    p_email: email,
    p_telephone: telephone,
  });

  if (erreurCode) {
    return {
      statut: "erreur",
      message: erreurCode.message.includes("invitations_email_actif")
        ? "Une invitation est déjà en attente pour cette adresse."
        : messagePostgres(erreurCode),
    };
  }

  const invitation = invitationBrute as unknown as Invitation;

  // 2. Le compte, avec l'adresse déjà confirmée : la personne entre sans
  //    attendre de courrier.
  const { data: compte, error: erreurCompte } = await admin.auth.admin.createUser({
    email,
    password: invitation.code,
    email_confirm: true,
    user_metadata: { nom_complet, telephone },
  });

  if (erreurCompte || !compte?.user) {
    // Sans compte, l'invitation n'a plus d'objet : on la retire.
    await supabase.from("invitations").delete().eq("id", invitation.id);

    return {
      statut: "erreur",
      message: /already been registered|already exists/i.test(erreurCompte?.message ?? "")
        ? "Cette adresse e-mail a déjà un compte. Demandez à la personne de se connecter, ou utilisez une autre adresse."
        : (erreurCompte?.message ?? "Création du compte impossible."),
    };
  }

  // 3. Le profil, qui rattache le compte à l'agence avec son rôle.
  const { error: erreurProfil } = await admin.from("profils").insert({
    id: compte.user.id,
    agence_id: session.agence.id,
    nom_complet,
    telephone,
    role,
  });

  if (erreurProfil) {
    await admin.auth.admin.deleteUser(compte.user.id);
    await supabase.from("invitations").delete().eq("id", invitation.id);
    return { statut: "erreur", message: messagePostgres(erreurProfil) };
  }

  await supabase.rpc("marquer_invitation_utilisee", {
    p_invitation: invitation.id,
    p_utilisateur: compte.user.id,
  });

  revalidatePath("/parametres");
  return {
    statut: "ok",
    message: `Compte créé pour ${nom_complet}.`,
    id: invitation.code,
  };
}

/** Retire un collaborateur de l'agence, sans supprimer son compte. */
export async function retirerCollaborateur(profilId: string): Promise<EtatAction> {
  const session = await exigerSession();
  if (!peut(session, "proprietaire")) {
    return { statut: "erreur", message: "Action réservée au propriétaire." };
  }
  if (profilId === session.utilisateurId) {
    return { statut: "erreur", message: "Vous ne pouvez pas vous retirer vous-même." };
  }

  const admin = clientAdministrateur();
  if (!admin) return { statut: "erreur", message: MESSAGE_CLE_MANQUANTE };

  // On vérifie l'appartenance avant d'agir avec la clé de service, qui ignore
  // la RLS : sans ce contrôle, un identifiant forgé toucherait une autre agence.
  const { data: profil } = await supabase_profil(profilId);
  if (!profil || profil.agence_id !== session.agence.id) {
    return { statut: "erreur", message: "Collaborateur introuvable." };
  }

  const { error } = await admin.from("profils").delete().eq("id", profilId);
  if (error) return { statut: "erreur", message: messagePostgres(error) };

  revalidatePath("/parametres");
  return { statut: "ok", message: "Collaborateur retiré de l'agence." };
}

async function supabase_profil(id: string) {
  const supabase = await creerClientServeur();
  return supabase.from("profils").select("id, agence_id").eq("id", id).maybeSingle();
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
  return { statut: "ok", message: "Invitation supprimée." };
}
