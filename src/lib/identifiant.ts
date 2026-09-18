/**
 * Identifiant de connexion.
 *
 * Exiger une adresse e-mail d'un agent d'agence au Niger, c'est de la friction
 * pour rien : beaucoup n'en ont pas, ou n'y accèdent jamais. Le numéro de
 * téléphone, lui, est universel et mémorisé.
 *
 * Supabase Auth par téléphone impose un fournisseur SMS — un coût et une
 * dépendance de plus. On contourne : le numéro est transformé en adresse
 * technique qui sert de clé de connexion. Cette adresse ne reçoit jamais de
 * courrier, elle n'existe que pour identifier le compte.
 */

/** Domaine des adresses techniques. Aucun message n'y est jamais envoyé. */
const DOMAINE_TECHNIQUE = "tel.mamaagence.app";

/**
 * Ramène un numéro nigérien à ses huit chiffres locaux.
 * Accepte « 96 45 12 78 », « +227 96451278 », « 0022796451278 ».
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/\D/g, "");

  let local = chiffres;
  if (local.startsWith("00227")) local = local.slice(5);
  else if (local.startsWith("227") && local.length > 8) local = local.slice(3);

  return local.length === 8 ? local : null;
}

/** Adresse technique associée à un numéro déjà normalisé. */
export function emailTechnique(localHuitChiffres: string): string {
  return `ne${localHuitChiffres}@${DOMAINE_TECHNIQUE}`;
}

/** `true` si l'adresse est une adresse technique, donc non consultable. */
export function estEmailTechnique(email: string | null | undefined): boolean {
  return Boolean(email?.endsWith(`@${DOMAINE_TECHNIQUE}`));
}

/**
 * Traduit ce que l'utilisateur tape dans le champ « identifiant » en adresse
 * utilisable par Supabase : une adresse e-mail passe telle quelle, un numéro
 * devient son adresse technique.
 */
export function identifiantVersEmail(saisie: string): string | null {
  const valeur = saisie.trim();
  if (valeur.includes("@")) return valeur;

  const local = normaliserTelephone(valeur);
  return local ? emailTechnique(local) : null;
}

/** Forme affichable : le numéro plutôt que l'adresse technique. */
export function identifiantLisible(email: string | null | undefined): string {
  if (!email) return "—";
  if (!estEmailTechnique(email)) return email;

  const local = email.split("@")[0].replace(/^ne/, "");
  if (local.length !== 8) return email;
  return `+227 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
}
