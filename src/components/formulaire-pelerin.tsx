"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Carte, Champ, Erreur, Saisie, Selection, Succes, Zone } from "@/components/ui";
import { LIENS_MAHRAM, REGIONS_NIGER } from "@/lib/niger";
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/commun";
import type { Pelerin } from "@/lib/database.types";

export interface MahramPossible {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

export default function FormulairePelerin({
  action,
  pelerin,
  mahramPossibles,
  redirectionBase,
}: {
  action: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
  pelerin?: Pelerin;
  mahramPossibles: MahramPossible[];
  /** Préfixe d'URL vers lequel rediriger après création, ex. "/pelerins". */
  redirectionBase?: string;
}) {
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  const [sexe, setSexe] = useState<string>(pelerin?.sexe ?? "M");

  useEffect(() => {
    if (etat.statut === "ok" && etat.id && redirectionBase) {
      router.push(`${redirectionBase}/${etat.id}`);
    }
  }, [etat, redirectionBase, router]);

  const champs = etat.statut === "erreur" ? (etat.champs ?? {}) : {};
  const err = (nom: string) =>
    champs[nom] ? <span className="mt-1 block text-xs text-rose-600">{champs[nom]}</span> : null;

  return (
    <form action={envoyer} className="space-y-4">
      {etat.statut === "erreur" && <Erreur>{etat.message}</Erreur>}
      {etat.statut === "ok" && <Succes>{etat.message}</Succes>}

      <Carte titre="État civil" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Prénom" requis>
            <Saisie name="prenom" required defaultValue={pelerin?.prenom ?? ""} />
            {err("prenom")}
          </Champ>
          <Champ label="Nom" requis>
            <Saisie name="nom" required defaultValue={pelerin?.nom ?? ""} />
            {err("nom")}
          </Champ>
          <Champ label="Sexe" requis>
            <Selection name="sexe" value={sexe} onChange={(e) => setSexe(e.target.value)}>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
            </Selection>
          </Champ>
          <Champ label="Date de naissance">
            <Saisie type="date" name="date_naissance" defaultValue={pelerin?.date_naissance ?? ""} />
            {err("date_naissance")}
          </Champ>
          <Champ label="Lieu de naissance">
            <Saisie name="lieu_naissance" defaultValue={pelerin?.lieu_naissance ?? ""} />
          </Champ>
          <Champ label="NIN" aide="Numéro d'identification nationale">
            <Saisie name="nin" defaultValue={pelerin?.nin ?? ""} />
          </Champ>
          <Champ label="Profession">
            <Saisie name="profession" defaultValue={pelerin?.profession ?? ""} />
          </Champ>
          <Champ label="Groupe sanguin">
            <Selection name="groupe_sanguin" defaultValue={pelerin?.groupe_sanguin ?? ""}>
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Selection>
          </Champ>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-ardoise-700">
            <input
              type="checkbox"
              name="deja_effectue_hajj"
              defaultChecked={pelerin?.deja_effectue_hajj ?? false}
              className="h-4 w-4 rounded border-ardoise-300 text-marque-600 focus:ring-marque-500"
            />
            A déjà effectué le Hajj
          </label>
        </div>
      </Carte>

      <Carte titre="Coordonnées" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Téléphone">
            <Saisie name="telephone" type="tel" placeholder="+227 90 00 00 00" defaultValue={pelerin?.telephone ?? ""} />
          </Champ>
          <Champ label="Téléphone secondaire">
            <Saisie name="telephone_secondaire" type="tel" defaultValue={pelerin?.telephone_secondaire ?? ""} />
          </Champ>
          <Champ label="E-mail">
            <Saisie name="email" type="email" defaultValue={pelerin?.email ?? ""} />
          </Champ>
          <Champ label="Région">
            <Selection name="region" defaultValue={pelerin?.region ?? ""}>
              <option value="">—</option>
              {REGIONS_NIGER.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Selection>
          </Champ>
          <Champ label="Ville / village">
            <Saisie name="ville" defaultValue={pelerin?.ville ?? ""} />
          </Champ>
          <Champ label="Quartier / adresse">
            <Saisie name="adresse" defaultValue={pelerin?.adresse ?? ""} />
          </Champ>
        </div>
      </Carte>

      <Carte titre="Passeport" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Champ label="Numéro">
            <Saisie name="passeport_numero" defaultValue={pelerin?.passeport_numero ?? ""} />
          </Champ>
          <Champ label="Délivré le">
            <Saisie type="date" name="passeport_delivre_le" defaultValue={pelerin?.passeport_delivre_le ?? ""} />
          </Champ>
          <Champ label="Expire le" aide="Validité de 6 mois exigée après l'entrée">
            <Saisie type="date" name="passeport_expire_le" defaultValue={pelerin?.passeport_expire_le ?? ""} />
          </Champ>
          <Champ label="Lieu de délivrance">
            <Saisie name="passeport_lieu" defaultValue={pelerin?.passeport_lieu ?? ""} />
          </Champ>
        </div>
      </Carte>

      <Carte titre="Contact d'urgence et mahram" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Nom du contact">
            <Saisie name="contact_urgence_nom" defaultValue={pelerin?.contact_urgence_nom ?? ""} />
          </Champ>
          <Champ label="Téléphone du contact">
            <Saisie name="contact_urgence_tel" type="tel" defaultValue={pelerin?.contact_urgence_tel ?? ""} />
          </Champ>
          <Champ label="Lien de parenté">
            <Saisie name="contact_urgence_lien" defaultValue={pelerin?.contact_urgence_lien ?? ""} />
          </Champ>

          {sexe === "F" && (
            <>
              <Champ
                label="Mahram accompagnateur"
                className="lg:col-span-2"
                aide="Pèlerin masculin déjà enregistré qui accompagne la pèlerine"
              >
                <Selection name="mahram_pelerin_id" defaultValue={pelerin?.mahram_pelerin_id ?? ""}>
                  <option value="">Aucun</option>
                  {mahramPossibles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.prenom} {m.nom} ({m.matricule})
                    </option>
                  ))}
                </Selection>
              </Champ>
              <Champ label="Lien avec le mahram">
                <Selection name="mahram_lien" defaultValue={pelerin?.mahram_lien ?? ""}>
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
        </div>
      </Carte>

      <Carte titre="Notes" className="p-0">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Champ label="Antécédents médicaux" aide="Utile pour l'encadrant sur place">
            <Zone name="antecedents_medicaux" rows={3} defaultValue={pelerin?.antecedents_medicaux ?? ""} />
          </Champ>
          <Champ label="Observations">
            <Zone name="notes" rows={3} defaultValue={pelerin?.notes ?? ""} />
          </Champ>
        </div>
      </Carte>

      <div className="flex justify-end gap-3">
        <Bouton type="button" variante="secondaire" onClick={() => router.back()}>
          Annuler
        </Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : pelerin ? "Enregistrer les modifications" : "Créer le pèlerin"}
        </Bouton>
      </div>
    </form>
  );
}
