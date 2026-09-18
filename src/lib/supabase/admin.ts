import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client d'administration, réservé au serveur.
 *
 * Il utilise la clé de service, qui ignore la RLS : elle ne doit jamais
 * atteindre le navigateur. Le seul usage ici est de créer le compte d'un
 * collaborateur à la place du propriétaire — une opération qu'aucune clé
 * publique n'autorise.
 *
 * Renvoie `null` si la clé n'est pas configurée, pour que l'appelant puisse
 * l'expliquer plutôt que de planter.
 */
export function clientAdministrateur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !cle || cle.includes("placeholder")) return null;

  return createClient<Database>(url, cle, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const MESSAGE_CLE_MANQUANTE =
  "La clé de service Supabase n'est pas configurée. Ajoutez SUPABASE_SERVICE_ROLE_KEY " +
  "dans .env.local (dashboard Supabase → Project Settings → API Keys → service_role), " +
  "puis relancez le serveur.";
