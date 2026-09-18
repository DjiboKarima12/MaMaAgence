"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BedDoubleIcon,
  BuildingIcon,
  DownloadIcon,
  PlusIcon,
  PrinterIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import {
  Badge,
  Bouton,
  Carte,
  Champ,
  EnTetePage,
  Erreur,
  EtatVide,
  Saisie,
  Selection,
  Succes,
  Tuile,
} from "@/components/ui";
import { initiales, nombre } from "@/lib/format";
import { affecterChambre, creerChambresEnSerie, supprimerChambre, viderChambre } from "@/lib/actions/chambres";
import { ETAT_INITIAL } from "@/lib/actions/commun";
import type { ChambreOccupation, OccupationChambre, VilleSejour } from "@/lib/database.types";

export interface OccupantBrut {
  dossierId: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F";
  matricule: string;
  telephone: string | null;
  chambreId: string | null;
}

const OCCUPATIONS: Record<OccupationChambre, { label: string; ton: "info" | "attente" | "neutre" }> = {
  hommes: { label: "Hommes", ton: "info" },
  femmes: { label: "Femmes", ton: "attente" },
  famille: { label: "Famille", ton: "neutre" },
};

const NOMS_CAPACITE: Record<number, string> = {
  1: "Individuelle",
  2: "Double",
  3: "Triple",
  4: "Quadruple",
  5: "Quintuple",
  6: "Sextuple",
};

/** Une chambre « hommes » ne peut pas accueillir une pèlerine, et vice versa. */
function compatible(occupation: OccupationChambre, sexe: "M" | "F"): boolean {
  if (occupation === "famille") return true;
  return occupation === "hommes" ? sexe === "M" : sexe === "F";
}

