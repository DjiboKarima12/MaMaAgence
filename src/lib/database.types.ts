/**
 * Types de la base. Écrits à la main pour rester lisibles ; ils peuvent être
 * régénérés avec `npx supabase gen types typescript --project-id <ref>`.
 */

export type UserRole = "proprietaire" | "gestionnaire" | "agent" | "comptable";
export type Sexe = "M" | "F";
export type TypePelerinage = "hajj" | "omra";
export type StatutDossier =
  | "brouillon"
  | "preinscrit"
  | "confirme"
  | "visa_depose"
  | "visa_obtenu"
  | "parti"
  | "revenu"
  | "annule";
export type TypeDocument =
  | "passeport"
  | "photo_identite"
  | "carnet_vaccination"
  | "acte_naissance"
  | "certificat_medical"
  | "visa"
  | "billet_avion"
  | "autorisation_mahram"
  | "autre";
export type StatutDocument = "manquant" | "fourni" | "valide" | "refuse" | "expire";
export type MoyenPaiement =
  | "especes"
  | "airtel_money"
  | "moov_money"
  | "virement_bancaire"
  | "cheque"
  | "autre";
export type VilleSejour = "makkah" | "madinah";
export type OccupationChambre = "hommes" | "femmes" | "famille";
export type StatutPaiement = "en_attente" | "confirme" | "annule";

export type Agence = {
  id: string;
  nom: string;
  slug: string;
  numero_agrement: string | null;
  nif: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  region: string | null;
  logo_url: string | null;
  devise: string;
  actif: boolean;
  cree_le: string;
}

export type Profil = {
  id: string;
  agence_id: string;
  nom_complet: string;
  telephone: string | null;
  role: UserRole;
  actif: boolean;
  cree_le: string;
}

export type Saison = {
  id: string;
  agence_id: string;
  libelle: string;
  type: TypePelerinage;
  annee_hijri: number | null;
  annee_greg: number;
  quota: number | null;
  ouverte: boolean;
  cree_le: string;
}

export type Forfait = {
  id: string;
  agence_id: string;
  saison_id: string;
  nom: string;
  type: TypePelerinage;
  prix_xof: number;
  acompte_xof: number;
  duree_jours: number | null;
  hotel_makkah: string | null;
  hotel_madinah: string | null;
  distance_haram: string | null;
  inclusions: string[];
  actif: boolean;
  cree_le: string;
}

export type Groupe = {
  id: string;
  agence_id: string;
  saison_id: string;
  nom: string;
  date_depart: string | null;
  date_retour: string | null;
  compagnie_aerienne: string | null;
  numero_vol: string | null;
  aeroport_depart: string | null;
  capacite: number | null;
  encadrant_nom: string | null;
  encadrant_telephone: string | null;
  cree_le: string;
}

export type Pelerin = {
  id: string;
  agence_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string;
  nin: string | null;
  telephone: string | null;
  telephone_secondaire: string | null;
  email: string | null;
  region: string | null;
  ville: string | null;
  adresse: string | null;
  profession: string | null;
  passeport_numero: string | null;
  passeport_delivre_le: string | null;
  passeport_expire_le: string | null;
  passeport_lieu: string | null;
  contact_urgence_nom: string | null;
  contact_urgence_tel: string | null;
  contact_urgence_lien: string | null;
  mahram_pelerin_id: string | null;
  mahram_lien: string | null;
  deja_effectue_hajj: boolean;
  groupe_sanguin: string | null;
  antecedents_medicaux: string | null;
  photo_url: string | null;
  notes: string | null;
  cree_par: string | null;
  cree_le: string;
  maj_le: string;
}

export type Dossier = {
  id: string;
  agence_id: string;
  reference: string;
  pelerin_id: string;
  saison_id: string;
  forfait_id: string;
  groupe_id: string | null;
  statut: StatutDossier;
  prix_xof: number;
  remise_xof: number;
  type_chambre: string | null;
  numero_chambre: string | null;
  aeroport_prefere: string | null;
  chambre_makkah_id: string | null;
  chambre_madinah_id: string | null;
  inscrit_le: string;
  annule_le: string | null;
  motif_annulation: string | null;
  notes: string | null;
  cree_par: string | null;
  cree_le: string;
  maj_le: string;
}

export type DocumentDossier = {
  id: string;
  agence_id: string;
  dossier_id: string;
  type: TypeDocument;
  statut: StatutDocument;
  chemin_fichier: string | null;
  expire_le: string | null;
  verifie_le: string | null;
  verifie_par: string | null;
  note: string | null;
  cree_le: string;
}

export type Echeance = {
  id: string;
  agence_id: string;
  dossier_id: string;
  libelle: string;
  montant_xof: number;
  echue_le: string;
  rang: number;
  cree_le: string;
}

export type Paiement = {
  id: string;
  agence_id: string;
  dossier_id: string;
  numero_recu: string;
  montant_xof: number;
  moyen: MoyenPaiement;
  statut: StatutPaiement;
  paye_le: string;
  reference_operateur: string | null;
  encaisse_par: string | null;
  note: string | null;
  cree_le: string;
}

export type Invitation = {
  id: string;
  agence_id: string;
  code: string;
  role: UserRole;
  nom_prevu: string | null;
  email: string | null;
  telephone_prevu: string | null;
  cree_par: string | null;
  expire_le: string;
  utilise_le: string | null;
  utilise_par: string | null;
  cree_le: string;
};

