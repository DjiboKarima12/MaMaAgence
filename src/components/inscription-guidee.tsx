"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BanknoteIcon,
  CheckIcon,
  FileCheck2Icon,
  ScanLineIcon,
  UserIcon,
} from "lucide-react";
import { Bouton, Carte, Champ, Erreur, Saisie, Selection, Succes, Zone } from "@/components/ui";
import { CarteTeleversement } from "@/components/carte-televersement";
import { AEROPORTS_NIGER, LIENS_MAHRAM, MOYENS_PAIEMENT, REGIONS_NIGER, TYPES_CHAMBRE } from "@/lib/niger";
import { lireMrz } from "@/lib/mrz";
import { xof } from "@/lib/format";
import { ETAT_INITIAL } from "@/lib/actions/commun";
import { enregistrerDossier, enregistrerIdentite } from "@/lib/actions/inscription";
import { enregistrerPaiement } from "@/lib/actions/paiements";
import type { MoyenPaiement } from "@/lib/database.types";

/* -------------------------------------------------------------------------- */
/* Barre d'étapes                                                              */
/* -------------------------------------------------------------------------- */

const ETAPES = [
  { n: 1, titre: "Identité", Icone: UserIcon },
  { n: 2, titre: "Pièces et santé", Icone: FileCheck2Icon },
  { n: 3, titre: "Paiement", Icone: BanknoteIcon },
] as const;

