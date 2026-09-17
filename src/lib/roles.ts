import type { UserRole } from "./database.types";

/**
 * Libellés des rôles. La base stocke des valeurs sans accent (`proprietaire`) :
 * elles ne doivent jamais être affichées telles quelles à l'écran.
 */
export const ROLES: Record<UserRole, { label: string; description: string }> = {
  proprietaire: {
    label: "Propriétaire",
    description: "Tous les droits, gère l'équipe et l'agence",
  },
  gestionnaire: {
    label: "Gestionnaire",
    description: "Dossiers, groupes de départ et catalogue",
  },
  comptable: {
    label: "Comptable",
    description: "Encaissements et journal des paiements",
  },
  agent: {
    label: "Agent",
    description: "Saisie des pèlerins et des dossiers",
  },
};

/** Du plus au moins étendu, pour les listes déroulantes. */
export const ORDRE_ROLES: UserRole[] = [
  "proprietaire",
  "gestionnaire",
  "comptable",
  "agent",
];

export function libelleRole(role: UserRole): string {
  return ROLES[role]?.label ?? role;
}
