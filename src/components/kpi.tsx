import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Ton } from "@/components/ui";
import { pourcentage } from "@/lib/format";

const TEINTES: Record<Ton, { barre: string; icone: string; texte: string; bordure: string }> = {
  neutre: {
    barre: "bg-ardoise-400",
    icone: "bg-ardoise-100 text-ardoise-600",
    texte: "text-ardoise-600",
    bordure: "border-ardoise-200",
  },
  ok: {
    barre: "bg-marque-600",
    icone: "bg-marque-50 text-marque-700",
    texte: "text-marque-700",
    bordure: "border-ardoise-200",
  },
  attente: {
    barre: "bg-sable-400",
    icone: "bg-sable-50 text-sable-700",
    texte: "text-sable-700",
    bordure: "border-sable-300",
  },
  info: {
    barre: "bg-sky-500",
    icone: "bg-sky-50 text-sky-700",
    texte: "text-sky-700",
    bordure: "border-ardoise-200",
  },
  alerte: {
    barre: "bg-rose-500",
    icone: "bg-rose-50 text-rose-700",
    texte: "text-rose-700",
    bordure: "border-rose-300",
  },
};

/**
 * Indicateur clé : une valeur rapportée à un objectif, avec sa jauge.
 * Le dénominateur donne le sens — 285 pèlerins ne veut rien dire sans le
 * quota de 300 en face.
 */
export function CarteKpi({
  libelle,
  valeur,
  sur,
  detail,
  atteint,
  objectif,
  ton = "ok",
  Icone,
  accentue = false,
}: {
  libelle: string;
  valeur: ReactNode;
  /** Dénominateur affiché à côté de la valeur, ex. « / 300 ». */
  sur?: ReactNode;
  detail?: ReactNode;
  /** Numérateur et dénominateur de la jauge. Omis : pas de jauge. */
  atteint?: number;
  objectif?: number;
  ton?: Ton;
  Icone?: LucideIcon;
  /** Encadre la carte pour la distinguer des autres. */
  accentue?: boolean;
}) {
  const teinte = TEINTES[ton];
  const part =
    atteint !== undefined && objectif !== undefined ? pourcentage(atteint, objectif) : null;

  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        accentue ? `${teinte.bordure} ring-1 ring-inset ${teinte.bordure}` : "border-ardoise-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ardoise-500">{libelle}</p>
        {Icone && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${teinte.icone}`}>
            <Icone className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>

      <p className="tabular mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold leading-none text-ardoise-950">{valeur}</span>
        {sur && <span className="text-sm text-ardoise-400">{sur}</span>}
        {part !== null && (
          <span className={`text-sm font-medium ${teinte.texte}`}>({part}&nbsp;%)</span>
        )}
      </p>

      {detail && <p className="mt-1.5 text-xs leading-relaxed text-ardoise-500">{detail}</p>}

      {part !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ardoise-100">
          <div className={`h-full rounded-full ${teinte.barre}`} style={{ width: `${part}%` }} />
        </div>
      )}
    </div>
  );
}

/** Jauge compacte avec son libellé chiffré, pour les panneaux latéraux. */
export function LigneJauge({
  libelle,
  atteint,
  objectif,
  unite = "",
  ton = "ok",
}: {
  libelle: string;
  atteint: number;
  objectif: number | null;
  unite?: string;
  ton?: Ton;
}) {
  const teinte = TEINTES[ton];
  const part = objectif ? pourcentage(atteint, objectif) : 0;

  return (
    <div className="px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ardoise-700">{libelle}</span>
        <span className={`tabular text-sm font-medium ${teinte.texte}`}>
          {atteint}
          {objectif !== null ? ` / ${objectif}` : ""}
          {unite ? ` ${unite}` : ""}
        </span>
      </div>
      {objectif !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ardoise-100">
          <div className={`h-full rounded-full ${teinte.barre}`} style={{ width: `${part}%` }} />
        </div>
      )}
    </div>
  );
}
