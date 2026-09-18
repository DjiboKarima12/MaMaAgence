/**
 * Lecture de la bande MRZ d'un passeport (format TD3 : deux lignes de 44
 * caractères, au bas de la page d'identité).
 *
 * Ce n'est pas de la reconnaissance optique : l'agent colle ou saisit les deux
 * lignes, et l'on en extrait les champs. Les clés de contrôle permettent de
 * détecter une faute de frappe avant d'enregistrer un passeport erroné — une
 * erreur d'un chiffre bloque un visa.
 */

export interface DonneesMrz {
  passeport_numero: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F" | null;
  date_naissance: string | null;
  passeport_expire_le: string | null;
  nationalite_code: string;
  /** Clés de contrôle qui ne tombent pas juste : champs à revérifier. */
  incoherences: string[];
}

const POIDS = [7, 3, 1];

/** Clé de contrôle OACI : pondération 7-3-1 sur les valeurs des caractères. */
function cleControle(valeur: string): number {
  let somme = 0;
  for (let i = 0; i < valeur.length; i++) {
    const c = valeur[i];
    let v: number;
    if (c >= "0" && c <= "9") v = c.charCodeAt(0) - 48;
    else if (c >= "A" && c <= "Z") v = c.charCodeAt(0) - 55;
    else v = 0; // '<' et tout le reste
    somme += v * POIDS[i % 3];
  }
  return somme % 10;
}

/**
 * Les dates MRZ tiennent sur deux chiffres d'année. Une date de naissance est
 * forcément passée ; une date d'expiration est proche du présent. On tranche
 * avec une fenêtre plutôt qu'un siècle fixe.
 */
function versDate(aammjj: string, genre: "naissance" | "expiration"): string | null {
  if (!/^\d{6}$/.test(aammjj)) return null;

  const aa = Number(aammjj.slice(0, 2));
  const mm = Number(aammjj.slice(2, 4));
  const jj = Number(aammjj.slice(4, 6));
  if (mm < 1 || mm > 12 || jj < 1 || jj > 31) return null;

  const anneeCourante = new Date().getFullYear();

  // Deux chiffres d'année : on choisit le siècle qui donne une date plausible.
  let annee = 2000 + aa;
  if (genre === "naissance") {
    // Une naissance ne peut pas être dans le futur.
    if (annee > anneeCourante) annee = 1900 + aa;
  } else {
    // Un passeport est valide dix ans au plus ; au-delà, c'est le siècle
    // précédent — un document déjà expiré, cas que l'agence saisit souvent.
    if (annee > anneeCourante + 15) annee = 1900 + aa;
  }
  const d = new Date(Date.UTC(annee, mm - 1, jj));
  if (d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== jj) return null;

  return `${annee}-${String(mm).padStart(2, "0")}-${String(jj).padStart(2, "0")}`;
}

function nettoyer(ligne: string): string {
  return ligne
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[«»]/g, "<")
    .replace(/[^A-Z0-9<]/g, "");
}

/**
 * Analyse une bande MRZ collée telle quelle. Renvoie `null` si le texte ne
 * ressemble pas à un TD3.
 */
export function lireMrz(texte: string): DonneesMrz | null {
  const lignes = texte
    .split(/[\r\n]+/)
    .map(nettoyer)
    .filter((l) => l.length >= 30);

  if (lignes.length < 2) return null;

  // On tolère un léger écart de longueur : certains scans perdent un caractère.
  const l1 = lignes[0].padEnd(44, "<").slice(0, 44);
  const l2 = lignes[1].padEnd(44, "<").slice(0, 44);

  if (!l1.startsWith("P")) return null;

  const incoherences: string[] = [];

  /* Ligne 1 : type, pays émetteur, puis NOM<<PRENOMS */
  const nationalite_code = l1.slice(2, 5).replace(/</g, "");
  const noms = l1.slice(5).split("<<");
  const nom = (noms[0] ?? "").replace(/</g, " ").trim();
  const prenom = (noms[1] ?? "").replace(/</g, " ").trim();

  /* Ligne 2 : numéro, clés, nationalité, naissance, sexe, expiration */
  const numeroBrut = l2.slice(0, 9);
  const cleNumero = l2.slice(9, 10);
  const naissanceBrute = l2.slice(13, 19);
  const cleNaissance = l2.slice(19, 20);
  const sexeBrut = l2.slice(20, 21);
  const expirationBrute = l2.slice(21, 27);
  const cleExpiration = l2.slice(27, 28);

  if (/^\d$/.test(cleNumero) && cleControle(numeroBrut) !== Number(cleNumero)) {
    incoherences.push("numéro de passeport");
  }
  if (/^\d$/.test(cleNaissance) && cleControle(naissanceBrute) !== Number(cleNaissance)) {
    incoherences.push("date de naissance");
  }
  if (/^\d$/.test(cleExpiration) && cleControle(expirationBrute) !== Number(cleExpiration)) {
    incoherences.push("date d'expiration");
  }

  const passeport_numero = numeroBrut.replace(/</g, "").trim();
  if (!passeport_numero) return null;

  return {
    passeport_numero,
    nom,
    prenom,
    sexe: sexeBrut === "M" ? "M" : sexeBrut === "F" ? "F" : null,
    date_naissance: versDate(naissanceBrute, "naissance"),
    passeport_expire_le: versDate(expirationBrute, "expiration"),
    nationalite_code,
    incoherences,
  };
}
