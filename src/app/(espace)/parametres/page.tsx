import type { Metadata } from "next";
import { exigerSession, peut } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Carte, EnTetePage } from "@/components/ui";
import { dateCourte } from "@/lib/format";
import { libelleRole } from "@/lib/roles";
import { FormulaireAgence, LigneEquipe } from "./formulaires";
import type { Profil } from "@/lib/database.types";

export const metadata: Metadata = { title: "Paramètres" };

export default async function PageParametres() {
  const session = await exigerSession();
  const supabase = await creerClientServeur();

  const { data } = await supabase.from("profils").select("*").order("cree_le");
  const equipe = (data ?? []) as Profil[];
  const proprietaire = peut(session, "proprietaire");

  return (
    <>
      <EnTetePage
        titre="Paramètres"
        description="Informations de l'agence et gestion des accès."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Carte titre="Agence">
            <FormulaireAgence agence={session.agence} modifiable={proprietaire} />
          </Carte>

          <Carte titre="Équipe" className="mt-4">
            <ul className="divide-y divide-ardoise-100">
              {equipe.map((p) => (
                <LigneEquipe
                  key={p.id}
                  profil={p}
                  estMoi={p.id === session.utilisateurId}
                  gerable={proprietaire}
                />
              ))}
            </ul>
            <p className="border-t border-ardoise-200 px-5 py-3 text-xs text-ardoise-500">
              Pour ajouter un collaborateur, invitez-le depuis la console Supabase
              (Authentication → Users), puis créez son profil. Une page d&apos;invitation intégrée
              est prévue dans une prochaine version.
            </p>
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte titre="Votre compte">
            <dl className="divide-y divide-ardoise-100 text-sm">
              {[
                ["Nom", session.profil.nom_complet],
                ["E-mail", session.email],
                ["Rôle", libelleRole(session.profil.role)],
                ["Membre depuis", dateCourte(session.profil.cree_le)],
              ].map(([k, v]) => (
                <div key={k} className="px-5 py-2.5">
                  <dt className="text-xs uppercase tracking-wide text-ardoise-500">{k}</dt>
                  <dd className="mt-0.5 text-ardoise-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Carte titre="Sécurité des données">
            <div className="space-y-3 px-5 py-4 text-sm text-ardoise-600">
              <p>
                Les données de votre agence sont cloisonnées au niveau de la base : aucune autre
                agence ne peut les lire, même en cas d&apos;erreur applicative.
              </p>
              <p>
                Les pièces justificatives sont stockées dans un espace privé, accessible uniquement
                par des liens signés à durée limitée.
              </p>
            </div>
          </Carte>
        </div>
      </div>
    </>
  );
}
