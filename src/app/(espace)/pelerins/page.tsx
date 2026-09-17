import Link from "next/link";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase/server";
import { exigerSession } from "@/lib/session";
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
import { REGIONS_NIGER } from "@/lib/niger";
import { age, alertePasseport, dateCourte, initiales, telephone } from "@/lib/format";
import type { Pelerin } from "@/lib/database.types";

export const metadata: Metadata = { title: "Pèlerins" };

const PAR_PAGE = 25;

export default async function PagePelerins({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; page?: string }>;
}) {
  await exigerSession();
  const { q = "", region = "", page = "1" } = await searchParams;
  const numPage = Math.max(1, Number(page) || 1);
  const debut = (numPage - 1) * PAR_PAGE;

  const supabase = await creerClientServeur();
  let requete = supabase
    .from("pelerins")
    .select("*", { count: "exact" })
    .order("cree_le", { ascending: false })
    .range(debut, debut + PAR_PAGE - 1);

  if (q) {
    const motif = `%${q}%`;
    requete = requete.or(
      `nom.ilike.${motif},prenom.ilike.${motif},matricule.ilike.${motif},passeport_numero.ilike.${motif},telephone.ilike.${motif}`,
    );
  }
  if (region) requete = requete.eq("region", region);

  const { data, count } = await requete;
  const pelerins = (data ?? []) as Pelerin[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lienPage = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (region) p.set("region", region);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/pelerins?${s}` : "/pelerins";
  };

  return (
    <>
      <EnTetePage
        titre="Pèlerins"
        description={`${total} fiche${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`}
        action={<LienBouton href="/pelerins/nouveau">Nouveau pèlerin</LienBouton>}
      />

      <Carte>
        <form className="flex flex-wrap items-end gap-3 border-b border-ardoise-200 px-5 py-4">
          <div className="min-w-[16rem] flex-1">
            <label
              htmlFor="q"
              className="mb-1.5 block text-sm font-medium text-ardoise-700"
            >
              Rechercher
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Nom, matricule, passeport, téléphone…"
              className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 placeholder:text-ardoise-400 focus:ring-2 focus:ring-inset focus:ring-marque-500"
            />
          </div>
          <div>
            <label
              htmlFor="region"
              className="mb-1.5 block text-sm font-medium text-ardoise-700"
            >
              Région
            </label>
            <select
              id="region"
              name="region"
              defaultValue={region}
              className="block rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ardoise-300 focus:ring-2 focus:ring-inset focus:ring-marque-500"
            >
              <option value="">Toutes</option>
              {REGIONS_NIGER.map((r) => (
                <option key={r} value={r}>
                  {r}
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
          {(q || region) && (
            <Link
              href="/pelerins"
              className="px-2 py-2 text-sm text-ardoise-500 hover:text-ardoise-800"
            >
              Réinitialiser
            </Link>
          )}
        </form>

        {pelerins.length === 0 ? (
          <EtatVide
            titre={q || region ? "Aucun résultat" : "Aucun pèlerin enregistré"}
            description={
              q || region
                ? "Modifiez votre recherche ou réinitialisez les filtres."
                : "Commencez par créer la fiche d'un pèlerin : état civil, passeport et contact."
            }
            action={
              !q && !region ? (
                <LienBouton href="/pelerins/nouveau">Nouveau pèlerin</LienBouton>
              ) : undefined
            }
          />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Pèlerin</Th>
                <Th>Matricule</Th>
                <Th>Téléphone</Th>
                <Th>Région</Th>
                <Th>Passeport</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {pelerins.map((p) => {
                const alerte = alertePasseport(p.passeport_expire_le);
                const a = age(p.date_naissance);
                return (
                  <tr key={p.id} className="hover:bg-ardoise-50">
                    <Td>
                      <Link href={`/pelerins/${p.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marque-50 text-xs font-semibold text-marque-700">
                          {initiales(p.nom, p.prenom)}
                        </span>
                        <span>
                          <span className="block font-medium text-ardoise-900">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="block text-xs text-ardoise-400">
                            {p.sexe === "F" ? "Femme" : "Homme"}
                            {a !== null ? ` · ${a} ans` : ""}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="tabular">{p.matricule}</Td>
                    <Td className="tabular">{telephone(p.telephone)}</Td>
                    <Td>{p.region ?? "—"}</Td>
                    <Td>
                      {p.passeport_numero ? (
                        <span className="flex flex-col gap-1">
                          <span className="tabular">{p.passeport_numero}</span>
                          {alerte === "expire" && <Badge ton="alerte">Expiré</Badge>}
                          {alerte === "insuffisante" && (
                            <Badge ton="alerte">Validité &lt; 6 mois</Badge>
                          )}
                          {alerte === "bientot" && (
                            <Badge ton="attente">Expire le {dateCourte(p.passeport_expire_le)}</Badge>
                          )}
                        </span>
                      ) : (
                        <Badge ton="alerte">Non renseigné</Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-ardoise-200 px-5 py-3 text-sm">
            <p className="text-ardoise-500">
              Page {numPage} sur {pages}
            </p>
            <div className="flex gap-2">
              {numPage > 1 && (
                <Link
                  href={lienPage(numPage - 1)}
                  className="rounded-lg px-3 py-1.5 text-ardoise-700 ring-1 ring-inset ring-ardoise-300 hover:bg-ardoise-50"
                >
                  Précédent
                </Link>
              )}
              {numPage < pages && (
                <Link
                  href={lienPage(numPage + 1)}
                  className="rounded-lg px-3 py-1.5 text-ardoise-700 ring-1 ring-inset ring-ardoise-300 hover:bg-ardoise-50"
                >
                  Suivant
                </Link>
              )}
            </div>
          </div>
        )}
      </Carte>
    </>
  );
}
