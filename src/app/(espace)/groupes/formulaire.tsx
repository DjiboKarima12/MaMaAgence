"use client";

import { useActionState } from "react";
import { Bouton, Champ, Erreur, Saisie, Selection, Succes } from "@/components/ui";
import { creerGroupe } from "@/lib/actions/catalogue";
import { ETAT_INITIAL } from "@/lib/actions/commun";

export default function FormulaireGroupe({
  saisons,
}: {
  saisons: { id: string; libelle: string }[];
}) {
  const [etat, envoyer, enCours] = useActionState(creerGroupe, ETAT_INITIAL);

  const champs = etat.statut === "erreur" ? (etat.champs ?? {}) : {};
  const err = (nom: string) =>
    champs[nom] ? <span className="mt-1 block text-xs text-rose-600">{champs[nom]}</span> : null;

  if (saisons.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ardoise-500">
        Créez d&apos;abord une saison dans le catalogue.
      </p>
    );
  }

  return (
    <form action={envoyer} className="grid gap-3 p-5 sm:grid-cols-2">
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

      <Champ label="Saison" requis>
        <Selection name="saison_id" required defaultValue={saisons[0]?.id}>
          {saisons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.libelle}
            </option>
          ))}
        </Selection>
      </Champ>
      <Champ label="Nom du groupe" requis>
        <Saisie name="nom" required placeholder="Vol 1 — Niamey" />
      </Champ>

      <Champ label="Date de départ">
        <Saisie type="date" name="date_depart" />
      </Champ>
      <Champ label="Date de retour">
        <Saisie type="date" name="date_retour" />
        {err("date_retour")}
      </Champ>

      <Champ label="Compagnie aérienne">
        <Saisie name="compagnie_aerienne" placeholder="Saudia, Turkish, ASKY…" />
      </Champ>
      <Champ label="N° de vol">
        <Saisie name="numero_vol" placeholder="SV 1234" />
      </Champ>

      <Champ label="Capacité">
        <Saisie type="number" name="capacite" min={1} placeholder="150" />
      </Champ>
      <Champ label="Encadrant">
        <Saisie name="encadrant_nom" />
      </Champ>
      <Champ label="Téléphone de l'encadrant" className="sm:col-span-2">
        <Saisie name="encadrant_telephone" type="tel" />
      </Champ>

      <div className="sm:col-span-2">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le groupe"}
        </Bouton>
      </div>
    </form>
  );
}
