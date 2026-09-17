"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Bouton, Champ, Erreur, Saisie, Selection, Succes, Zone } from "@/components/ui";
import {
  MOYENS_PAIEMENT,
  STATUTS_DOCUMENT,
  STATUTS_DOSSIER,
  TYPES_DOCUMENT,
} from "@/lib/niger";
import { dateCourte, joursRestants, xof } from "@/lib/format";
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/commun";
import { annulerPaiement, enregistrerPaiement } from "@/lib/actions/paiements";
import { supprimerEcheance } from "@/lib/actions/dossiers";
import type {
  DocumentDossier,
  Echeance,
  MoyenPaiement,
  Paiement,
  StatutDocument,
} from "@/lib/database.types";

type Action = (etat: EtatAction, formData: FormData) => Promise<EtatAction>;

/* -------------------------------------------------------------------------- */
/* Statut du dossier                                                           */
/* -------------------------------------------------------------------------- */

export function PanneauStatut({
  action,
  statutActuel,
}: {
  action: Action;
  statutActuel: keyof typeof STATUTS_DOSSIER;
}) {
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  const [statut, setStatut] = useState<string>(statutActuel);

  return (
    <form action={envoyer} className="space-y-3 p-5">
      {etat.statut === "erreur" && <Erreur>{etat.message}</Erreur>}
      {etat.statut === "ok" && <Succes>{etat.message}</Succes>}

      <Champ label="Statut du dossier">
        <Selection name="statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
          {Object.entries(STATUTS_DOSSIER).map(([cle, meta]) => (
            <option key={cle} value={cle}>
              {meta.label}
            </option>
          ))}
        </Selection>
      </Champ>

      {statut === "annule" && (
        <Champ label="Motif d'annulation" requis>
          <Zone name="motif" rows={2} required />
        </Champ>
      )}

      <Bouton type="submit" variante="secondaire" disabled={enCours || statut === statutActuel}>
        {enCours ? "Mise à jour…" : "Appliquer"}
      </Bouton>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Affectation à un groupe                                                     */
/* -------------------------------------------------------------------------- */

export function PanneauGroupe({
  action,
  groupes,
  groupeActuel,
  chambreActuelle,
}: {
  action: Action;
  groupes: { id: string; nom: string }[];
  groupeActuel: string | null;
  chambreActuelle: string | null;
}) {
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);

  return (
    <form action={envoyer} className="space-y-3 p-5">
      {etat.statut === "erreur" && <Erreur>{etat.message}</Erreur>}
      {etat.statut === "ok" && <Succes>{etat.message}</Succes>}

      <Champ label="Groupe de départ">
        <Selection name="groupe_id" defaultValue={groupeActuel ?? ""}>
          <option value="">Non affecté</option>
          {groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </Selection>
      </Champ>

      <Champ label="N° de chambre" aide="Renseigné une fois l'hôtel attribué">
        <Saisie name="numero_chambre" defaultValue={chambreActuelle ?? ""} />
      </Champ>

      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Pièces du dossier                                                           */
/* -------------------------------------------------------------------------- */

function LignePiece({ action, piece }: { action: Action; piece: DocumentDossier }) {
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const meta = TYPES_DOCUMENT[piece.type];
  const statut = STATUTS_DOCUMENT[piece.statut];

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ardoise-900">
            {meta?.label ?? piece.type}
            {meta?.obligatoire && <span className="ml-1 text-xs text-rose-600">obligatoire</span>}
          </p>
          {piece.note && <p className="mt-0.5 text-xs text-ardoise-500">{piece.note}</p>}
          {piece.expire_le && (
            <p className="mt-0.5 text-xs text-ardoise-500">
              Expire le {dateCourte(piece.expire_le)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge ton={statut.ton}>{statut.label}</Badge>
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            className="text-xs font-medium text-marque-700 hover:underline"
          >
            {ouvert ? "Fermer" : "Modifier"}
          </button>
        </div>
      </div>

      {ouvert && (
        <form action={envoyer} className="mt-3 grid gap-3 rounded-lg bg-ardoise-50 p-4 sm:grid-cols-3">
          <input type="hidden" name="document_id" value={piece.id} />
          {etat.statut === "erreur" && (
            <div className="sm:col-span-3">
              <Erreur>{etat.message}</Erreur>
            </div>
          )}
          <Champ label="Statut">
            <Selection name="statut" defaultValue={piece.statut}>
              {(Object.keys(STATUTS_DOCUMENT) as StatutDocument[]).map((s) => (
                <option key={s} value={s}>
                  {STATUTS_DOCUMENT[s].label}
                </option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Date d'expiration">
            <Saisie type="date" name="expire_le" defaultValue={piece.expire_le ?? ""} />
          </Champ>
          <Champ label="Note">
            <Saisie name="note" defaultValue={piece.note ?? ""} />
          </Champ>
          <div className="sm:col-span-3">
            <Bouton type="submit" variante="secondaire" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer la pièce"}
            </Bouton>
          </div>
        </form>
      )}
    </li>
  );
}

export function ListePieces({ action, pieces }: { action: Action; pieces: DocumentDossier[] }) {
  if (pieces.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-ardoise-500">Aucune pièce attendue.</p>;
  }
  return (
    <ul className="divide-y divide-ardoise-100">
      {pieces.map((p) => (
        <LignePiece key={p.id} action={action} piece={p} />
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Échéancier                                                                  */
/* -------------------------------------------------------------------------- */

export function PanneauEcheances({
  action,
  echeances,
  dossierId,
}: {
  action: Action;
  echeances: Echeance[];
  dossierId: string;
}) {
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  const [suppression, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);

  return (
    <div>
      {echeances.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ardoise-500">
          Aucune échéance programmée.
        </p>
      ) : (
        <ul className="divide-y divide-ardoise-100">
          {echeances.map((e) => {
            const jours = joursRestants(e.echue_le);
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ardoise-900">{e.libelle}</p>
                  <p className="text-xs text-ardoise-500">
                    {dateCourte(e.echue_le)}
                    {jours !== null &&
                      (jours < 0 ? ` · en retard de ${-jours} j` : ` · dans ${jours} j`)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-sm font-medium text-ardoise-900">
                    {xof(e.montant_xof)}
                  </span>
                  <button
                    type="button"
                    disabled={suppression}
                    onClick={() =>
                      demarrer(async () => {
                        await supprimerEcheance(dossierId, e.id);
                        router.refresh();
                      })
                    }
                    className="text-xs text-ardoise-400 hover:text-rose-600 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ardoise-200 px-5 py-3">
        {!ouvert ? (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="text-sm font-medium text-marque-700 hover:underline"
          >
            + Ajouter une échéance
          </button>
        ) : (
          <form action={envoyer} className="grid gap-3 sm:grid-cols-3">
            {etat.statut === "erreur" && (
              <div className="sm:col-span-3">
                <Erreur>{etat.message}</Erreur>
              </div>
            )}
            <Champ label="Libellé" requis>
              <Saisie name="libelle" required placeholder="2ᵉ versement" />
            </Champ>
            <Champ label="Montant (FCFA)" requis>
              <Saisie name="montant_xof" inputMode="numeric" required />
            </Champ>
            <Champ label="Échéance" requis>
              <Saisie type="date" name="echue_le" required />
            </Champ>
            <div className="flex gap-2 sm:col-span-3">
              <Bouton type="submit" variante="secondaire" disabled={enCours}>
                {enCours ? "Ajout…" : "Ajouter"}
              </Bouton>
              <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
                Annuler
              </Bouton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Encaissement                                                                */
/* -------------------------------------------------------------------------- */

export function PanneauPaiements({
  dossierId,
  paiements,
  solde,
}: {
  dossierId: string;
  paiements: Paiement[];
  solde: number;
}) {
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState(enregistrerPaiement, ETAT_INITIAL);
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [annulation, demarrer] = useTransition();

  const champs = etat.statut === "erreur" ? (etat.champs ?? {}) : {};
  const err = (nom: string) =>
    champs[nom] ? <span className="mt-1 block text-xs text-rose-600">{champs[nom]}</span> : null;

  return (
    <div>
      {solde > 0 ? (
        <form action={envoyer} className="grid gap-3 border-b border-ardoise-200 p-5 sm:grid-cols-2">
          <input type="hidden" name="dossier_id" value={dossierId} />
          {etat.statut === "erreur" && (
            <div className="sm:col-span-2">
              <Erreur>{etat.message}</Erreur>
            </div>
          )}
          {etat.statut === "ok" && (
            <div className="sm:col-span-2">
              <Succes>{etat.message}</Succes>
            </div>
          )}

          <Champ label="Montant reçu (FCFA)" requis aide={`Solde restant : ${xof(solde)}`}>
            <Saisie name="montant_xof" inputMode="numeric" required placeholder={String(solde)} />
            {err("montant_xof")}
          </Champ>

          <Champ label="Moyen de paiement" requis>
            <Selection
              name="moyen"
              value={moyen}
              onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}
            >
              {(Object.keys(MOYENS_PAIEMENT) as MoyenPaiement[]).map((m) => (
                <option key={m} value={m}>
                  {MOYENS_PAIEMENT[m].label}
                </option>
              ))}
            </Selection>
          </Champ>

          <Champ label="Date du versement" requis>
            <Saisie
              type="date"
              name="paye_le"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </Champ>

          <Champ
            label="Référence de transaction"
            requis={MOYENS_PAIEMENT[moyen].besoinReference}
            aide={
              MOYENS_PAIEMENT[moyen].besoinReference
                ? "ID de la transaction, à retrouver sur le SMS de confirmation"
                : undefined
            }
          >
            <Saisie
              name="reference_operateur"
              required={MOYENS_PAIEMENT[moyen].besoinReference}
            />
            {err("reference_operateur")}
          </Champ>

          <Champ label="Note" className="sm:col-span-2">
            <Saisie name="note" placeholder="Versé par le frère du pèlerin, etc." />
          </Champ>

          <div className="sm:col-span-2">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Encaisser et générer le reçu"}
            </Bouton>
          </div>
        </form>
      ) : (
        <p className="border-b border-ardoise-200 bg-marque-50 px-5 py-4 text-sm font-medium text-marque-800">
          Ce dossier est intégralement réglé.
        </p>
      )}

      {paiements.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ardoise-500">Aucun versement enregistré.</p>
      ) : (
        <ul className="divide-y divide-ardoise-100">
          {paiements.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="tabular text-sm font-medium text-ardoise-900">
                  {p.numero_recu}
                  {p.statut === "annule" && (
                    <span className="ml-2">
                      <Badge ton="alerte">Annulé</Badge>
                    </span>
                  )}
                </p>
                <p className="text-xs text-ardoise-500">
                  {dateCourte(p.paye_le)} · {MOYENS_PAIEMENT[p.moyen].label}
                  {p.reference_operateur ? ` · ${p.reference_operateur}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`tabular text-sm font-medium ${
                    p.statut === "annule"
                      ? "text-ardoise-400 line-through"
                      : "text-ardoise-900"
                  }`}
                >
                  {xof(p.montant_xof)}
                </span>
                <a
                  href={`/recus/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-marque-700 hover:underline"
                >
                  Reçu
                </a>
                {p.statut === "confirme" && (
                  <button
                    type="button"
                    disabled={annulation}
                    onClick={() =>
                      demarrer(async () => {
                        await annulerPaiement(p.id, dossierId);
                        router.refresh();
                      })
                    }
                    className="text-xs text-ardoise-400 hover:text-rose-600 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
