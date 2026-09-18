/**
 * Constantes propres au contexte nigérien.
 */

export const REGIONS_NIGER = [
  "Agadez",
  "Diffa",
  "Dosso",
  "Maradi",
  "Niamey",
  "Tahoua",
  "Tillabéri",
  "Zinder",
] as const;

export type RegionNiger = (typeof REGIONS_NIGER)[number];

/** Points d'embarquement possibles, par code AITA. */
export const AEROPORTS_NIGER = [
  { code: "NIM", ville: "Niamey", nom: "Diori Hamani" },
  { code: "ZND", ville: "Zinder", nom: "Zinder" },
  { code: "AJY", ville: "Agadez", nom: "Mano Dayak" },
  { code: "MFQ", ville: "Maradi", nom: "Maradi" },
  { code: "THZ", ville: "Tahoua", nom: "Tahoua" },
] as const;

export function libelleAeroport(code: string | null | undefined): string {
  if (!code) return "—";
  const a = AEROPORTS_NIGER.find((x) => x.code === code);
  return a ? `${a.ville} (${a.code})` : code;
}

/** Moyens de paiement, libellés et couleur d'affichage. */
export const MOYENS_PAIEMENT = {
  especes: { label: "Espèces", court: "Espèces", besoinReference: false },
  airtel_money: { label: "Airtel Money", court: "Airtel", besoinReference: true },
  moov_money: { label: "Moov Money", court: "Moov", besoinReference: true },
  virement_bancaire: { label: "Virement bancaire", court: "Virement", besoinReference: true },
  cheque: { label: "Chèque", court: "Chèque", besoinReference: true },
  autre: { label: "Autre", court: "Autre", besoinReference: false },
} as const;

export type MoyenPaiement = keyof typeof MOYENS_PAIEMENT;

export const STATUTS_DOSSIER = {
  brouillon: { label: "Brouillon", ton: "neutre" },
  preinscrit: { label: "Pré-inscrit", ton: "attente" },
  confirme: { label: "Confirmé", ton: "ok" },
  visa_depose: { label: "Visa déposé", ton: "info" },
  visa_obtenu: { label: "Visa obtenu", ton: "ok" },
  parti: { label: "Parti", ton: "info" },
  revenu: { label: "Revenu", ton: "neutre" },
  annule: { label: "Annulé", ton: "alerte" },
} as const;

export type StatutDossier = keyof typeof STATUTS_DOSSIER;

/**
 * `obligatoire: true` doit rester aligné sur la liste du déclencheur
 * `initialiser_dossier()` (migration 0001), qui crée la check-list en base.
 */
export const TYPES_DOCUMENT = {
  passeport: { label: "Passeport", obligatoire: true },
  photo_identite: { label: "Photo d'identité", obligatoire: true },
  carnet_vaccination: { label: "Carnet de vaccination", obligatoire: true },
  acte_naissance: { label: "Acte de naissance", obligatoire: true },
  certificat_medical: { label: "Certificat médical", obligatoire: false },
  autorisation_mahram: { label: "Autorisation mahram", obligatoire: false },
  visa: { label: "Visa", obligatoire: false },
  billet_avion: { label: "Billet d'avion", obligatoire: false },
  autre: { label: "Autre pièce", obligatoire: false },
} as const;

export type TypeDocument = keyof typeof TYPES_DOCUMENT;

export const STATUTS_DOCUMENT = {
  manquant: { label: "Manquant", ton: "alerte" },
  fourni: { label: "Fourni", ton: "attente" },
  valide: { label: "Validé", ton: "ok" },
  refuse: { label: "Refusé", ton: "alerte" },
  expire: { label: "Expiré", ton: "alerte" },
} as const;

export const LIENS_MAHRAM = [
  "Époux",
  "Père",
  "Fils",
  "Frère",
  "Oncle paternel",
  "Oncle maternel",
  "Neveu",
  "Grand-père",
  "Petit-fils",
] as const;

export const TYPES_CHAMBRE = ["Double", "Triple", "Quadruple", "Quintuple"] as const;

/**
 * Le visa Hajj/Omra saoudien exige un passeport valable au moins 6 mois
 * après la date d'entrée. On alerte donc bien en amont du départ.
 */
export const MOIS_VALIDITE_PASSEPORT_REQUISE = 6;
