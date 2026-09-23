"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Carte, Champ, Erreur, Saisie, Selection, Zone } from "@/components/ui";
import { TYPES_CHAMBRE } from "@/lib/niger";
import { xof } from "@/lib/format";
import { creerDossier } from "@/lib/actions/dossiers";
import { ETAT_INITIAL } from "@/lib/actions/commun";

interface OptionPelerin {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

interface OptionForfait {
  id: string;
  nom: string;
  type: string;
  prix_xof: number;
  acompte_xof: number;
  saison_id: string;
  saison_libelle: string;
}

interface OptionGroupe {
  id: string;
  nom: string;
  saison_id: string;
}

export default function FormulaireDossier({
  pelerins,
  forfaits,
  groupes,
  pelerinInitial,
  peutGererCatalogue,
}: {
  pelerins: OptionPelerin[];
  forfaits: OptionForfait[];
  groupes: OptionGroupe[];
  pelerinInitial?: string;
  /** Faux pour un agent : le catalogue ne lui est pas ouvert. */
  peutGererCatalogue: boolean;
}) {
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState(creerDossier, ETAT_INITIAL);
  const [forfaitId, setForfaitId] = useState(forfaits[0]?.id ?? "");
  const [remise, setRemise] = useState("0");

  useEffect(() => {
    if (etat.statut === "ok" && etat.id) router.push(`/dossiers/${etat.id}`);
  }, [etat, router]);

  const forfait = useMemo(
    () => forfaits.find((f) => f.id === forfaitId),
    [forfaitId, forfaits],
  );

  const groupesFiltres = useMemo(
    () => (forfait ? groupes.filter((g) => g.saison_id === forfait.saison_id) : []),
    [forfait, groupes],
  );

  const remiseNum = Number(remise.replace(/[\s.]/g, "")) || 0;
  const net = forfait ? Math.max(forfait.prix_xof - remiseNum, 0) : 0;

  const champs = etat.statut === "erreur" ? (etat.champs ?? {}) : {};
  const err = (nom: string) =>
    champs[nom] ? <span className="mt-1 block text-xs text-rose-600">{champs[nom]}</span> : null;

  if (pelerins.length === 0 || forfaits.length === 0) {
    return (
      <Carte>
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-ardoise-800">
            {forfaits.length === 0
              ? "Aucun forfait actif"
              : "Aucun pèlerin enregistré"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ardoise-500">
            {forfaits.length === 0
              ? peutGererCatalogue
                ? "Créez d'abord une saison et au moins un forfait dans le catalogue."
                : "Les forfaits sont préparés par le gestionnaire ou le propriétaire. Signalez-leur qu'une campagne doit être ouverte."
              : "Enregistrez la fiche d'un pèlerin avant d'ouvrir un dossier."}
          </p>
          <div className="mt-5">
            <Bouton
              type="button"
              onClick={() =>
                router.push(
                  forfaits.length > 0
                    ? "/pelerins/nouveau"
                    : peutGererCatalogue
                      ? "/catalogue"
                      : "/dossiers",
                )
              }
            >
              {forfaits.length > 0
                ? "Ajouter un pèlerin"
                : peutGererCatalogue
                  ? "Ouvrir le catalogue"
                  : "Revenir aux dossiers"}
            </Bouton>
          </div>
        </div>
      </Carte>
    );
  }

  return (
    <form action={envoyer} className="space-y-4">
      {etat.statut === "erreur" && <Erreur>{etat.message}</Erreur>}

      <Carte titre="Inscription">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Champ label="Pèlerin" requis>
            <Selection name="pelerin_id" defaultValue={pelerinInitial ?? ""} required>
              <option value="">Sélectionner…</option>
              {pelerins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom} — {p.matricule}
                </option>
              ))}
            </Selection>
            {err("pelerin_id")}
          </Champ>

          <Champ label="Forfait" requis>
            <Selection
              name="forfait_id"
              value={forfaitId}
              onChange={(e) => setForfaitId(e.target.value)}
              required
            >
              <option value="">Sélectionner…</option>
              {forfaits.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.saison_libelle} · {f.nom} — {xof(f.prix_xof)}
                </option>
              ))}
            </Selection>
            {err("forfait_id")}
          </Champ>

          <Champ label="Groupe de départ" aide="Modifiable plus tard">
            <Selection name="groupe_id" defaultValue="">
              <option value="">Non affecté</option>
              {groupesFiltres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
            </Selection>
          </Champ>

          <Champ label="Type de chambre">
            <Selection name="type_chambre" defaultValue="">
              <option value="">—</option>
              {TYPES_CHAMBRE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selection>
          </Champ>

          <Champ label="Remise accordée (FCFA)">
            <Saisie
              name="remise_xof"
              inputMode="numeric"
              value={remise}
              onChange={(e) => setRemise(e.target.value)}
            />
            {err("remise_xof")}
          </Champ>

          <Champ label="Observations" className="sm:col-span-2">
            <Zone name="notes" rows={3} />
          </Champ>
        </div>

        {forfait && (
          <div className="border-t border-ardoise-200 bg-ardoise-50 px-5 py-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ardoise-500">Prix du forfait</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ardoise-900">
                  {xof(forfait.prix_xof)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ardoise-500">Acompte exigé</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ardoise-900">
                  {xof(forfait.acompte_xof)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ardoise-500">Net à payer</dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-marque-700">{xof(net)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ardoise-500">
              La liste des pièces obligatoires et une échéance d&apos;acompte à 15 jours seront
              créées automatiquement.
            </p>
          </div>
        )}
      </Carte>

      <div className="flex justify-end gap-3">
        <Bouton type="button" variante="secondaire" onClick={() => router.back()}>
          Annuler
        </Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le dossier"}
        </Bouton>
      </div>
    </form>
  );
}