export function MatriceChambres({
  groupes,
  groupeId,
  groupeNom,
  ville,
  chambres,
  occupants,
  etageFiltre,
  capaciteFiltre,
}: {
  groupes: { id: string; nom: string }[];
  groupeId: string;
  groupeNom: string;
  ville: VilleSejour;
  chambres: ChambreOccupation[];
  occupants: OccupantBrut[];
  etageFiltre: string;
  capaciteFiltre: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const [etatSerie, envoyerSerie, serieEnCours] = useActionState(
    creerChambresEnSerie,
    ETAT_INITIAL,
  );

  /* ------------------------------------------------------------------ */
  /* Répartition                                                         */
  /* ------------------------------------------------------------------ */
  const parChambre = useMemo(() => {
    const m = new Map<string, OccupantBrut[]>();
    for (const o of occupants) {
      if (!o.chambreId) continue;
      const l = m.get(o.chambreId) ?? [];
      l.push(o);
      m.set(o.chambreId, l);
    }
    return m;
  }, [occupants]);

  const nonAffectes = useMemo(
    () =>
      occupants
        .filter((o) => !o.chambreId)
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [occupants],
  );

  const etages = useMemo(
    () => [...new Set(chambres.map((c) => c.etage).filter(Boolean))].sort() as string[],
    [chambres],
  );

  const hotels = useMemo(
    () => [...new Set(chambres.map((c) => c.hotel).filter(Boolean))] as string[],
    [chambres],
  );

  const visibles = useMemo(
    () =>
      chambres.filter(
        (c) =>
          (!etageFiltre || c.etage === etageFiltre) &&
          (!capaciteFiltre || String(c.capacite) === capaciteFiltre),
      ),
    [chambres, etageFiltre, capaciteFiltre],
  );

  const litsTotal = chambres.reduce((s, c) => s + c.capacite, 0);
  const litsOccupes = chambres.reduce((s, c) => s + c.occupants, 0);

  /* ------------------------------------------------------------------ */
  /* Navigation par URL                                                  */
  /* ------------------------------------------------------------------ */
  function naviguer(modif: Record<string, string>) {
    const p = new URLSearchParams({
      groupe: groupeId,
      ville,
      ...(etageFiltre ? { etage: etageFiltre } : {}),
      ...(capaciteFiltre ? { capacite: capaciteFiltre } : {}),
      ...modif,
    });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    router.replace(`/logistique?${p.toString()}`);
  }

  function agir(action: () => Promise<{ statut: string; message?: string }>) {
    setErreur(null);
    demarrer(async () => {
      const r = await action();
      if (r.statut === "erreur") setErreur(r.message ?? "Opération refusée.");
      router.refresh();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */
  function exporterCsv() {
    const lignes = [
      ["Ville", "Hotel", "Etage", "Chambre", "Occupation", "Capacite", "Lit", "Matricule", "Nom", "Prenom", "Sexe", "Telephone"],
    ];

    for (const c of chambres) {
      const gens = parChambre.get(c.id) ?? [];
      for (let i = 0; i < c.capacite; i++) {
        const o = gens[i];
        lignes.push([
          ville === "makkah" ? "Makkah" : "Madinah",
          c.hotel ?? "",
          c.etage ?? "",
          c.numero,
          OCCUPATIONS[c.occupation].label,
          String(c.capacite),
          String(i + 1),
          o?.matricule ?? "",
          o?.nom ?? "",
          o?.prenom ?? "",
          o ? (o.sexe === "F" ? "F" : "M") : "",
          o?.telephone ?? "",
        ]);
      }
    }

    // Séparateur point-virgule et BOM : Excel en configuration française ouvre
    // le fichier directement, sans assistant d'importation.
    const csv = "﻿" + lignes.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rooming-${groupeNom.replace(/\s+/g, "-")}-${ville}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const champ =
    "block rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 focus:ring-2 focus:ring-inset focus:ring-marque-500";

  return (
    <>
      <EnTetePage
        titre="Hébergement"
        description={
          hotels.length === 1
            ? `${ville === "makkah" ? "Makkah" : "Madinah"} — ${hotels[0]}`
            : `Répartition en chambres du groupe ${groupeNom}`
        }
        action={
          <div className="sans-impression flex flex-wrap gap-2">
            <Bouton type="button" variante="secondaire" onClick={exporterCsv}>
              <DownloadIcon className="h-4 w-4" aria-hidden />
              Exporter en CSV
            </Bouton>
            <Bouton type="button" variante="secondaire" onClick={() => window.print()}>
              <PrinterIcon className="h-4 w-4" aria-hidden />
              Imprimer
            </Bouton>
            <Bouton type="button" onClick={() => setFormulaireOuvert((v) => !v)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Créer des chambres
            </Bouton>
          </div>
        }
      />

      {erreur && (
        <div className="mb-4">
          <Erreur>{erreur}</Erreur>
        </div>
      )}

      {/* Barre de contrôle */}
      <Carte className="sans-impression mb-4">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ardoise-700">Groupe</span>
            <select
              value={groupeId}
              onChange={(e) => naviguer({ groupe: e.target.value })}
              className={champ}
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ardoise-700">Ville</span>
            <div className="inline-flex rounded-lg ring-1 ring-inset ring-ardoise-300">
              {(["makkah", "madinah"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => naviguer({ ville: v })}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    i === 0 ? "rounded-l-lg" : "rounded-r-lg"
                  } ${
                    ville === v
                      ? "bg-marque-700 text-white"
                      : "bg-white text-ardoise-700 hover:bg-ardoise-50"
                  }`}
                >
                  {v === "makkah" ? "Makkah" : "Madinah"}
                </button>
              ))}
            </div>
          </div>

          {etages.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ardoise-700">Étage</span>
              <select
                value={etageFiltre}
                onChange={(e) => naviguer({ etage: e.target.value })}
                className={champ}
              >
                <option value="">Tous</option>
                {etages.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ardoise-700">Capacité</span>
            <select
              value={capaciteFiltre}
              onChange={(e) => naviguer({ capacite: e.target.value })}
              className={champ}
            >
              <option value="">Toutes</option>
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {NOMS_CAPACITE[n]}
                </option>
              ))}
            </select>
          </label>

          <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-sable-50 px-3 py-1.5 text-sm font-medium text-sable-800 ring-1 ring-inset ring-sable-300">
            <UsersIcon className="h-4 w-4" aria-hidden />
            {nombre(nonAffectes.length)} non affecté{nonAffectes.length > 1 ? "s" : ""}
          </span>
        </div>
      </Carte>

      {/* Création en série */}
      {formulaireOuvert && (
        <Carte titre="Créer des chambres en série" className="sans-impression mb-4">
          <form action={envoyerSerie} className="grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
            <input type="hidden" name="groupe_id" value={groupeId} />
            <input type="hidden" name="ville" value={ville} />
            {etatSerie.statut === "erreur" && (
              <div className="sm:col-span-3 lg:col-span-4">
                <Erreur>{etatSerie.message}</Erreur>
              </div>
            )}
            {etatSerie.statut === "ok" && (
              <div className="sm:col-span-3 lg:col-span-4">
                <Succes>{etatSerie.message}</Succes>
              </div>
            )}

            <Champ label="Hôtel">
              <Saisie name="hotel" placeholder="Al-Shohada" defaultValue={hotels[0] ?? ""} />
            </Champ>
            <Champ label="Étage">
              <Saisie name="etage" placeholder="3" />
            </Champ>
            <Champ label="Premier numéro" requis>
              <Saisie name="numero_depart" type="number" min={1} defaultValue={301} required />
            </Champ>
            <Champ label="Nombre de chambres" requis>
              <Saisie name="nombre" type="number" min={1} max={200} defaultValue={10} required />
            </Champ>
            <Champ label="Capacité" requis>
              <Selection name="capacite" defaultValue="4">
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {NOMS_CAPACITE[n]} ({n} lits)
                  </option>
                ))}
              </Selection>
            </Champ>
            <Champ label="Occupation" requis>
              <Selection name="occupation" defaultValue="hommes">
                <option value="hommes">Hommes</option>
                <option value="femmes">Femmes</option>
                <option value="famille">Famille</option>
              </Selection>
            </Champ>

            <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-2">
              <Bouton type="submit" disabled={serieEnCours}>
                {serieEnCours ? "Création…" : "Créer"}
              </Bouton>
              <Bouton type="button" variante="discret" onClick={() => setFormulaireOuvert(false)}>
                Fermer
              </Bouton>
            </div>
          </form>
        </Carte>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Tuile libelle="Chambres" valeur={nombre(chambres.length)} />
        <Tuile
          libelle="Lits occupés"
          valeur={`${nombre(litsOccupes)} / ${nombre(litsTotal)}`}
          detail={litsTotal > 0 ? `${Math.round((litsOccupes / litsTotal) * 100)} % de remplissage` : undefined}
          ton={litsOccupes < litsTotal ? "attente" : "ok"}
        />
        <Tuile
          libelle="Pèlerins à placer"
          valeur={nombre(nonAffectes.length)}
          ton={nonAffectes.length > 0 ? "alerte" : "ok"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Grille des chambres */}
        <div className="lg:col-span-3">
          {visibles.length === 0 ? (
            <Carte>
              <EtatVide
                titre={chambres.length === 0 ? "Aucune chambre" : "Aucune chambre ne correspond aux filtres"}
                description={
                  chambres.length === 0
                    ? `Créez les chambres réservées à ${ville === "makkah" ? "Makkah" : "Madinah"} pour ce groupe.`
                    : "Modifiez l'étage ou la capacité."
                }
                action={
                  chambres.length === 0 ? (
                    <Bouton type="button" onClick={() => setFormulaireOuvert(true)}>
                      Créer des chambres
                    </Bouton>
                  ) : undefined
                }
              />
            </Carte>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((c) => {
                const gens = parChambre.get(c.id) ?? [];
                const libres = c.capacite - gens.length;
                const eligibles = nonAffectes.filter((o) => compatible(c.occupation, o.sexe));

                return (
                  <article
                    key={c.id}
                    className={`rounded-xl border bg-white ${
                      libres === 0 ? "border-marque-300" : "border-ardoise-200"
                    }`}
                  >
                    <header className="flex items-start justify-between gap-2 border-b border-ardoise-100 px-4 py-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-ardoise-950">
                          <BuildingIcon className="h-3.5 w-3.5 text-ardoise-400" aria-hidden />
                          Chambre {c.numero}
                        </p>
                        <p className="mt-0.5 text-xs text-ardoise-500">
                          {NOMS_CAPACITE[c.capacite] ?? `${c.capacite} lits`}
                          {c.etage ? ` · étage ${c.etage}` : ""}
                        </p>
                      </div>
                      <Badge ton={OCCUPATIONS[c.occupation].ton}>
                        {OCCUPATIONS[c.occupation].label}
                      </Badge>
                    </header>

                    <ul className="divide-y divide-ardoise-100">
                      {Array.from({ length: c.capacite }).map((_, i) => {
                        const o = gens[i];
                        if (o) {
                          return (
                            <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marque-50 text-[10px] font-semibold text-marque-700">
                                {initiales(o.nom, o.prenom)}
                              </span>
                              <Link
                                href={`/dossiers/${o.dossierId}`}
                                className="min-w-0 flex-1 truncate text-sm text-ardoise-900 hover:text-marque-700"
                              >
                                {o.prenom} {o.nom}
                              </Link>
                              <button
                                type="button"
                                disabled={enCours}
                                onClick={() => agir(() => affecterChambre(o.dossierId, ville, null))}
                                className="sans-impression shrink-0 rounded p-1 text-ardoise-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                                aria-label={`Retirer ${o.prenom} ${o.nom} de la chambre ${c.numero}`}
                                title="Retirer de la chambre"
                              >
                                <UserMinusIcon className="h-4 w-4" />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={i} className="px-4 py-2">
                            <label className="sr-only" htmlFor={`lit-${c.id}-${i}`}>
                              Lit libre {i + 1} de la chambre {c.numero}
                            </label>
                            <select
                              id={`lit-${c.id}-${i}`}
                              value=""
                              disabled={enCours || eligibles.length === 0}
                              onChange={(e) => {
                                const id = e.target.value;
                                if (id) agir(() => affecterChambre(id, ville, c.id));
                              }}
                              className="sans-impression w-full rounded-lg border border-dashed border-ardoise-300 bg-ardoise-50/60 px-2 py-1.5 text-xs text-ardoise-500 hover:border-sable-400 hover:bg-sable-50 disabled:opacity-60"
                            >
                              <option value="">
                                {eligibles.length === 0
                                  ? "Lit libre — personne à placer"
                                  : `Lit libre — assigner…`}
                              </option>
                              {eligibles.map((o) => (
                                <option key={o.dossierId} value={o.dossierId}>
                                  {o.prenom} {o.nom} ({o.matricule})
                                </option>
                              ))}
                            </select>
                          </li>
                        );
                      })}
                    </ul>

                    <footer className="sans-impression flex items-center justify-between gap-2 border-t border-ardoise-100 px-4 py-2">
                      <span className="text-xs text-ardoise-500">
                        {libres === 0 ? "Complète" : `${libres} lit${libres > 1 ? "s" : ""} libre${libres > 1 ? "s" : ""}`}
                      </span>
                      <span className="flex gap-3">
                        {gens.length > 0 && (
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => agir(() => viderChambre(c.id, ville))}
                            className="text-xs text-ardoise-500 hover:text-ardoise-900 disabled:opacity-40"
                          >
                            Vider
                          </button>
                        )}
                        {gens.length === 0 && (
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => agir(() => supprimerChambre(c.id))}
                            className="text-xs text-ardoise-400 hover:text-rose-600 disabled:opacity-40"
                          >
                            Supprimer
                          </button>
                        )}
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Pèlerins à placer */}
        <Carte titre={`À placer — ${nombre(nonAffectes.length)}`}>
          {nonAffectes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-marque-700">
              Tous les pèlerins du groupe ont une chambre.
            </p>
          ) : (
            <ul className="divide-y divide-ardoise-100">
              {nonAffectes.map((o) => (
                <li key={o.dossierId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ardoise-100 text-[10px] font-semibold text-ardoise-600">
                    {initiales(o.nom, o.prenom)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/dossiers/${o.dossierId}`}
                      className="block truncate text-sm text-ardoise-900 hover:text-marque-700"
                    >
                      {o.prenom} {o.nom}
                    </Link>
                    <span className="block text-xs text-ardoise-400">
                      {o.sexe === "F" ? "Femme" : "Homme"} · {o.matricule}
                    </span>
                  </span>
                  <BedDoubleIcon className="h-4 w-4 shrink-0 text-ardoise-300" aria-hidden />
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </>
  );
}
