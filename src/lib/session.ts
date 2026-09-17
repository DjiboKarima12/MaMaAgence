import { cache } from "react";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import type { Agence, Profil } from "@/lib/database.types";

export interface SessionAgence {
  utilisateurId: string;
  email: string;
  profil: Profil;
  agence: Agence;
}

/**
 * Session de travail : utilisateur authentifié + agence rattachée.
 * `cache` évite de refaire la requête à chaque composant du même rendu.
 */
export const sessionCourante = cache(async (): Promise<SessionAgence | null> => {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profil) return null;

  const { data: agence } = await supabase
    .from("agences")
    .select("*")
    .eq("id", profil.agence_id)
    .maybeSingle();
  if (!agence) return null;

  return { utilisateurId: user.id, email: user.email ?? "", profil, agence };
});

/** À utiliser dans toute page de l'espace de travail. */
export async function exigerSession(): Promise<SessionAgence> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Compte confirmé mais agence pas encore créée (inscription en deux temps).
  const session = await sessionCourante();
  if (!session) redirect("/bienvenue");

  return session;
}

const RANG_ROLES = {
  agent: 1,
  comptable: 2,
  gestionnaire: 3,
  proprietaire: 4,
} as const;

export function peut(
  session: SessionAgence,
  minimum: keyof typeof RANG_ROLES,
): boolean {
  return RANG_ROLES[session.profil.role] >= RANG_ROLES[minimum];
}
