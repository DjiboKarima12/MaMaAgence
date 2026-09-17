import { z } from "zod";

export type EtatAction =
  | { statut: "inactif" }
  | { statut: "ok"; message?: string; id?: string }
  | { statut: "erreur"; message: string; champs?: Record<string, string> };

export const ETAT_INITIAL: EtatAction = { statut: "inactif" };

const brut = z.union([z.string(), z.number(), z.null(), z.undefined()]);

/** Un champ texte vide dans un FormData doit devenir `null`, pas `""`. */
export const texteOptionnel = brut.transform((v) => {
  const t = v === null || v === undefined ? "" : String(v).trim();
  return t === "" ? null : t;
});

export const dateOptionnelle = texteOptionnel.refine(
  (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
  { message: "Date invalide" },
);

/** Montant en FCFA : entier positif, saisi avec ou sans séparateurs de milliers. */
export const montantXof = brut
  .transform((v) => {
    if (v === null || v === undefined || v === "") return 0;
    return Number(String(v).replace(/[\s.  ]/g, "").replace(",", "."));
  })
  .pipe(
    z
      .number({ message: "Montant invalide" })
      .int("Le montant doit être un nombre entier de francs CFA")
      .min(0, "Le montant doit être positif"),
  );

/** Case à cocher d'un FormData : présente et à "on" quand elle est cochée. */
export const caseACocher = brut.transform((v) => v === "on" || v === "true" || v === "1");

export function champsDepuisZod(erreur: z.ZodError): Record<string, string> {
  const champs: Record<string, string> = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.join(".");
    if (cle && !champs[cle]) champs[cle] = issue.message;
  }
  return champs;
}

/** Traduit les erreurs Postgres les plus fréquentes en message métier. */
export function messagePostgres(erreur: { code?: string; message: string }): string {
  switch (erreur.code) {
    case "23505":
      if (erreur.message.includes("pelerins_passeport_unique"))
        return "Un pèlerin avec ce numéro de passeport existe déjà dans votre agence.";
      if (erreur.message.includes("dossiers_pelerin_id_saison_id_key"))
        return "Ce pèlerin a déjà un dossier pour cette saison.";
      if (erreur.message.includes("documents_dossier_id_type_key"))
        return "Cette pièce est déjà enregistrée pour ce dossier.";
      return "Cet enregistrement existe déjà.";
    case "23503":
      return "Référence introuvable : vérifiez la saison, le forfait ou le groupe sélectionné.";
    case "42501":
      return "Vous n'avez pas les droits nécessaires pour cette opération.";
    default:
      return erreur.message;
  }
}
