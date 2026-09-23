import Link from "next/link";
import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import {
  Badge,
  Carte,
  EnTetePage,
  EtatVide,
  Jauge,
  LienBouton,
  Tableau,
  Td,
  Th,
  Tuile,
} from "@/components/ui";
import { STATUTS_DOSSIER } from "@/lib/niger";
import { dateCourte, nombre, pourcentage, xof, xofCompact } from "@/lib/format";
import type { DossierFinance, Saison, StatutDossier } from "@/lib/database.types";

export const metadata: Metadata = { title: "Dossiers" };

export default async function PageDossiers({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; saison?: string; solde?: string; q?: string }>;
}) {
  const { droits } = await exigerAcces("dossiers");
  const { statut = "", saison = "", solde = "", q = "" } = await searchParams;

  const supabase = await creerClientServeur();

  let requete = supabase
    .from("v_dossiers_finance")
    .select("*")
    .order("inscrit_le", { ascending: false });

  // Le paramètre d'URL n'est de confiance qu'après vérification contre la liste connue.
  const statutValide = statut in STATUTS_DOSSIER ? (statut as StatutDossier) : null;
  if (statutValide) requete = requete.eq("statut", statutValide);
  if (saison) requete = requete.eq("saison_id", saison);
  if (q) {
    const motif = `%${q}%`;
    requete = requete.or(`nom.ilike.${motif},prenom.ilike.${motif},reference.ilike.${motif}`);
  }

  const [{ data: brut }, { data: saisonsBrutes }] = await Promise.all([
    requete,
    supabase.from("saisons").select("*").order("annee_greg", { ascending: false }),
  ]);

  let dossiers = (brut ?? []) as DossierFinance[];
  if (solde === "impaye") dossiers = dossiers.filter((d) => d.solde_xof > 0);
  if (solde === "solde") dossiers = dossiers.filter((d) => d.solde_xof <= 0);

  const saisons = (saisonsBrutes ?? []) as Saison[];

  const actifs = dossiers.filter((d) => d.statut !== "annule");
  const attendu = actifs.reduce((s, d) => s + d.net_xof, 0);
  const encaisse = actifs.reduce((s, d) => s + d.regle_xof, 0);

  const champSelect =
    "block rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 focus:ring-2 focus:ring-inset focus:ring-marque-500";

  return (
    <>
      <EnTetePage
        titre="Dossiers"
        description="Chaque dossier lie un pèlerin à un forfait, avec ses pièces et son échéancier."
        action={
          droits.saisir ? (
            <LienBouton href="/dossiers/nouveau">Nouveau dossier</LienBouton>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Tuile libelle="Dossiers affichés" valeur={nombre(dossiers.length)} />
        <Tuile libelle="Montant attendu" valeur={xofCompact(attendu)} ton="info" />
        <Tuile
          libelle="Encaissé"
          valeur={xofCompact(encaisse)}
          detail={`${pourcentage(encaisse, attendu)} %`}
          ton="ok"
        />
      </div>

      <Carte>
        <form className="flex flex-wrap items-end gap-3 border-b border-ardoise-200 px-5 py-4">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Rechercher
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Nom du pèlerin ou référence"
              className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 placeholder:text-ardoise-400 focus:ring-2 focus:ring-inset focus:ring-marque-500"
            />
          </div>
          <div>
            <label htmlFor="saison" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Saison
            </label>
            <select id="saison" name="saison" defaultValue={saison} className={champSelect}>
              <option value="">Toutes</option>
              {saisons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="statut" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Statut
            </label>
            <select id="statut" name="statut" defaultValue={statut} className={champSelect}>
              <option value="">Tous</option>
              {Object.entries(STATUTS_DOSSIER).map(([cle, meta]) => (
                <option key={cle} value={cle}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="solde" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Règlement
            </label>
            <select id="solde" name="solde" defaultValue={solde} className={champSelect}>
              <option value="">Tous</option>
              <option value="impaye">Solde restant</option>
              <option value="solde">Soldés</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-marque-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-marque-700"
          >
            Filtrer
          </button>
          {(q || statut || saison || solde) && (
            <Link href="/dossiers" className="px-2 py-2 text-sm text-ardoise-500 hover:text-ardoise-800">
              Réinitialiser
            </Link>
          )}
        </form>

        {dossiers.length === 0 ? (
          <EtatVide
            titre="Aucun dossier"
            description="Créez un dossier pour inscrire un pèlerin à un forfait de la saison."
            action={
          droits.saisir ? (
            <LienBouton href="/dossiers/nouveau">Nouveau dossier</LienBouton>
          ) : undefined
        }
          />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Référence</Th>
                <Th>Pèlerin</Th>
                <Th>Forfait</Th>
                <Th>Statut</Th>
                <Th>Pièces</Th>
                <Th className="text-right">Réglé</Th>
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
                      {dateCourte(d.inscrit_le)}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/pelerins/${d.pelerin_id}`}
                      className="font-medium text-ardoise-900 hover:text-marque-700"
                    >
                      {d.prenom} {d.nom}
                    </Link>
                    <span className="block text-xs text-ardoise-400">{d.matricule}</span>
                  </Td>
                  <Td>
                    {d.forfait_nom}
                    <span className="block text-xs uppercase text-ardoise-400">
                      {d.type_pelerinage}
                    </span>
                  </Td>
                  <Td>
                    <Badge ton={STATUTS_DOSSIER[d.statut].ton}>
                      {STATUTS_DOSSIER[d.statut].label}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="tabular text-xs text-ardoise-600">
                      {d.pieces_valides}/{d.pieces_total}
                    </span>
                    <span className="mt-1 block w-16">
                      <Jauge
                        valeur={pourcentage(d.pieces_valides, d.pieces_total)}
                        ton={d.pieces_valides === d.pieces_total ? "ok" : "attente"}
                      />
                    </span>
                  </Td>
                  <Td className="tabular text-right">{xof(d.regle_xof)}</Td>
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
    </>
  );
}
