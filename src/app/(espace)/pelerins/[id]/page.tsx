import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import {
  Badge,
  Carte,
  EnTetePage,
  EtatVide,
  LienBouton,
  Tableau,
  Td,
  Th,
} from "@/components/ui";
import { STATUTS_DOSSIER } from "@/lib/niger";
import { age, alertePasseport, dateCourte, dateLongue, telephone, xof } from "@/lib/format";
import type { DossierFinance, Pelerin } from "@/lib/database.types";

export const metadata: Metadata = { title: "Fiche pèlerin" };

function Ligne({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <dt className="text-xs uppercase tracking-wide text-ardoise-500">{libelle}</dt>
      <dd className="mt-0.5 text-sm text-ardoise-900">{valeur || "—"}</dd>
    </div>
  );
}

export default async function PageFichePelerin({ params }: { params: Promise<{ id: string }> }) {
  await exigerSession();
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data } = await supabase.from("pelerins").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const pelerin = data as Pelerin;

  const [{ data: dossiersBruts }, { data: mahram }] = await Promise.all([
    supabase
      .from("v_dossiers_finance")
      .select("*")
      .eq("pelerin_id", id)
      .order("inscrit_le", { ascending: false }),
    pelerin.mahram_pelerin_id
      ? supabase
          .from("pelerins")
          .select("id, nom, prenom, matricule")
          .eq("id", pelerin.mahram_pelerin_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const dossiers = (dossiersBruts ?? []) as DossierFinance[];
  const alerte = alertePasseport(pelerin.passeport_expire_le);
  const ans = age(pelerin.date_naissance);

  return (
    <>
      <EnTetePage
        titre={`${pelerin.prenom} ${pelerin.nom}`}
        description={`${pelerin.matricule} · ${pelerin.sexe === "F" ? "Femme" : "Homme"}${
          ans !== null ? ` · ${ans} ans` : ""
        }`}
        action={
          <div className="flex gap-2">
            <LienBouton href={`/pelerins/${id}/modifier`} variante="secondaire">
              Modifier
            </LienBouton>
            <LienBouton href={`/dossiers/nouveau?pelerin=${id}`}>Nouveau dossier</LienBouton>
          </div>
        }
      />

      {alerte !== "aucune" && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5">
          <p className="text-sm font-medium text-rose-800">
            {alerte === "expire"
              ? "Passeport expiré"
              : alerte === "insuffisante"
                ? "Validité du passeport insuffisante pour le visa"
                : "Passeport bientôt à renouveler"}
          </p>
          <p className="mt-0.5 text-sm text-rose-700">
            Expiration le {dateLongue(pelerin.passeport_expire_le)}. Les autorités saoudiennes
            exigent six mois de validité après la date d&apos;entrée.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Carte titre="Dossiers d'inscription">
            {dossiers.length === 0 ? (
              <EtatVide
                titre="Aucun dossier"
                description="Ce pèlerin n'est inscrit à aucune saison pour le moment."
                action={
                  <LienBouton href={`/dossiers/nouveau?pelerin=${id}`} variante="secondaire">
                    Créer un dossier
                  </LienBouton>
                }
              />
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <Th>Référence</Th>
                    <Th>Forfait</Th>
                    <Th>Statut</Th>
                    <Th className="text-right">Net</Th>
                    <Th className="text-right">Solde</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {dossiers.map((d) => (
                    <tr key={d.dossier_id} className="hover:bg-ardoise-50">
                      <Td>
                        <Link
                          href={`/dossiers/${d.dossier_id}`}
                          className="tabular font-medium text-ardoise-900 hover:text-marque-700"
                        >
                          {d.reference}
                        </Link>
                        <span className="block text-xs text-ardoise-400">
                          inscrit le {dateCourte(d.inscrit_le)}
                        </span>
                      </Td>
                      <Td>{d.forfait_nom}</Td>
                      <Td>
                        <Badge ton={STATUTS_DOSSIER[d.statut].ton}>
                          {STATUTS_DOSSIER[d.statut].label}
                        </Badge>
                      </Td>
                      <Td className="tabular text-right">{xof(d.net_xof)}</Td>
                      <Td
                        className={`tabular text-right font-medium ${
                          d.solde_xof > 0 ? "text-sable-700" : "text-marque-700"
                        }`}
                      >
                        {xof(d.solde_xof)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>

          <Carte titre="État civil">
            <dl className="grid divide-y divide-ardoise-100 sm:grid-cols-2 sm:divide-y-0">
              <Ligne libelle="Date de naissance" valeur={dateLongue(pelerin.date_naissance)} />
              <Ligne libelle="Lieu de naissance" valeur={pelerin.lieu_naissance} />
              <Ligne libelle="Nationalité" valeur={pelerin.nationalite} />
              <Ligne libelle="NIN" valeur={pelerin.nin} />
              <Ligne libelle="Profession" valeur={pelerin.profession} />
              <Ligne libelle="Groupe sanguin" valeur={pelerin.groupe_sanguin} />
              <Ligne
                libelle="Hajj déjà effectué"
                valeur={pelerin.deja_effectue_hajj ? "Oui" : "Non"}
              />
              <Ligne libelle="Antécédents médicaux" valeur={pelerin.antecedents_medicaux} />
            </dl>
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte titre="Coordonnées">
            <dl className="divide-y divide-ardoise-100">
              <Ligne libelle="Téléphone" valeur={telephone(pelerin.telephone)} />
              <Ligne
                libelle="Téléphone secondaire"
                valeur={telephone(pelerin.telephone_secondaire)}
              />
              <Ligne libelle="E-mail" valeur={pelerin.email} />
              <Ligne
                libelle="Localisation"
                valeur={[pelerin.adresse, pelerin.ville, pelerin.region]
                  .filter(Boolean)
                  .join(", ")}
              />
            </dl>
          </Carte>

          <Carte titre="Passeport">
            <dl className="divide-y divide-ardoise-100">
              <Ligne libelle="Numéro" valeur={pelerin.passeport_numero} />
              <Ligne libelle="Délivré le" valeur={dateCourte(pelerin.passeport_delivre_le)} />
              <Ligne libelle="Expire le" valeur={dateCourte(pelerin.passeport_expire_le)} />
              <Ligne libelle="Lieu de délivrance" valeur={pelerin.passeport_lieu} />
            </dl>
          </Carte>

          <Carte titre="Urgence et mahram">
            <dl className="divide-y divide-ardoise-100">
              <Ligne
                libelle="Contact d'urgence"
                valeur={
                  pelerin.contact_urgence_nom ? (
                    <>
                      {pelerin.contact_urgence_nom}
                      {pelerin.contact_urgence_lien ? ` (${pelerin.contact_urgence_lien})` : ""}
                      <span className="block text-ardoise-500">
                        {telephone(pelerin.contact_urgence_tel)}
                      </span>
                    </>
                  ) : null
                }
              />
              <Ligne
                libelle="Mahram"
                valeur={
                  mahram ? (
                    <Link
                      href={`/pelerins/${mahram.id}`}
                      className="text-marque-700 hover:underline"
                    >
                      {mahram.prenom} {mahram.nom}
                      {pelerin.mahram_lien ? ` — ${pelerin.mahram_lien}` : ""}
                    </Link>
                  ) : pelerin.sexe === "F" ? (
                    <Badge ton="attente">Non renseigné</Badge>
                  ) : null
                }
              />
            </dl>
          </Carte>

          {pelerin.notes && (
            <Carte titre="Observations">
              <p className="whitespace-pre-line px-5 py-4 text-sm text-ardoise-700">
                {pelerin.notes}
              </p>
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}
