import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { MOYENS_PAIEMENT } from "@/lib/niger";
import { dateLongue, enLettres, telephone, xof } from "@/lib/format";
import BoutonImpression from "./bouton-impression";
import type { Paiement } from "@/lib/database.types";

export const metadata: Metadata = { title: "Reçu" };

type PaiementComplet = Paiement & {
  dossiers: {
    reference: string;
    prix_xof: number;
    remise_xof: number;
    pelerins: { nom: string; prenom: string; matricule: string; telephone: string | null } | null;
    forfaits: { nom: string } | null;
  } | null;
};

export default async function PageRecu({ params }: { params: Promise<{ id: string }> }) {
  const session = await exigerAcces("dossiers");
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data } = await supabase
    .from("paiements")
    .select(
      "*, dossiers(reference, prix_xof, remise_xof, pelerins(nom, prenom, matricule, telephone), forfaits(nom))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const paiement = data as PaiementComplet;
  const dossier = paiement.dossiers;
  const pelerin = dossier?.pelerins;

  // Total réglé sur ce dossier, pour afficher le solde au moment de l'édition.
  const { data: finance } = await supabase
    .from("v_dossiers_finance")
    .select("net_xof, regle_xof, solde_xof")
    .eq("dossier_id", paiement.dossier_id)
    .maybeSingle();

  const agence = session.agence;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      <div className="sans-impression mb-6 flex justify-end">
        <BoutonImpression />
      </div>

      <article className="rounded-xl border border-ardoise-200 bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-ardoise-200 pb-6">
          <div>
            <h1 className="text-xl font-semibold text-ardoise-950">{agence.nom}</h1>
            <p className="mt-1 text-sm text-ardoise-600">
              {[agence.adresse, agence.ville, agence.region].filter(Boolean).join(", ")}
            </p>
            {agence.telephone && (
              <p className="text-sm text-ardoise-600">{telephone(agence.telephone)}</p>
            )}
            {agence.numero_agrement && (
              <p className="mt-1 text-xs text-ardoise-500">
                Agrément n° {agence.numero_agrement}
              </p>
            )}
            {agence.nif && <p className="text-xs text-ardoise-500">NIF {agence.nif}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Reçu de versement</p>
            <p className="tabular mt-1 text-lg font-semibold text-ardoise-950">
              {paiement.numero_recu}
            </p>
            <p className="mt-1 text-sm text-ardoise-600">{dateLongue(paiement.paye_le)}</p>
            {paiement.statut === "annule" && (
              <p className="mt-2 inline-block rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase text-rose-700">
                Annulé
              </p>
            )}
          </div>
        </header>

        <section className="grid gap-6 border-b border-ardoise-200 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Reçu de</p>
            <p className="mt-1 text-sm font-medium text-ardoise-900">
              {pelerin ? `${pelerin.prenom} ${pelerin.nom}` : "—"}
            </p>
            {pelerin && (
              <p className="tabular text-sm text-ardoise-600">
                {pelerin.matricule}
                {pelerin.telephone ? ` · ${telephone(pelerin.telephone)}` : ""}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Dossier</p>
            <p className="tabular mt-1 text-sm font-medium text-ardoise-900">
              {dossier?.reference ?? "—"}
            </p>
            <p className="text-sm text-ardoise-600">{dossier?.forfaits?.nom ?? ""}</p>
          </div>
        </section>

        <section className="py-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-ardoise-600">Montant versé</p>
            <p className="tabular text-2xl font-semibold text-ardoise-950">
              {xof(paiement.montant_xof)}
            </p>
          </div>
          <p className="mt-2 text-sm italic text-ardoise-600">
            Arrêté la présente quittance à la somme de {enLettres(paiement.montant_xof)} francs CFA.
          </p>

          <dl className="mt-6 divide-y divide-ardoise-100 border-t border-ardoise-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-ardoise-600">Moyen de paiement</dt>
              <dd className="font-medium text-ardoise-900">
                {MOYENS_PAIEMENT[paiement.moyen].label}
              </dd>
            </div>
            {paiement.reference_operateur && (
              <div className="flex justify-between py-2">
                <dt className="text-ardoise-600">Référence de transaction</dt>
                <dd className="tabular font-medium text-ardoise-900">
                  {paiement.reference_operateur}
                </dd>
              </div>
            )}
            {finance && (
              <>
                <div className="flex justify-between py-2">
                  <dt className="text-ardoise-600">Net du dossier</dt>
                  <dd className="tabular text-ardoise-900">{xof(finance.net_xof)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-ardoise-600">Total réglé à ce jour</dt>
                  <dd className="tabular text-ardoise-900">{xof(finance.regle_xof)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="font-medium text-ardoise-900">Solde restant dû</dt>
                  <dd className="tabular font-semibold text-ardoise-950">
                    {xof(finance.solde_xof)}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {paiement.note && (
            <p className="mt-4 text-sm text-ardoise-600">Observation : {paiement.note}</p>
          )}
        </section>

        <footer className="grid gap-10 border-t border-ardoise-200 pt-8 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Le pèlerin</p>
            <div className="mt-10 border-t border-ardoise-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ardoise-500">
              Pour l&apos;agence — {session.profil.nom_complet}
            </p>
            <div className="mt-10 border-t border-ardoise-300" />
          </div>
        </footer>

        <p className="mt-6 text-center text-xs text-ardoise-400">
          Reçu généré le {dateLongue(new Date())} · {agence.nom} · MaMaAgence
        </p>
      </article>
    </main>
  );
}
