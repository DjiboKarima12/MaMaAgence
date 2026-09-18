"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, TicketIcon } from "lucide-react";
import { Badge, Bouton, Champ, Erreur, Saisie, Selection } from "@/components/ui";
import { ORDRE_ROLES, ROLES } from "@/lib/roles";
import { dateCourte } from "@/lib/format";
import { genererInvitation, revoquerInvitation } from "@/lib/actions/equipe";
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
  const [etat, envoyer, enCours] = useActionState(genererInvitation, ETAT_INITIAL);
  const [suppression, demarrer] = useTransition();
  const [copie, setCopie] = useState<string | null>(null);

  async function copier(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(code);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      // Le presse-papier peut être refusé : le code reste lisible à l'écran.
    }
  }

  if (!proprietaire) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ardoise-500">
        Seul le propriétaire de l&apos;agence peut inviter des collaborateurs.
      </p>
    );
  }

  const enAttente = invitations.filter((i) => !i.utilise_le && i.expire_le > new Date().toISOString());
  const anciennes = invitations.filter((i) => i.utilise_le || i.expire_le <= new Date().toISOString());

  return (
    <div>
      {/* Code fraîchement généré */}
      {etat.statut === "ok" && etat.id && (
        <div className="border-b border-ardoise-200 bg-marque-50 px-5 py-4">
          <p className="text-sm font-medium text-marque-900">Code créé</p>
          <p className="mt-1 text-sm text-marque-800">
            Transmettez-le à votre collaborateur. Il créera son compte puis saisira ce code.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="tabular rounded-lg bg-white px-4 py-2.5 text-xl font-bold tracking-[0.2em] text-ardoise-950 ring-1 ring-inset ring-marque-300">
              {etat.id}
            </code>
            <Bouton type="button" variante="secondaire" onClick={() => copier(etat.id!)}>
              {copie === etat.id ? (
                <>
                  <CheckIcon className="h-4 w-4" aria-hidden />
                  Copié
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" aria-hidden />
                  Copier
                </>
              )}
            </Bouton>
          </div>
        </div>
      )}

      <form action={envoyer} className="grid gap-4 border-b border-ardoise-200 p-5 sm:grid-cols-4">
        {etat.statut === "erreur" && (
          <div className="sm:col-span-4">
            <Erreur>{etat.message}</Erreur>
          </div>
        )}

        <Champ label="Rôle accordé" requis>
          <Selection name="role" defaultValue="agent">
            {ORDRE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].label}
              </option>
            ))}
          </Selection>
        </Champ>
        <Champ label="Nom du collaborateur" aide="Facultatif, pour vous y retrouver">
          <Saisie name="nom_prevu" placeholder="Aïcha Oumarou" />
        </Champ>
        <Champ label="Valable (jours)">
          <Saisie name="jours" type="number" min={1} max={90} defaultValue={14} />
        </Champ>
        <div className="flex items-end">
          <Bouton type="submit" disabled={enCours} className="w-full">
            <TicketIcon className="h-4 w-4" aria-hidden />
            {enCours ? "Création…" : "Créer un code"}
          </Bouton>
        </div>
      </form>

      {enAttente.length > 0 && (
        <ul className="divide-y divide-ardoise-100">
          {enAttente.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <code className="tabular rounded bg-ardoise-100 px-2.5 py-1 text-sm font-semibold tracking-widest text-ardoise-900">
                  {i.code}
                </code>
                <span className="text-sm text-ardoise-600">
                  {ROLES[i.role].label}
                  {i.nom_prevu ? ` · ${i.nom_prevu}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ardoise-500">
                  expire le {dateCourte(i.expire_le)}
                </span>
                <button
                  type="button"
                  onClick={() => copier(i.code)}
                  className="text-xs font-medium text-marque-700 hover:underline"
                >
                  {copie === i.code ? "Copié" : "Copier"}
                </button>
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
                >
                  Annuler
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {anciennes.length > 0 && (
        <ul className="divide-y divide-ardoise-100 bg-ardoise-50/50">
          {anciennes.slice(0, 5).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="tabular text-xs text-ardoise-400">{i.code}</span>
              <Badge ton="neutre">
                {i.utilise_le ? `Utilisé le ${dateCourte(i.utilise_le)}` : "Expiré"}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {enAttente.length === 0 && etat.statut !== "ok" && (
        <p className="px-5 py-6 text-center text-sm text-ardoise-500">
          Aucun code en attente. Créez-en un pour ajouter un collaborateur.
        </p>
      )}
    </div>
  );
}
