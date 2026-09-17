/**
 * Détection d'une configuration Supabase absente ou factice, et traduction des
 * erreurs d'authentification en messages exploitables par l'utilisateur.
 *
 * Les deux constantes sont lues en littéral : Next.js remplace
 * `process.env.NEXT_PUBLIC_*` par sa valeur au build, y compris dans le bundle
 * envoyé au navigateur. Une lecture dynamique ne serait pas inlinée.
 */
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** `true` seulement si un vrai projet Supabase est renseigné. */
export function supabaseConfigure(): boolean {
  if (!URL_SUPABASE || !CLE_SUPABASE) return false;
  return !URL_SUPABASE.includes("placeholder") && !CLE_SUPABASE.includes("placeholder");
}

export const MESSAGE_NON_CONFIGURE =
  "Supabase n'est pas encore configuré : les identifiants de .env.local sont des valeurs de démonstration. " +
  "Créez un projet sur supabase.com, exécutez supabase/migrations/0001_init.sql, " +
  "puis renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/** Traduit les erreurs remontées par Supabase Auth. */
export function messageErreurAuth(erreur: { message: string }): string {
  if (!supabaseConfigure()) return MESSAGE_NON_CONFIGURE;

  const m = erreur.message;

  // « Failed to fetch » : le navigateur n'a pas pu joindre le serveur du tout.
  if (/failed to fetch|networkerror|fetch failed|load failed|network request failed/i.test(m)) {
    return (
      "Impossible de joindre Supabase. Vérifiez votre connexion internet, " +
      "puis l'adresse NEXT_PUBLIC_SUPABASE_URL dans .env.local."
    );
  }

  if (/invalid login credentials/i.test(m)) return "Adresse e-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(m))
    return "Adresse e-mail non confirmée : ouvrez le message reçu avant de vous connecter.";
  if (/user already registered|already been registered/i.test(m))
    return "Un compte existe déjà avec cette adresse e-mail.";
  if (/unable to validate email|invalid email/i.test(m)) return "Adresse e-mail invalide.";
  if (/password should be at least|at least \d+ characters/i.test(m))
    return "Mot de passe trop court : 8 caractères minimum.";
  if (/rate limit|too many requests/i.test(m))
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";

  // La fonction creer_agence n'existe pas : la migration n'a pas été appliquée.
  if (/could not find the function|function .* does not exist/i.test(m)) {
    return (
      "La base est joignable mais le schéma n'a pas été installé. " +
      "Exécutez supabase/migrations/0001_init.sql dans le SQL Editor de Supabase."
    );
  }

  return m;
}

/** Alias court, utilisé par les formulaires d'accès. */
export const messageAuth = messageErreurAuth;
