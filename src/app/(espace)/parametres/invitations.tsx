"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, UserPlusIcon } from "lucide-react";
import { Bouton, Champ, Erreur, Saisie, Selection } from "@/components/ui";
import { ORDRE_ROLES, ROLES } from "@/lib/roles";
import { dateCourte, telephone as formaterTel } from "@/lib/format";
import { creerCompteCollaborateur, revoquerInvitation } from "@/lib/actions/equipe";
import { ETAT_INITIAL } from "@/lib/actions/commun";
import type { Invitation } from "@/lib/database.types";

export function PanneauInvitations({
  invitations,
  proprietaire,
}: {
  invitations: Invitation[];
  proprietaire: boolean;
}) {
  const router = useRouter();
  const [etat, envoyer, enCours] = useActionState(creerCompteCollaborateur, ETAT_INITIAL);
  const [suppression, demarrer] = useTransition();
  const [copie, setCopie] = useState<string | null>(null);

  async function copier(texte: string, cle: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(cle);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      // Le presse-papier peut être refusé : le contenu reste lisible à l'écran.
    }
  }

  if (!proprietaire) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ardoise-500">
        Seul le propriétaire de l&apos;agence peut ajouter des collaborateurs.
      </p>
    );
  }

  // Le code créé à l'instant : c'est le seul moment où on le met en avant.
  const dernier = etat.statut === "ok" ? etat.id : null;
  const invitationDerniere = dernier
    ? invitations.find((i) => i.code === dernier)
    : undefined;

  return (
    <div>
      {dernier && (
        <div className="border-b border-ardoise-200 bg-marque-50 px-5 py-4">
          <p className="text-sm font-semibold text-marque-900">
            {etat.statut === "ok" ? etat.message : null}
          </p>
          <p className="mt-1 text-sm text-marque-800">
            Transmettez ces deux informations à la personne. Elle ouvre{" "}
            <span className="font-medium">/rejoindre</span>, les saisit, et son espace
            s&apos;ouvre avec son rôle.
          </p>

          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-marque-200">
              <dt className="text-xs uppercase tracking-wide text-ardoise-500">Adresse e-mail</dt>
              <dd className="mt-1 truncate text-sm font-medium text-ardoise-900">
                {invitationDerniere?.email ?? "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-marque-200">
              <dt className="text-xs uppercase tracking-wide text-ardoise-500">
                Code d&apos;entrée
              </dt>
              <dd className="tabular mt-1 text-lg font-bold tracking-[0.2em] text-ardoise-950">
                {dernier}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <Bouton
              type="button"
              variante="secondaire"
              onClick={() =>
                copier(
                  `Espace MaMaAgence\nAdresse : ${invitationDerniere?.email ?? ""}\nCode : ${dernier}\nConnexion : ${window.location.origin}/rejoindre`,
                  "bloc",
                )
              }
            >
              {copie === "bloc" ? (
                <>
                  <CheckIcon className="h-4 w-4" aria-hidden />
                  Copié
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" aria-hidden />
                  Copier le message à envoyer
                </>
              )}
            </Bouton>
          </div>

          <p className="mt-3 text-xs text-marque-700">
            Le code tient lieu de mot de passe d&apos;entrée. Invitez la personne à en choisir
            un autre depuis ses paramètres dès sa première connexion.
          </p>
        </div>
      )}

      <form action={envoyer} className="grid gap-4 border-b border-ardoise-200 p-5 sm:grid-cols-2">
        {etat.statut === "erreur" && (
          <div className="sm:col-span-2">
            <Erreur>{etat.message}</Erreur>
          </div>
        )}

        <Champ label="Nom complet" requis>
          <Saisie name="nom_complet" required placeholder="Aïcha Oumarou" />
        </Champ>

        <Champ label="Adresse e-mail" requis aide="Servira d'identifiant de connexion">
          <Saisie name="email" type="email" required placeholder="aicha@agence.ne" />
        </Champ>

        <Champ label="Téléphone">
          <span className="flex">
            <span className="inline-flex items-center rounded-l-lg bg-ardoise-100 px-3 text-sm text-ardoise-600 ring-1 ring-inset ring-ardoise-300">
              +227
            </span>
            <Saisie name="telephone" type="tel" placeholder="96 45 12 78" className="rounded-l-none" />
          </span>
        </Champ>

        <Champ label="Rôle accordé" requis>
          <Selection name="role" defaultValue="agent">
            {ORDRE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].label} — {ROLES[r].description}
              </option>
            ))}
          </Selection>
        </Champ>

        <div className="sm:col-span-2">
          <Bouton type="submit" disabled={enCours}>
            <UserPlusIcon className="h-4 w-4" aria-hidden />
            {enCours ? "Création du compte…" : "Créer le compte"}
          </Bouton>
        </div>
      </form>

      {invitations.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-ardoise-500">
          Aucun collaborateur ajouté pour l&apos;instant.
        </p>
      ) : (
        <ul className="divide-y divide-ardoise-100">
          {invitations.slice(0, 10).map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ardoise-900">
                  {i.nom_prevu ?? i.email ?? i.code}
                </p>
                <p className="truncate text-xs text-ardoise-500">
                  {ROLES[i.role].label}
                  {i.email ? ` · ${i.email}` : ""}
                  {i.telephone_prevu ? ` · ${formaterTel(i.telephone_prevu)}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <code className="tabular rounded bg-ardoise-100 px-2.5 py-1 text-xs font-semibold tracking-widest text-ardoise-700">
                  {i.code}
                </code>
                <button
                  type="button"
                  onClick={() => copier(i.code, i.id)}
                  className="text-xs font-medium text-marque-700 hover:underline"
                >
                  {copie === i.id ? "Copié" : "Copier"}
                </button>
                <span className="text-xs text-ardoise-400">{dateCourte(i.cree_le)}</span>
                <button
                  type="button"
                  disabled={suppression}
                  onClick={() =>
                    demarrer(async () => {
                      await revoquerInvitation(i.id);
                      router.refresh();
                    })
                  }
                  className="text-xs text-ardoise-400 hover:text-rose-600 disabled:opacity-50"
                  title="Retirer cette ligne de la liste"
                >
                  Effacer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