function BarreEtapes({ courante }: { courante: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 sm:gap-4">
      {ETAPES.map(({ n, titre, Icone }, i) => {
        const faite = n < courante;
        const active = n === courante;
        return (
          <li key={n} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                faite
                  ? "bg-marque-700 text-white"
                  : active
                    ? "bg-marque-700 text-white ring-4 ring-sable-200"
                    : "bg-ardoise-100 text-ardoise-400"
              }`}
            >
              {faite ? <CheckIcon className="h-4 w-4" aria-hidden /> : <Icone className="h-4 w-4" aria-hidden />}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span
                className={`block text-xs font-medium ${
                  active ? "text-marque-800" : faite ? "text-ardoise-700" : "text-ardoise-400"
                }`}
              >
                Étape {n}
              </span>
              <span
                className={`block truncate text-sm ${
                  active ? "font-semibold text-ardoise-950" : "text-ardoise-500"
                }`}
              >
                {titre}
              </span>
            </span>
            {i < ETAPES.length - 1 && (
              <span
                className={`h-0.5 flex-1 rounded-full ${faite ? "bg-marque-600" : "bg-ardoise-200"}`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Types des options                                                           */
/* -------------------------------------------------------------------------- */

export interface OptionForfait {
  id: string;
  nom: string;
  saison_id: string;
  saison_libelle: string;
  prix_xof: number;
  acompte_xof: number;
}

export interface OptionGroupe {
  id: string;
  nom: string;
  saison_id: string;
  aeroport_depart: string | null;
}

export interface OptionMahram {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

/* -------------------------------------------------------------------------- */
/* Parcours                                                                    */
/* -------------------------------------------------------------------------- */

export function InscriptionGuidee({
  agenceId,
  forfaits,
  groupes,
  mahrams,
}: {
  agenceId: string;
  forfaits: OptionForfait[];
  groupes: OptionGroupe[];
  mahrams: OptionMahram[];
}) {
  const router = useRouter();
  const [etape, setEtape] = useState(1);
  const [pelerinId, setPelerinId] = useState<string | null>(null);
  const [dossierId, setDossierId] = useState<string | null>(null);

  /* ----- Étape 1 ----- */
  const [identite, setIdentite] = useState({
    nom: "",
    prenom: "",
    sexe: "M",
    date_naissance: "",
    passeport_numero: "",
    passeport_expire_le: "",
  });
  const [mrz, setMrz] = useState("");
  const [messageMrz, setMessageMrz] = useState<{ ton: "ok" | "alerte"; texte: string } | null>(null);

  const [etatIdentite, envoyerIdentite, identiteEnCours] = useActionState(
    enregistrerIdentite,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etatIdentite.statut === "ok" && etatIdentite.id) {
      setPelerinId(etatIdentite.id);
      setEtape(2);
    }
  }, [etatIdentite]);

  function analyserMrz() {
    const lu = lireMrz(mrz);
    if (!lu) {
      setMessageMrz({
        ton: "alerte",
        texte: "Bande illisible. Copiez les deux lignes complètes du bas du passeport.",
      });
      return;
    }

    setIdentite((v) => ({
      ...v,
      nom: lu.nom || v.nom,
      prenom: lu.prenom || v.prenom,
      sexe: lu.sexe ?? v.sexe,
      date_naissance: lu.date_naissance ?? v.date_naissance,
      passeport_numero: lu.passeport_numero,
      passeport_expire_le: lu.passeport_expire_le ?? v.passeport_expire_le,
    }));

    setMessageMrz(
      lu.incoherences.length > 0
        ? {
            ton: "alerte",
            texte: `Champs remplis, mais la clé de contrôle ne correspond pas pour : ${lu.incoherences.join(", ")}. Vérifiez à l'œil sur le passeport.`,
          }
        : { ton: "ok", texte: "Champs remplis depuis le passeport, clés de contrôle valides." },
    );
  }

  /* ----- Étape 2 ----- */
  const [forfaitId, setForfaitId] = useState(forfaits[0]?.id ?? "");
  const [aeroport, setAeroport] = useState("NIM");
  const forfait = useMemo(() => forfaits.find((f) => f.id === forfaitId), [forfaitId, forfaits]);

  const groupesCompatibles = useMemo(
    () =>
      groupes.filter(
        (g) =>
          (!forfait || g.saison_id === forfait.saison_id) &&
          (!g.aeroport_depart || g.aeroport_depart === aeroport),
      ),
    [groupes, forfait, aeroport],
  );

  const [etatDossier, envoyerDossier, dossierEnCours] = useActionState(
    enregistrerDossier,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etatDossier.statut === "ok" && etatDossier.id) setDossierId(etatDossier.id);
  }, [etatDossier]);

  /* ----- Étape 3 ----- */
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [etatPaiement, envoyerPaiement, paiementEnCours] = useActionState(
    enregistrerPaiement,
    ETAT_INITIAL,
  );

  const champsIdentite = etatIdentite.statut === "erreur" ? (etatIdentite.champs ?? {}) : {};
  const champsDossier = etatDossier.statut === "erreur" ? (etatDossier.champs ?? {}) : {};
  const champsPaiement = etatPaiement.statut === "erreur" ? (etatPaiement.champs ?? {}) : {};
  const err = (source: Record<string, string>, nom: string) =>
    source[nom] ? <span className="mt-1 block text-xs text-rose-600">{source[nom]}</span> : null;

  if (forfaits.length === 0) {
    return (
      <Carte>
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-ardoise-800">Aucun forfait actif</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ardoise-500">
            Créez une saison et au moins un forfait avant d&apos;inscrire un pèlerin.
          </p>
          <div className="mt-5">
            <Bouton type="button" onClick={() => router.push("/catalogue")}>
              Ouvrir le catalogue
            </Bouton>
          </div>
        </div>
      </Carte>
    );
  }

  return (
    <>
      <BarreEtapes courante={etape} />

      {/* ================= Étape 1 : identité ================= */}
      {etape === 1 && (
        <form action={envoyerIdentite} className="space-y-4">
          <input type="hidden" name="pelerin_id" value={pelerinId ?? ""} />
          {etatIdentite.statut === "erreur" && <Erreur>{etatIdentite.message}</Erreur>}

          <Carte titre="Lecture du passeport">
            <div className="space-y-3 p-5">
              <p className="text-sm text-ardoise-600">
                Copiez les deux lignes de caractères au bas de la page d&apos;identité du
                passeport. Les champs se remplissent seuls et les clés de contrôle sont vérifiées.
              </p>
              <Zone
                rows={2}
                value={mrz}
                onChange={(e) => setMrz(e.target.value)}
                spellCheck={false}
                placeholder={"P<NERABDOULAYE<<ISSOUFOU<<<<<<<<<<<<<<<<<<<<\nN0184392<2NER6804129M3105157<<<<<<<<<<<<<<00"}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Bouton type="button" variante="secondaire" onClick={analyserMrz} disabled={!mrz.trim()}>
                  <ScanLineIcon className="h-4 w-4" aria-hidden />
                  Lire la bande
                </Bouton>
                {messageMrz &&
                  (messageMrz.ton === "ok" ? (
                    <Succes>{messageMrz.texte}</Succes>
                  ) : (
                    <Erreur>{messageMrz.texte}</Erreur>
                  ))}
              </div>
            </div>
          </Carte>

          <Carte titre="État civil">
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Champ label="Prénom" requis>
                <Saisie
                  name="prenom"
                  required
                  value={identite.prenom}
                  onChange={(e) => setIdentite((v) => ({ ...v, prenom: e.target.value }))}
                />
                {err(champsIdentite, "prenom")}
              </Champ>
              <Champ label="Nom" requis>
                <Saisie
                  name="nom"
                  required
                  value={identite.nom}
                  onChange={(e) => setIdentite((v) => ({ ...v, nom: e.target.value }))}
                />
                {err(champsIdentite, "nom")}
              </Champ>

              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium text-ardoise-700">
                  Sexe<span className="ml-0.5 text-rose-600">*</span>
                </legend>
                <div className="flex gap-2">
                  {[
                    { v: "M", l: "Homme" },
                    { v: "F", l: "Femme" },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-inset transition-colors ${
                        identite.sexe === o.v
                          ? "bg-marque-50 font-medium text-marque-800 ring-marque-400"
                          : "bg-white text-ardoise-700 ring-ardoise-300 hover:bg-ardoise-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sexe"
                        value={o.v}
                        checked={identite.sexe === o.v}
                        onChange={(e) => setIdentite((v) => ({ ...v, sexe: e.target.value }))}
                        className="sr-only"
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Champ label="Date de naissance">
                <Saisie
                  type="date"
                  name="date_naissance"
                  value={identite.date_naissance}
                  onChange={(e) => setIdentite((v) => ({ ...v, date_naissance: e.target.value }))}
                />
                {err(champsIdentite, "date_naissance")}
              </Champ>
              <Champ label="Lieu de naissance">
                <Saisie name="lieu_naissance" />
              </Champ>
              <Champ label="NIN" aide="Numéro d'identification nationale">
                <Saisie name="nin" />
              </Champ>

              <Champ label="Téléphone">
                <span className="flex">
                  <span className="inline-flex items-center rounded-l-lg bg-ardoise-100 px-3 text-sm text-ardoise-600 ring-1 ring-inset ring-ardoise-300">
                    +227
                  </span>
                  <Saisie
                    name="telephone"
                    type="tel"
                    inputMode="tel"
                    placeholder="90 00 00 00"
                    className="rounded-l-none"
                  />
                </span>
              </Champ>
              <Champ label="Région">
                <Selection name="region" defaultValue="Niamey">
                  {REGIONS_NIGER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Selection>
              </Champ>
              <Champ label="Ville / village">
                <Saisie name="ville" />
              </Champ>
              <Champ label="Profession">
                <Saisie name="profession" />
              </Champ>

              <label className="flex items-center gap-2 self-end pb-2 text-sm text-ardoise-700">
                <input
                  type="checkbox"
                  name="deja_effectue_hajj"
                  className="h-4 w-4 rounded border-ardoise-300 text-marque-600 focus:ring-marque-500"
                />
                A déjà effectué le Hajj
              </label>
            </div>
          </Carte>

          <Carte titre="Passeport">
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Champ label="Numéro">
                <Saisie
                  name="passeport_numero"
                  value={identite.passeport_numero}
                  onChange={(e) => setIdentite((v) => ({ ...v, passeport_numero: e.target.value }))}
                />
              </Champ>
              <Champ label="Délivré le">
                <Saisie type="date" name="passeport_delivre_le" />
              </Champ>
              <Champ label="Expire le" aide="Six mois de validité exigés">
                <Saisie
                  type="date"
                  name="passeport_expire_le"
                  value={identite.passeport_expire_le}
                  onChange={(e) =>
                    setIdentite((v) => ({ ...v, passeport_expire_le: e.target.value }))
                  }
                />
              </Champ>
              <Champ label="Lieu de délivrance">
                <Saisie name="passeport_lieu" />
              </Champ>
            </div>
          </Carte>

          <Carte titre="Accompagnement et urgence">
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {identite.sexe === "F" && (
                <>
                  <Champ
                    label="Mahram accompagnateur"
                    className="lg:col-span-2"
                    aide="Pèlerin masculin déjà enregistré dans l'agence"
                  >
                    <Selection name="mahram_pelerin_id" defaultValue="">
                      <option value="">Aucun</option>
                      {mahrams.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.prenom} {m.nom} ({m.matricule})
                        </option>
                      ))}
                    </Selection>
                  </Champ>
                  <Champ label="Lien de parenté">
                    <Selection name="mahram_lien" defaultValue="">
                      <option value="">—</option>
                      {LIENS_MAHRAM.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </Selection>
                  </Champ>
                </>
              )}
              <Champ label="Contact d'urgence">
                <Saisie name="contact_urgence_nom" />
              </Champ>
              <Champ label="Téléphone du contact">
                <Saisie name="contact_urgence_tel" type="tel" />
              </Champ>
              <Champ label="Lien avec le pèlerin">
                <Saisie name="contact_urgence_lien" />
              </Champ>
            </div>
          </Carte>

          <div className="flex justify-end">
            <Bouton type="submit" disabled={identiteEnCours}>
              {identiteEnCours ? "Enregistrement…" : "Continuer vers les pièces"}
            </Bouton>
          </div>
        </form>
      )}

      {/* ================= Étape 2 : dossier, santé, pièces ================= */}
      {etape === 2 && (
        <div className="space-y-4">
          <form action={envoyerDossier} className="space-y-4">
            <input type="hidden" name="pelerin_id" value={pelerinId ?? ""} />
            <input type="hidden" name="dossier_id" value={dossierId ?? ""} />
            {etatDossier.statut === "erreur" && <Erreur>{etatDossier.message}</Erreur>}
            {etatDossier.statut === "ok" && <Succes>{etatDossier.message}</Succes>}

            <Carte titre="Forfait et départ">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Champ label="Forfait" requis>
                  <Selection
                    name="forfait_id"
                    value={forfaitId}
                    onChange={(e) => setForfaitId(e.target.value)}
                    required
                  >
                    {forfaits.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.saison_libelle} · {f.nom} — {xof(f.prix_xof)}
                      </option>
                    ))}
                  </Selection>
                  {err(champsDossier, "forfait_id")}
                </Champ>

                <Champ label="Point d'embarquement" aide="Aéroport souhaité par le pèlerin">
                  <Selection
                    name="aeroport_prefere"
                    value={aeroport}
                    onChange={(e) => setAeroport(e.target.value)}
                  >
                    {AEROPORTS_NIGER.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.ville} ({a.code}) — {a.nom}
                      </option>
                    ))}
                  </Selection>
                </Champ>

                <Champ label="Groupe de départ" aide="Modifiable plus tard">
                  <Selection name="groupe_id" defaultValue="">
                    <option value="">Non affecté</option>
                    {groupesCompatibles.map((g) => (
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
                  <Saisie name="remise_xof" inputMode="numeric" defaultValue="0" />
                  {err(champsDossier, "remise_xof")}
                </Champ>
              </div>

              {forfait && (
                <div className="border-t border-ardoise-200 bg-ardoise-50 px-5 py-3">
                  <p className="tabular text-sm text-ardoise-700">
                    Prix {xof(forfait.prix_xof)} · acompte exigé{" "}
                    <span className="font-semibold text-ardoise-900">
                      {xof(forfait.acompte_xof)}
                    </span>
                  </p>
                </div>
              )}
            </Carte>

            <Carte titre="Santé">
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <Champ label="Groupe sanguin">
                  <Selection name="groupe_sanguin" defaultValue="">
                    <option value="">—</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Selection>
                </Champ>
                <Champ
                  label="Antécédents médicaux"
                  className="sm:col-span-2"
                  aide="Utile à l'encadrant sur place : diabète, hypertension, mobilité réduite…"
                >
                  <Zone name="antecedents_medicaux" rows={2} />
                </Champ>
              </div>
            </Carte>

            <div className="flex flex-wrap justify-between gap-3">
              <Bouton type="button" variante="secondaire" onClick={() => setEtape(1)}>
                Revenir à l&apos;identité
              </Bouton>
              <Bouton type="submit" disabled={dossierEnCours}>
                {dossierEnCours
                  ? "Enregistrement…"
                  : dossierId
                    ? "Mettre à jour le dossier"
                    : "Ouvrir le dossier"}
              </Bouton>
            </div>
          </form>

          {/* Les pièces ont besoin d'un dossier pour s'y rattacher. */}
          <Carte titre="Pièces justificatives">
            {!dossierId ? (
              <p className="px-5 py-8 text-center text-sm text-ardoise-500">
                Ouvrez d&apos;abord le dossier ci-dessus : les pièces s&apos;y rattacheront.
              </p>
            ) : (
              <>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="passeport"
                    titre="Passeport"
                    description="Page d'identité, lisible en entier"
                    obligatoire
                  />
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="photo_identite"
                    titre="Photo d'identité"
                    description="Fond blanc, tête nue et dégagée"
                    obligatoire
                  />
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="carnet_vaccination"
                    titre="Carnet de vaccination"
                    description="Fièvre jaune et méningite ACYW135"
                    obligatoire
                  />
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="acte_naissance"
                    titre="Acte de naissance"
                    obligatoire
                  />
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="certificat_medical"
                    titre="Certificat médical"
                    description="Facultatif à ce stade"
                  />
                  <CarteTeleversement
                    dossierId={dossierId}
                    agenceId={agenceId}
                    type="autorisation_mahram"
                    titre="Autorisation mahram"
                    description="Pour une pèlerine accompagnée"
                  />
                </div>
                <div className="flex justify-end border-t border-ardoise-200 px-5 py-3">
                  <Bouton type="button" onClick={() => setEtape(3)}>
                    Continuer vers le paiement
                  </Bouton>
                </div>
              </>
            )}
          </Carte>
        </div>
      )}

      {/* ================= Étape 3 : paiement ================= */}
      {etape === 3 && dossierId && (
        <div className="space-y-4">
          {etatPaiement.statut === "ok" ? (
            <Carte>
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-marque-50">
                  <CheckIcon className="h-6 w-6 text-marque-700" aria-hidden />
                </span>
                <p className="mt-4 text-lg font-semibold text-ardoise-950">Inscription terminée</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-ardoise-500">
                  {etatPaiement.message} Le dossier est enregistré et le reçu est imprimable.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Bouton type="button" onClick={() => router.push(`/dossiers/${dossierId}`)}>
                    Ouvrir le dossier
                  </Bouton>
                  <Bouton
                    type="button"
                    variante="secondaire"
                    onClick={() => router.push("/pelerins/inscription")}
                  >
                    Inscrire un autre pèlerin
                  </Bouton>
                </div>
              </div>
            </Carte>
          ) : (
            <form action={envoyerPaiement} className="space-y-4">
              <input type="hidden" name="dossier_id" value={dossierId} />
              {etatPaiement.statut === "erreur" && <Erreur>{etatPaiement.message}</Erreur>}

              <Carte titre="Premier versement">
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Champ
                    label="Montant reçu (FCFA)"
                    requis
                    aide={forfait ? `Acompte exigé : ${xof(forfait.acompte_xof)}` : undefined}
                  >
                    <Saisie
                      name="montant_xof"
                      inputMode="numeric"
                      required
                      defaultValue={forfait?.acompte_xof ?? ""}
                    />
                    {err(champsPaiement, "montant_xof")}
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
                        ? "Identifiant figurant sur le SMS de confirmation"
                        : undefined
                    }
                  >
                    <Saisie
                      name="reference_operateur"
                      required={MOYENS_PAIEMENT[moyen].besoinReference}
                    />
                    {err(champsPaiement, "reference_operateur")}
                  </Champ>

                  <Champ label="Note" className="sm:col-span-2">
                    <Saisie name="note" placeholder="Versé par le frère du pèlerin, etc." />
                  </Champ>
                </div>
              </Carte>

              <div className="flex flex-wrap justify-between gap-3">
                <Bouton type="button" variante="secondaire" onClick={() => setEtape(2)}>
                  Revenir aux pièces
                </Bouton>
                <div className="flex gap-3">
                  <Bouton
                    type="button"
                    variante="secondaire"
                    onClick={() => router.push(`/dossiers/${dossierId}`)}
                  >
                    Encaisser plus tard
                  </Bouton>
                  <Bouton type="submit" disabled={paiementEnCours}>
                    {paiementEnCours ? "Enregistrement…" : "Encaisser et terminer"}
                  </Bouton>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