export type Chambre = {
  id: string;
  agence_id: string;
  groupe_id: string;
  ville: VilleSejour;
  hotel: string | null;
  etage: string | null;
  numero: string;
  capacite: number;
  occupation: OccupationChambre;
  notes: string | null;
  cree_le: string;
};

/** Vue v_chambres_occupation : la chambre et son remplissage. */
export type ChambreOccupation = Chambre & {
  occupants: number;
  lits_libres: number;
};

/** Vue v_dossiers_finance : dossier + pèlerin + solde, en une ligne. */
export type DossierFinance = {
  dossier_id: string;
  agence_id: string;
  reference: string;
  statut: StatutDossier;
  saison_id: string;
  groupe_id: string | null;
  inscrit_le: string;
  pelerin_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  telephone: string | null;
  passeport_numero: string | null;
  passeport_expire_le: string | null;
  forfait_nom: string;
  type_pelerinage: TypePelerinage;
  acompte_xof: number;
  net_xof: number;
  regle_xof: number;
  solde_xof: number;
  prochaine_echeance: string | null;
  pieces_valides: number;
  pieces_total: number;
}

/* -------------------------------------------------------------------------- */
/* Forme attendue par supabase-js                                              */
/* -------------------------------------------------------------------------- */

/**
 * Relation vers une table parente. postgrest-js s'en sert pour typer les
 * sélections imbriquées du style `select("*, dossiers(reference)")`.
 */
type VersUn<Colonne extends string, Cible extends string> = {
  foreignKeyName: `fk_${Colonne}_${Cible}`;
  columns: [Colonne];
  isOneToOne: false;
  referencedRelation: Cible;
  referencedColumns: ["id"];
};

type Table<R, Rel extends readonly unknown[] = []> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: Rel;
};

export type Database = {
  public: {
    Tables: {
      agences: Table<Agence>;
      profils: Table<Profil, [VersUn<"agence_id", "agences">]>;
      saisons: Table<Saison, [VersUn<"agence_id", "agences">]>;
      forfaits: Table<
        Forfait,
        [VersUn<"agence_id", "agences">, VersUn<"saison_id", "saisons">]
      >;
      groupes: Table<
        Groupe,
        [VersUn<"agence_id", "agences">, VersUn<"saison_id", "saisons">]
      >;
      pelerins: Table<
        Pelerin,
        [VersUn<"agence_id", "agences">, VersUn<"mahram_pelerin_id", "pelerins">]
      >;
      dossiers: Table<
        Dossier,
        [
          VersUn<"agence_id", "agences">,
          VersUn<"pelerin_id", "pelerins">,
          VersUn<"saison_id", "saisons">,
          VersUn<"forfait_id", "forfaits">,
          VersUn<"groupe_id", "groupes">,
        ]
      >;
      documents: Table<
        DocumentDossier,
        [VersUn<"agence_id", "agences">, VersUn<"dossier_id", "dossiers">]
      >;
      echeances: Table<
        Echeance,
        [VersUn<"agence_id", "agences">, VersUn<"dossier_id", "dossiers">]
      >;
      paiements: Table<
        Paiement,
        [VersUn<"agence_id", "agences">, VersUn<"dossier_id", "dossiers">]
      >;
      chambres: Table<
        Chambre,
        [VersUn<"agence_id", "agences">, VersUn<"groupe_id", "groupes">]
      >;
      invitations: Table<Invitation, [VersUn<"agence_id", "agences">]>;
    };
    Views: {
      v_dossiers_finance: {
        Row: DossierFinance;
        Relationships: [];
      };
      v_chambres_occupation: {
        Row: ChambreOccupation;
        Relationships: [];
      };
    };
    Functions: {
      creer_agence: {
        Args: {
          p_nom_agence: string;
          p_nom_complet: string;
          p_telephone?: string | null;
          p_ville?: string | null;
        };
        Returns: string;
      };
      agence_courante: { Args: Record<string, never>; Returns: string };
      creer_invitation: {
        Args: {
          p_role: UserRole;
          p_nom_prevu?: string | null;
          p_jours?: number;
          p_email?: string | null;
          p_telephone?: string | null;
        };
        Returns: Invitation;
      };
      marquer_invitation_utilisee: {
        Args: { p_invitation: string; p_utilisateur: string };
        Returns: undefined;
      };
      rejoindre_agence: {
        Args: { p_code: string; p_nom_complet: string; p_telephone?: string | null };
        Returns: string;
      };
      creer_chambres_en_serie: {
        Args: {
          p_groupe: string;
          p_ville: VilleSejour;
          p_hotel?: string | null;
          p_etage?: string | null;
          p_numero_depart: number;
          p_nombre: number;
          p_capacite: number;
          p_occupation: OccupationChambre;
        };
        Returns: number;
      };
      role_courant: { Args: Record<string, never>; Returns: UserRole };
    };
    Enums: {
      user_role: UserRole;
      sexe: Sexe;
      type_pelerinage: TypePelerinage;
      statut_dossier: StatutDossier;
      type_document: TypeDocument;
      statut_document: StatutDocument;
      moyen_paiement: MoyenPaiement;
      statut_paiement: StatutPaiement;
      ville_sejour: VilleSejour;
      occupation_chambre: OccupationChambre;
    };
    CompositeTypes: Record<string, never>;
  };
};
