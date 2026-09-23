import Link from "next/link";
import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Badge, Carte, EnTetePage, EtatVide, Jauge, Tableau, Td, Th } from "@/components/ui";
import { alertePasseport, dateCourte, joursRestants, nombre, pourcentage, telephone, xof } from "@/lib/format";
import FormulaireGroupe from "./formulaire";
import type { DossierFinance, Groupe, Saison } from "@/lib/database.types";

export const metadata: Metadata = { title: "Groupes de départ" };

export default async function PageGroupes() {
  await exigerAcces("groupes");
  const supabase = await creerClientServeur();

  const [{ data: groupesBruts }, { data: saisonsBrutes }, { data: dossiersBruts }] =
    await Promise.all([
      supabase.from("groupes").select("*").order("date_depart", { ascending: true }),
      supabase.from("saisons").select("*").order("annee_greg", { ascending: false }),
      supabase.from("v_dossiers_finance").select("*").neq("statut", "annule"),
    ]);

  const groupes = (groupesBruts ?? []) as Groupe[];
  const saisons = (saisonsBrutes ?? []) as Saison[];
  const dossiers = (dossiersBruts ?? []) as DossierFinance[];

  return (
    <>
      <EnTetePage
        titre="Groupes de départ"
        description="Manifeste de vol, encadrement et état de préparation de chaque groupe."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {groupes.length === 0 ? (
            <Carte>
              <EtatVide
                titre="Aucun groupe de départ"
                description="Un groupe rassemble les pèlerins voyageant sur le même vol."
              />
            </Carte>
          ) : (
            groupes.map((g) => {
              const membres = dossiers.filter((d) => d.groupe_id === g.id);
              const jours = joursRestants(g.date_depart);
              const saison = saisons.find((s) => s.id === g.saison_id);
              const pretsDocuments = membres.filter(
                (m) => m.pieces_total > 0 && m.pieces_valides === m.pieces_total,
              ).length;
              const soldes = membres.filter((m) => m.solde_xof <= 0).length;
              const passeportsARisque = membres.filter((m) => {
                const a = alertePasseport(m.passeport_expire_le, g.date_depart);
                return a === "expire" || a === "insuffisante";
              }).length;
              const resteDu = membres.reduce((s, m) => s + Math.max(m.solde_xof, 0), 0);

              return (
                <Carte key={g.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ardoise-200 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold text-ardoise-900">
                        {g.nom}
                        {jours !== null && jours >= 0 && jours <= 30 && (
                          <span className="ml-2">
                            <Badge ton="attente">départ dans {jours} j</Badge>
                          </span>
                        )}
                      </h2>
                      <p className="mt-0.5 text-xs text-ardoise-500">
                        {saison?.libelle ?? "—"} · départ {dateCourte(g.date_depart)}
                        {g.date_retour ? ` · retour ${dateCourte(g.date_retour)}` : ""}
                        {g.compagnie_aerienne ? ` · ${g.compagnie_aerienne}` : ""}
                        {g.numero_vol ? ` ${g.numero_vol}` : ""}
                      </p>
                      {g.encadrant_nom && (
                        <p className="mt-0.5 text-xs text-ardoise-500">
                          Encadrant : {g.encadrant_nom} — {telephone(g.encadrant_telephone)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="tabular text-lg font-semibold text-ardoise-950">
                        {nombre(membres.length)}
                        {g.capacite ? (
                          <span className="text-sm font-normal text-ardoise-400">
                            {" "}
                            / {g.capacite}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-ardoise-500">pèlerins affectés</p>
                      {g.capacite ? (
                        <div className="mt-2 w-24">
                          <Jauge
                            valeur={pourcentage(membres.length, g.capacite)}
                            ton={membres.length > g.capacite ? "alerte" : "ok"}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-px bg-ardoise-200 sm:grid-cols-4">
                    {[
                      {
                        libelle: "Dossiers complets",
                        valeur: `${pretsDocuments}/${membres.length}`,
                        alerte: pretsDocuments < membres.length,
                      },
                      {
                        libelle: "Soldés",
                        valeur: `${soldes}/${membres.length}`,
                        alerte: soldes < membres.length,
                      },
                      {
                        libelle: "Reste à recouvrer",
                        valeur: xof(resteDu),
                        alerte: resteDu > 0,
                      },
                      {
                        libelle: "Passeports à risque",
                        valeur: String(passeportsARisque),
                        alerte: passeportsARisque > 0,
                      },
                    ].map((s) => (
                      <div key={s.libelle} className="bg-white px-5 py-3">
                        <p className="text-xs uppercase tracking-wide text-ardoise-500">
                          {s.libelle}
                        </p>
                        <p
                          className={`tabular mt-0.5 text-sm font-medium ${
                            s.alerte ? "text-sable-700" : "text-marque-700"
                          }`}
                        >
                          {s.valeur}
                        </p>
                      </div>
                    ))}
                  </div>

                  {membres.length > 0 && (
                    <Tableau>
                      <thead>
                        <tr>
                          <Th>Pèlerin</Th>
                          <Th>Dossier</Th>
                          <Th>Passeport</Th>
                          <Th>Pièces</Th>
                          <Th className="text-right">Solde</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ardoise-100">
                        {membres.map((m) => {
                          const a = alertePasseport(m.passeport_expire_le, g.date_depart);
                          return (
                            <tr key={m.dossier_id} className="hover:bg-ardoise-50">
                              <Td>
                                <Link
                                  href={`/pelerins/${m.pelerin_id}`}
                                  className="font-medium text-ardoise-900 hover:text-marque-700"
                                >
                                  {m.prenom} {m.nom}
                                </Link>
                                <span className="block text-xs text-ardoise-400">
                                  {m.sexe === "F" ? "Femme" : "Homme"} · {m.matricule}
                                </span>
                              </Td>
                              <Td>
                                <Link
                                  href={`/dossiers/${m.dossier_id}`}
                                  className="tabular text-marque-700 hover:underline"
                                >
                                  {m.reference}
                                </Link>
                              </Td>
                              <Td className="tabular text-xs">
                                {m.passeport_numero ?? "—"}
                                {(a === "expire" || a === "insuffisante") && (
                                  <span className="mt-1 block">
                                    <Badge ton="alerte">
                                      {a === "expire" ? "Expiré" : "Validité < 6 mois"}
                                    </Badge>
                                  </span>
                                )}
                              </Td>
                              <Td className="tabular text-xs">
                                {m.pieces_valides}/{m.pieces_total}
                              </Td>
                              <Td
                                className={`tabular text-right font-medium ${
                                  m.solde_xof > 0 ? "text-sable-700" : "text-marque-700"
                                }`}
                              >
                                {xof(m.solde_xof)}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Tableau>
                  )}
                </Carte>
              );
            })
          )}
        </div>

        <div>
          <Carte titre="Nouveau groupe">
            <FormulaireGroupe
              saisons={saisons
                .filter((s) => s.ouverte)
                .map((s) => ({ id: s.id, libelle: s.libelle }))}
            />
          </Carte>
        </div>
      </div>
    </>
  );
}
