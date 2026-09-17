"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Champ, Erreur, Saisie, Selection, Succes, Zone } from "@/components/ui";
import {
  basculerForfait,
  basculerSaison,
  creerForfait,
  creerSaison,
} from "@/lib/actions/catalogue";
import { ETAT_INITIAL } from "@/lib/actions/commun";

export function FormulaireSaison() {
  const [etat, envoyer, enCours] = useActionState(creerSaison, ETAT_INITIAL);
  const anneeCourante = new Date().getFullYear();

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

      <Champ label="Libellé" requis className="sm:col-span-2">
        <Saisie name="libelle" required placeholder="Hajj 1447 / 2026" />
      </Champ>
      <Champ label="Type" requis>
        <Selection name="type" defaultValue="hajj">
          <option value="hajj">Hajj</option>
          <option value="omra">Omra</option>
        </Selection>
      </Champ>
      <Champ label="Année grégorienne" requis>
        <Saisie type="number" name="annee_greg" defaultValue={anneeCourante + 1} required />
      </Champ>
      <Champ label="Année hégirienne">
        <Saisie type="number" name="annee_hijri" placeholder="1447" />
      </Champ>
      <Champ label="Quota de places" aide="Places attribuées par la tutelle">
        <Saisie type="number" name="quota" min={0} />
      </Champ>

      <div className="sm:col-span-2">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer la saison"}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulaireForfait({
  saisons,
}: {
  saisons: { id: string; libelle: string; type: string }[];
}) {
  const [etat, envoyer, enCours] = useActionState(creerForfait, ETAT_INITIAL);
  const [saisonId, setSaisonId] = useState(saisons[0]?.id ?? "");
  const saison = saisons.find((s) => s.id === saisonId);

  const champs = etat.statut === "erreur" ? (etat.champs ?? {}) : {};
  const err = (nom: string) =>
    champs[nom] ? <span className="mt-1 block text-xs text-rose-600">{champs[nom]}</span> : null;

  if (saisons.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ardoise-500">
        Créez d&apos;abord une saison.
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
        <Selection
          name="saison_id"
          value={saisonId}
          onChange={(e) => setSaisonId(e.target.value)}
          required
        >
          {saisons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.libelle}
            </option>
          ))}
        </Selection>
      </Champ>
      <Champ label="Type" requis>
        <Selection name="type" key={saison?.type} defaultValue={saison?.type ?? "hajj"}>
          <option value="hajj">Hajj</option>
          <option value="omra">Omra</option>
        </Selection>
      </Champ>

      <Champ label="Nom du forfait" requis className="sm:col-span-2">
        <Saisie name="nom" required placeholder="Hajj confort — chambre quadruple" />
      </Champ>

      <Champ label="Prix (FCFA)" requis>
        <Saisie name="prix_xof" inputMode="numeric" required placeholder="3500000" />
        {err("prix_xof")}
      </Champ>
      <Champ label="Acompte exigé (FCFA)">
        <Saisie name="acompte_xof" inputMode="numeric" placeholder="1000000" />
        {err("acompte_xof")}
      </Champ>

      <Champ label="Durée (jours)">
        <Saisie type="number" name="duree_jours" min={1} placeholder="30" />
      </Champ>
      <Champ label="Distance du Haram">
        <Saisie name="distance_haram" placeholder="400 m" />
      </Champ>

      <Champ label="Hôtel à Makkah">
        <Saisie name="hotel_makkah" />
      </Champ>
      <Champ label="Hôtel à Madinah">
        <Saisie name="hotel_madinah" />
      </Champ>

      <Champ
        label="Prestations incluses"
        className="sm:col-span-2"
        aide="Une prestation par ligne"
      >
        <Zone
          name="inclusions"
          rows={4}
          placeholder={"Billet d'avion aller-retour\nVisa\nHébergement\nRestauration\nTransport interne"}
        />
      </Champ>

      <div className="sm:col-span-2">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le forfait"}
        </Bouton>
      </div>
    </form>
  );
}

export function BasculeSaison({ saisonId, ouverte }: { saisonId: string; ouverte: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          await basculerSaison(saisonId, !ouverte);
          router.refresh();
        })
      }
      className="text-xs font-medium text-marque-700 hover:underline disabled:opacity-50"
    >
      {ouverte ? "Clôturer" : "Rouvrir"}
    </button>
  );
}

export function BasculeForfait({ forfaitId, actif }: { forfaitId: string; actif: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          await basculerForfait(forfaitId, !actif);
          router.refresh();
        })
      }
      className="text-xs font-medium text-marque-700 hover:underline disabled:opacity-50"
    >
      {actif ? "Désactiver" : "Activer"}
    </button>
  );
}
