"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Champ, Erreur, Saisie, Selection, Succes } from "@/components/ui";
import { REGIONS_NIGER } from "@/lib/niger";
import { basculerActivation, changerRole, modifierAgence } from "@/lib/actions/agence";
import { ETAT_INITIAL } from "@/lib/actions/commun";
import type { Agence, Profil, UserRole } from "@/lib/database.types";

const ROLES: { valeur: UserRole; label: string; description: string }[] = [
  { valeur: "proprietaire", label: "Propriétaire", description: "Tous les droits, gère l'équipe" },
  { valeur: "gestionnaire", label: "Gestionnaire", description: "Dossiers, groupes, catalogue" },
  { valeur: "comptable", label: "Comptable", description: "Encaissements et journal" },
  { valeur: "agent", label: "Agent", description: "Saisie des pèlerins et dossiers" },
];

export function FormulaireAgence({ agence, modifiable }: { agence: Agence; modifiable: boolean }) {
  const [etat, envoyer, enCours] = useActionState(modifierAgence, ETAT_INITIAL);

  return (
    <form action={envoyer} className="grid gap-4 p-5 sm:grid-cols-2">
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

      <Champ label="Nom de l'agence" requis className="sm:col-span-2">
        <Saisie name="nom" required defaultValue={agence.nom} disabled={!modifiable} />
      </Champ>

      <Champ label="N° d'agrément" aide="Délivré par la tutelle pour le Hajj et la Omra">
        <Saisie
          name="numero_agrement"
          defaultValue={agence.numero_agrement ?? ""}
          disabled={!modifiable}
        />
      </Champ>
      <Champ label="NIF">
        <Saisie name="nif" defaultValue={agence.nif ?? ""} disabled={!modifiable} />
      </Champ>

      <Champ label="Téléphone">
        <Saisie
          name="telephone"
          type="tel"
          defaultValue={agence.telephone ?? ""}
          disabled={!modifiable}
        />
      </Champ>
      <Champ label="E-mail">
        <Saisie name="email" type="email" defaultValue={agence.email ?? ""} disabled={!modifiable} />
      </Champ>

      <Champ label="Adresse" className="sm:col-span-2">
        <Saisie name="adresse" defaultValue={agence.adresse ?? ""} disabled={!modifiable} />
      </Champ>

      <Champ label="Ville">
        <Saisie name="ville" defaultValue={agence.ville ?? ""} disabled={!modifiable} />
      </Champ>
      <Champ label="Région">
        <Selection name="region" defaultValue={agence.region ?? ""} disabled={!modifiable}>
          <option value="">—</option>
          {REGIONS_NIGER.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Selection>
      </Champ>

      {modifiable && (
        <div className="sm:col-span-2">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
        </div>
      )}
    </form>
  );
}

export function LigneEquipe({
  profil,
  estMoi,
  gerable,
}: {
  profil: Profil;
  estMoi: boolean;
  gerable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-ardoise-900">
          {profil.nom_complet}
          {estMoi && <span className="ml-2 text-xs text-ardoise-400">(vous)</span>}
        </p>
        <p className="text-xs text-ardoise-500">
          {ROLES.find((r) => r.valeur === profil.role)?.description}
          {!profil.actif && <span className="ml-2 text-rose-600">accès suspendu</span>}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          defaultValue={profil.role}
          disabled={!gerable || estMoi || enCours}
          onChange={(e) => {
            const valeur = e.target.value;
            demarrer(async () => {
              await changerRole(profil.id, valeur);
              router.refresh();
            });
          }}
          className="rounded-lg border-0 bg-white px-3 py-1.5 text-sm ring-1 ring-inset ring-ardoise-300 disabled:bg-ardoise-50 disabled:text-ardoise-400"
        >
          {ROLES.map((r) => (
            <option key={r.valeur} value={r.valeur}>
              {r.label}
            </option>
          ))}
        </select>

        {gerable && !estMoi && (
          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                await basculerActivation(profil.id, !profil.actif);
                router.refresh();
              })
            }
            className="text-xs font-medium text-ardoise-500 hover:text-rose-600 disabled:opacity-50"
          >
            {profil.actif ? "Suspendre" : "Réactiver"}
          </button>
        )}
      </div>
    </li>
  );
}
