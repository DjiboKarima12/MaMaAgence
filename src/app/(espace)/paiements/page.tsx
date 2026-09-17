import Link from "next/link";
import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Badge, Carte, EnTetePage, EtatVide, Tableau, Td, Th, Tuile } from "@/components/ui";
import { MOYENS_PAIEMENT } from "@/lib/niger";
import { dateCourte, nombre, xof, xofCompact } from "@/lib/format";
import type { MoyenPaiement, Paiement } from "@/lib/database.types";

export const metadata: Metadata = { title: "Paiements" };

type PaiementJoint = Paiement & {
  dossiers: {
    reference: string;
    pelerins: { nom: string; prenom: string; matricule: string } | null;
  } | null;
};

function debutDeMois() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function PagePaiements({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; moyen?: string }>;
}) {
  await exigerSession();
  const params = await searchParams;
  const du = params.du || debutDeMois();
  const au = params.au || new Date().toISOString().slice(0, 10);
  const moyen = params.moyen || "";

  const supabase = await creerClientServeur();
  let requete = supabase
    .from("paiements")
    .select("*, dossiers(reference, pelerins(nom, prenom, matricule))")
    .gte("paye_le", du)
    .lte("paye_le", au)
    .order("paye_le", { ascending: false })
    .order("cree_le", { ascending: false });

  // Idem : on ne transmet à la requête qu'un moyen de paiement reconnu.
  const moyenValide = moyen in MOYENS_PAIEMENT ? (moyen as MoyenPaiement) : null;
  if (moyenValide) requete = requete.eq("moyen", moyenValide);

  const { data } = await requete;
  const paiements = (data ?? []) as PaiementJoint[];
  const confirmes = paiements.filter((p) => p.statut === "confirme");
  const total = confirmes.reduce((s, p) => s + p.montant_xof, 0);

  const parMoyen = confirmes.reduce<Record<string, number>>((acc, p) => {
    acc[p.moyen] = (acc[p.moyen] ?? 0) + p.montant_xof;
    return acc;
  }, {});

  const champ =
    "block rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 focus:ring-2 focus:ring-inset focus:ring-marque-500";

  return (
    <>
      <EnTetePage
        titre="Paiements"
        description="Journal des encaissements, tous dossiers confondus."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Tuile libelle="Encaissé sur la période" valeur={xofCompact(total)} ton="ok" />
        <Tuile libelle="Nombre de reçus" valeur={nombre(confirmes.length)} />
        <Tuile
          libelle="Annulés"
          valeur={nombre(paiements.length - confirmes.length)}
          ton={paiements.length - confirmes.length > 0 ? "alerte" : "neutre"}
        />
      </div>

      {Object.keys(parMoyen).length > 0 && (
        <Carte titre="Répartition par moyen de paiement" className="mb-4">
          <ul className="divide-y divide-ardoise-100">
            {Object.entries(parMoyen)
              .sort((a, b) => b[1] - a[1])
              .map(([m, montant]) => (
                <li key={m} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-ardoise-700">
                    {MOYENS_PAIEMENT[m as MoyenPaiement].label}
                  </span>
                  <span className="tabular text-sm font-medium text-ardoise-900">
                    {xof(montant)}
                    <span className="ml-2 text-xs font-normal text-ardoise-400">
                      {Math.round((montant / total) * 100)} %
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </Carte>
      )}

      <Carte>
        <form className="flex flex-wrap items-end gap-3 border-b border-ardoise-200 px-5 py-4">
          <div>
            <label htmlFor="du" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Du
            </label>
            <input id="du" type="date" name="du" defaultValue={du} className={champ} />
          </div>
          <div>
            <label htmlFor="au" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Au
            </label>
            <input id="au" type="date" name="au" defaultValue={au} className={champ} />
          </div>
          <div>
            <label htmlFor="moyen" className="mb-1.5 block text-sm font-medium text-ardoise-700">
              Moyen
            </label>
            <select id="moyen" name="moyen" defaultValue={moyen} className={champ}>
              <option value="">Tous</option>
              {Object.entries(MOYENS_PAIEMENT).map(([cle, meta]) => (
                <option key={cle} value={cle}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-marque-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-marque-700"
          >
            Filtrer
          </button>
        </form>

        {paiements.length === 0 ? (
          <EtatVide
            titre="Aucun encaissement sur la période"
            description="Les versements sont saisis depuis la fiche du dossier concerné."
          />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Reçu</Th>
                <Th>Date</Th>
                <Th>Pèlerin</Th>
                <Th>Dossier</Th>
                <Th>Moyen</Th>
                <Th>Référence</Th>
                <Th className="text-right">Montant</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {paiements.map((p) => (
                <tr key={p.id} className={p.statut === "annule" ? "opacity-50" : "hover:bg-ardoise-50"}>
                  <Td>
                    <a
                      href={`/recus/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tabular font-medium text-ardoise-900 hover:text-marque-700"
                    >
                      {p.numero_recu}
                    </a>
                    {p.statut === "annule" && (
                      <span className="ml-2">
                        <Badge ton="alerte">Annulé</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="tabular">{dateCourte(p.paye_le)}</Td>
                  <Td>
                    {p.dossiers?.pelerins
                      ? `${p.dossiers.pelerins.prenom} ${p.dossiers.pelerins.nom}`
                      : "—"}
                  </Td>
                  <Td>
                    <Link
                      href={`/dossiers/${p.dossier_id}`}
                      className="tabular text-marque-700 hover:underline"
                    >
                      {p.dossiers?.reference ?? "—"}
                    </Link>
                  </Td>
                  <Td>
                    <Badge>{MOYENS_PAIEMENT[p.moyen].court}</Badge>
                  </Td>
                  <Td className="tabular text-xs text-ardoise-500">
                    {p.reference_operateur ?? "—"}
                  </Td>
                  <Td className="tabular text-right font-medium text-ardoise-900">
                    {xof(p.montant_xof)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ardoise-200">
              <tr>
                <Td className="font-medium text-ardoise-900">Total confirmé</Td>
                <Td />
                <Td />
                <Td />
                <Td />
                <Td />
                <Td className="tabular text-right text-base font-semibold text-ardoise-950">
                  {xof(total)}
                </Td>
              </tr>
            </tfoot>
          </Tableau>
        )}
      </Carte>
    </>
  );
}
