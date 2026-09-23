import type { UserRole } from "./database.types";

/**
 * Qui voit quoi.
 *
 * Les politiques RLS de la base empêchent déjà les écritures interdites, mais
 * elles laissent tout le monde lire l'ensemble du dossier métier. Ce fichier
 * décide de ce qui est *montré* : un agent de saisie n'a pas à voir le journal
 * des encaissements, et une porte fermée vaut mieux qu'un bouton qui échoue.
 */

export type Section =
  | "tableau-de-bord"
  | "pelerins"
  | "dossiers"
  | "paiements"
  | "groupes"
  | "logistique"
  | "catalogue"
  | "parametres";

/** Sections ouvertes à chaque rôle, dans l'ordre d'affichage du menu. */
export const SECTIONS_PAR_ROLE: Record<UserRole, Section[]> = {
  // Saisit les pèlerins et monte les dossiers. Ne touche ni à l'argent ni au
  // catalogue.
  agent: ["tableau-de-bord", "pelerins", "dossiers"],

  // Encaisse et suit les soldes. N'a pas à créer de pèlerins ni à loger.
  comptable: ["tableau-de-bord", "dossiers", "paiements"],

  // Conduit la campagne de bout en bout, sauf l'agence et l'équipe.
  gestionnaire: [
    "tableau-de-bord",
    "pelerins",
    "dossiers",
    "paiements",
    "groupes",
    "logistique",
    "catalogue",
  ],

  proprietaire: [
    "tableau-de-bord",
    "pelerins",
    "dossiers",
    "paiements",
    "groupes",
    "logistique",
    "catalogue",
    "parametres",
  ],
};

export function peutVoir(role: UserRole, section: Section): boolean {
  return SECTIONS_PAR_ROLE[role].includes(section);
}

/** Page d'atterrissage d'un rôle : la première section qui lui est ouverte. */
export function sectionParDefaut(role: UserRole): Section {
  return SECTIONS_PAR_ROLE[role][0] ?? "tableau-de-bord";
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Ce que chaque rôle peut faire, au-delà de la simple visite d'une section.
 * Sert à masquer les boutons plutôt qu'à laisser l'utilisateur buter sur un
 * refus de la base.
 */
export interface Droits {
  /** Créer et modifier pèlerins, dossiers et pièces. */
  saisir: boolean;
  /** Supprimer un enregistrement. */
  supprimer: boolean;
  /** Enregistrer un versement, annuler un reçu. */
  encaisser: boolean;
  /** Saisons, forfaits, groupes, chambres. */
  gererCatalogue: boolean;
  /** Informations de l'agence et collaborateurs. */
  gererEquipe: boolean;
  /** Voir les montants, soldes et indicateurs financiers. */
  voirFinances: boolean;
}

export const DROITS_PAR_ROLE: Record<UserRole, Droits> = {
  agent: {
    saisir: true,
    supprimer: false,
    encaisser: false,
    gererCatalogue: false,
    gererEquipe: false,
    // L'agent voit le solde du dossier qu'il monte : sans cela il ne peut pas
    // répondre au pèlerin qui lui demande ce qu'il reste à payer.
    voirFinances: true,
  },
  comptable: {
    saisir: false,
    supprimer: false,
    encaisser: true,
    gererCatalogue: false,
    gererEquipe: false,
    voirFinances: true,
  },
  gestionnaire: {
    saisir: true,
    supprimer: true,
    encaisser: true,
    gererCatalogue: true,
    gererEquipe: false,
    voirFinances: true,
  },
  proprietaire: {
    saisir: true,
    supprimer: true,
    encaisser: true,
    gererCatalogue: true,
    gererEquipe: true,
    voirFinances: true,
  },
};

export function droits(role: UserRole): Droits {
  return DROITS_PAR_ROLE[role];
}
