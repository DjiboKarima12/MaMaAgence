import { MOIS_VALIDITE_PASSEPORT_REQUISE } from "./niger";

/**
 * Le franc CFA n'a pas de subdivision utilisée : on manipule des entiers
 * et on n'affiche jamais de décimales.
 */
const nfXof = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function xof(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return "—";
  return `${nfXof.format(Math.round(montant))} FCFA`;
}

/** Version compacte pour les tuiles de statistiques : 12,4 M FCFA. */
export function xofCompact(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return "—";
  const abs = Math.abs(montant);
  if (abs >= 1_000_000_000) return `${(montant / 1_000_000_000).toFixed(1).replace(".", ",")} Md FCFA`;
  if (abs >= 1_000_000) return `${(montant / 1_000_000).toFixed(1).replace(".", ",")} M FCFA`;
  if (abs >= 10_000) return `${Math.round(montant / 1000)} k FCFA`;
  return xof(montant);
}

export function nombre(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return nfXof.format(n);
}

const dfCourt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });
const dfLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function dateCourte(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const v = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(v.getTime()) ? "—" : dfCourt.format(v);
}

export function dateLongue(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const v = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(v.getTime()) ? "—" : dfLong.format(v);
}

export function joursRestants(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const v = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(v.getTime())) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.round((v.getTime() - aujourdhui.getTime()) / 86_400_000);
}

export function age(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance) return null;
  const n = new Date(dateNaissance);
  if (Number.isNaN(n.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - n.getFullYear();
  const m = now.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) a--;
  return a;
}

export type AlertePasseport = "aucune" | "bientot" | "insuffisante" | "expire";

/**
 * Le visa saoudien impose un passeport valide 6 mois après l'entrée.
 * On compare donc l'expiration à la date de départ (ou à aujourd'hui à défaut).
 */
export function alertePasseport(
  expireLe: string | null | undefined,
  dateDepart?: string | null,
): AlertePasseport {
  if (!expireLe) return "aucune";
  const exp = new Date(expireLe);
  if (Number.isNaN(exp.getTime())) return "aucune";

  const reference = dateDepart ? new Date(dateDepart) : new Date();
  if (exp <= new Date()) return "expire";

  const minimum = new Date(reference);
  minimum.setMonth(minimum.getMonth() + MOIS_VALIDITE_PASSEPORT_REQUISE);
  if (exp < minimum) return "insuffisante";

  const dansTroisMois = new Date();
  dansTroisMois.setMonth(dansTroisMois.getMonth() + 9);
  if (exp < dansTroisMois) return "bientot";

  return "aucune";
}

/** Normalise un numéro nigérien : 8 chiffres locaux, indicatif +227. */
export function telephone(v: string | null | undefined): string {
  if (!v) return "—";
  const chiffres = v.replace(/\D/g, "");
  const local = chiffres.startsWith("227") ? chiffres.slice(3) : chiffres;
  if (local.length !== 8) return v;
  return `+227 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
}

export function initiales(nom: string, prenom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function pourcentage(partie: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((partie / total) * 100)));
}

/* -------------------------------------------------------------------------- */
/* Montant en toutes lettres — exigé sur les quittances                        */
/* -------------------------------------------------------------------------- */

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const DIZAINES = [
  "", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function sousCent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;

  // 70-79 et 90-99 se construisent sur soixante et quatre-vingt
  if (d === 7 || d === 9) {
    const reste = 10 + u;
    if (d === 7 && u === 1) return "soixante et onze";
    return `${DIZAINES[d]}-${UNITES[reste]}`;
  }
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

function sousMille(n: number): string {
  if (n < 100) return sousCent(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const prefixe = c > 1 ? `${UNITES[c]} ` : "";
  const cent = c > 1 && r === 0 ? "cents" : "cent";
  return r === 0 ? `${prefixe}${cent}` : `${prefixe}${cent} ${sousCent(r)}`;
}

/** « deux millions trois cent mille » — pour les reçus. */
export function enLettres(montant: number): string {
  const n = Math.round(Math.abs(montant));
  if (n === 0) return "zéro";

  const tranches: { valeur: number; singulier: string; pluriel: string }[] = [
    { valeur: 1_000_000_000, singulier: "milliard", pluriel: "milliards" },
    { valeur: 1_000_000, singulier: "million", pluriel: "millions" },
    { valeur: 1_000, singulier: "mille", pluriel: "mille" },
  ];

  let reste = n;
  const morceaux: string[] = [];

  for (const { valeur, singulier, pluriel } of tranches) {
    const quotient = Math.floor(reste / valeur);
    if (quotient === 0) continue;
    reste %= valeur;

    if (valeur === 1_000) {
      morceaux.push(quotient === 1 ? "mille" : `${sousMille(quotient)} mille`);
    } else {
      morceaux.push(`${sousMille(quotient)} ${quotient > 1 ? pluriel : singulier}`);
    }
  }

  if (reste > 0) morceaux.push(sousMille(reste));

  const texte = morceaux.join(" ");
  return montant < 0 ? `moins ${texte}` : texte;
}
