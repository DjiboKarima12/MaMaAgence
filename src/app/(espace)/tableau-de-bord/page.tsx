import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BedDoubleIcon,
  FileTextIcon,
  PlaneTakeoffIcon,
  SearchIcon,
  StampIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { exigerAcces } from "@/lib/session";
import { peutVoir } from "@/lib/acces";
import { creerClientServeur } from "@/lib/supabase/server";
import { Badge, Carte, EtatVide, LienBouton, Tableau, Td, Th } from "@/components/ui";
import { CarteKpi, LigneJauge } from "@/components/kpi";
import { SelecteurSaison } from "@/components/selecteur-saison";
import { STATUTS_DOSSIER, MOYENS_PAIEMENT } from "@/lib/niger";
import {
  alertePasseport,
  dateCourte,
  initiales,
  joursRestants,
  nombre,
  pourcentage,
  xof,
  xofCompact,
} from "@/lib/format";
import type { DossierFinance, Groupe, Paiement, Saison } from "@/lib/database.types";

export const metadata: Metadata = { title: "Tableau de bord" };

/** Un visa est considéré obtenu dès que le dossier a dépassé ce stade. */
const STATUTS_VISA_OBTENU = ["visa_obtenu", "parti", "revenu"];

export default async function PageTableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const session = await exigerAcces("tableau-de-bord");
  const { droits } = session;
  const voitPaiements = peutVoir(session.profil.role, "paiements");
  const { saison: saisonParam } = await searchParams;
  const supabase = await creerClientServeur();

  const { data: saisonsBrutes } = await supabase
    .from("saisons")
    .select("*")
    .order("annee_greg", { ascending: false });
  const saisons = (saisonsBrutes ?? []) as Saison[];

  // Par défaut on ouvre sur la campagne en cours, pas sur l'historique complet.
  const saisonActive =
    saisonParam && saisons.some((s) => s.id === saisonParam)
      ? saisonParam
      : (saisons.find((s) => s.ouverte)?.id ?? null);
  const saison = saisons.find((s) => s.id === saisonActive) ?? null;

  let requeteDossiers = supabase.from("v_dossiers_finance").select("*");
  let requeteGroupes = supabase.from("groupes").select("*").order("date_depart");
  let requeteChambres = supabase.from("dossiers").select("groupe_id, numero_chambre, statut");

  if (saisonActive) {
    requeteDossiers = requeteDossiers.eq("saison_id", saisonActive);
    requeteGroupes = requeteGroupes.eq("saison_id", saisonActive);
    requeteChambres = requeteChambres.eq("saison_id", saisonActive);
  }

  const [{ data: dossiersBruts }, { data: groupesBruts }, { data: chambres }, { data: paiementsBruts }] =
    await Promise.all([
      requeteDossiers,
      requeteGroupes,
      requeteChambres,
      supabase
        .from("paiements")
        .select("*, dossiers(reference, saison_id, pelerins(nom, prenom))")
        .eq("statut", "confirme")
        .order("cree_le", { ascending: false })
        .limit(20),
    ]);

  const dossiers = (dossiersBruts ?? []) as DossierFinance[];
  const groupes = (groupesBruts ?? []) as Groupe[];

  type PaiementJoint = Paiement & {
    dossiers: {
      reference: string;
      saison_id: string;
      pelerins: { nom: string; prenom: string } | null;
    } | null;
  };
  const paiements = ((paiementsBruts ?? []) as PaiementJoint[])
    .filter((p) => !saisonActive || p.dossiers?.saison_id === saisonActive)
    .slice(0, 5);

  /* ---------------------------------------------------------------------- */
  /* Indicateurs                                                             */
  /* ---------------------------------------------------------------------- */
  const actifs = dossiers.filter((d) => d.statut !== "annule");
  const attendu = actifs.reduce((s, d) => s + d.net_xof, 0);
  const encaisse = actifs.reduce((s, d) => s + d.regle_xof, 0);
  const visasObtenus = actifs.filter((d) => STATUTS_VISA_OBTENU.includes(d.statut)).length;
  const visasEnCours = actifs.filter((d) => d.statut === "visa_depose").length;
  const piecesIncompletes = actifs.filter(
    (d) => d.pieces_total > 0 && d.pieces_valides < d.pieces_total,
  ).length;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const prochainGroupe =
    groupes.find((g) => g.date_depart && g.date_depart >= aujourdhui) ?? groupes[0] ?? null;

  const membresGroupe = prochainGroupe
    ? actifs.filter((d) => d.groupe_id === prochainGroupe.id)
    : [];
  const chambresAttribuees = prochainGroupe
    ? (chambres ?? []).filter(
        (c) => c.groupe_id === prochainGroupe.id && c.numero_chambre && c.statut !== "annule",
      ).length
    : 0;

  const passeportsARisque = actifs.filter((d) => {
    const a = alertePasseport(d.passeport_expire_le, prochainGroupe?.date_depart ?? null);
    return a === "expire" || a === "insuffisante";
  });

  const recents = [...actifs]
    .sort((a, b) => b.inscrit_le.localeCompare(a.inscrit_le))
    .slice(0, 6);

  // Aucune donnee encore : on garde la mise en page complete, a zero, et on
  // ajoute un rappel de demarrage au-dessus plutot que de la remplacer.
  const espaceVide = dossiers.length === 0;

  return (
    <>
      {/*
        Bandeau d'accueil. La photo vit dans public/tableau-de-bord.jpg ; si le
        fichier manque, le dégradé vert reste seul et rien ne casse.
      */}
      <div className="relative mb-6 overflow-hidden rounded-xl bg-marque-900">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: "url('/tableau-de-bord.jpg')",
            backgroundPosition: "center 38%",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-marque-950/95 via-marque-900/80 to-marque-900/45"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-7">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {session.agence.nom}
              </h1>
              <p className="mt-0.5 text-sm text-marque-200">
                {saison ? saison.libelle : "Toutes les campagnes"}
              </p>
            </div>
            <SelecteurSaison
              saisons={saisons.map((s) => ({ id: s.id, libelle: s.libelle, type: s.type }))}
              saisonActive={saisonActive}
            />
          </div>

          <form action="/pelerins" className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise-400"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Rechercher un pèlerin, un passeport…"
              aria-label="Rechercher un pèlerin"
              className="w-72 rounded-lg border-0 bg-white/95 py-2 pl-9 pr-3 text-sm text-ardoise-900 shadow-sm placeholder:text-ardoise-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-marque-500"
            />
          </form>
        </div>
      </div>

      {espaceVide && (
        <div className="mb-4 rounded-xl border border-marque-200 bg-marque-50 px-5 py-4">
          <p className="text-sm font-semibold text-marque-900">
            Votre espace est prêt, {session.profil.nom_complet.split(" ")[0]}
          </p>
          <p className="mt-0.5 text-sm text-marque-800">
            Les indicateurs ci-dessous resteront à zéro jusqu&apos;au premier dossier
            d&apos;inscription.
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { n: 1, titre: "Saison et forfaits", href: "/catalogue" },
              { n: 2, titre: "Pèlerins", href: "/pelerins/inscription" },
              { n: 3, titre: "Dossiers d'inscription", href: "/dossiers/nouveau" },
            ].map((e) => (
              <li key={e.n}>
                <Link
                  href={e.href}
                  className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-marque-200 hover:ring-marque-400"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marque-100 text-xs font-semibold text-marque-700">
                    {e.n}
                  </span>
                  <span className="font-medium text-ardoise-900">{e.titre}</span>
                  <ArrowRightIcon className="ml-auto h-3.5 w-3.5 text-ardoise-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Indicateurs de campagne */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CarteKpi
          libelle="Quota accordé"
          valeur={nombre(actifs.length)}
          sur={saison?.quota ? `/ ${nombre(saison.quota)}` : undefined}
          atteint={saison?.quota ? actifs.length : undefined}
          objectif={saison?.quota ?? undefined}
          detail={
            saison?.quota
              ? `Pèlerins inscrits sur le quota accordé à l'agence${
                  actifs.length > saison.quota
                    ? ` — dépassement de ${actifs.length - saison.quota}`
                    : ""
                }`
              : "Aucun quota renseigné pour cette saison"
          }
          ton={saison?.quota && actifs.length > saison.quota ? "alerte" : "ok"}
          Icone={UsersIcon}
        />

        <CarteKpi
          libelle="Recouvrement"
          valeur={xofCompact(encaisse)}
          sur={`/ ${xofCompact(attendu)}`}
          atteint={encaisse}
          objectif={attendu}
          detail={`Encaissé sur le montant attendu — reste ${xof(attendu - encaisse)}`}
          ton={attendu > 0 && encaisse < attendu ? "attente" : "ok"}
          Icone={WalletIcon}
          accentue
        />

        <CarteKpi
          libelle="Visas obtenus"
          valeur={nombre(visasObtenus)}
          sur={`/ ${nombre(actifs.length)}`}
          atteint={visasObtenus}
          objectif={actifs.length}
          detail={
            visasEnCours > 0
              ? `${nombre(visasEnCours)} dossier(s) déposés en attente de réponse`
              : "Aucun dossier en attente auprès du consulat"
          }
          ton="info"
          Icone={StampIcon}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Inscriptions récentes */}
        <div className="lg:col-span-2">
          <Carte
            titre="Inscriptions récentes"
            action={
              <span className="rounded-full bg-ardoise-100 px-2.5 py-1 text-xs font-medium text-ardoise-700">
                {nombre(actifs.length)} pèlerin{actifs.length > 1 ? "s" : ""} actif
                {actifs.length > 1 ? "s" : ""}
              </span>
            }
          >
            {recents.length === 0 ? (
              <EtatVide
                titre="Aucune inscription"
                description="Les pèlerins inscrits à cette campagne apparaîtront ici, du plus récent au plus ancien."
              />
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <Th>Pèlerin</Th>
                    <Th>Statut</Th>
                    <Th>Montant réglé</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {recents.map((d) => {
                    const part = pourcentage(d.regle_xof, d.net_xof);
                    const statut = STATUTS_DOSSIER[d.statut];
                    return (
                      <tr key={d.dossier_id} className="hover:bg-ardoise-50">
                        <Td>
                          <Link
                            href={`/pelerins/${d.pelerin_id}`}
                            className="flex items-center gap-3"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marque-50 text-xs font-semibold text-marque-700">
                              {initiales(d.nom, d.prenom)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ardoise-900">
                                {d.prenom} {d.nom}
                              </span>
                              <span className="tabular block text-xs text-ardoise-400">
                                {d.matricule}
                              </span>
                            </span>
                          </Link>
                        </Td>
                        <Td>
                          <Badge ton={statut.ton}>{statut.label}</Badge>
                        </Td>
                        <Td>
                          <span className="tabular block text-sm font-medium text-ardoise-900">
                            {xof(d.regle_xof)}
                          </span>
                          <span className="mt-1.5 block h-1 w-28 overflow-hidden rounded-full bg-ardoise-100">
                            <span
                              className={`block h-full rounded-full ${
                                d.solde_xof > 0 ? "bg-sable-400" : "bg-marque-600"
                              }`}
                              style={{ width: `${part}%` }}
                            />
                          </span>
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/dossiers/${d.dossier_id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ardoise-700 ring-1 ring-inset ring-ardoise-300 hover:bg-white"
                          >
                            <FileTextIcon className="h-3.5 w-3.5" aria-hidden />
                            Voir le dossier
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            )}
            <div className="border-t border-ardoise-200 px-5 py-3">
              <Link
                href="/dossiers"
                className="inline-flex items-center gap-1 text-sm font-medium text-marque-700 hover:underline"
              >
                Tous les dossiers
                <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </Carte>
        </div>

        {/* Vol et hébergement */}
        <Carte titre="Vol et hébergement">
          {!prochainGroupe ? (
            <EtatVide
              titre="Aucun groupe de départ"
              description="Créez un groupe pour planifier le vol et l'encadrement."
              action={
                <LienBouton href="/groupes" variante="secondaire">
                  Créer un groupe
                </LienBouton>
              }
            />
          ) : (
            <>
              <div className="border-b border-ardoise-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ardoise-900">
                    <PlaneTakeoffIcon className="h-4 w-4 text-ardoise-400" aria-hidden />
                    {prochainGroupe.numero_vol ?? prochainGroupe.nom}
                  </span>
                  {(() => {
                    const j = joursRestants(prochainGroupe.date_depart);
                    if (j === null) return null;
                    if (j < 0) return <Badge ton="neutre">Parti</Badge>;
                    if (j === 0) return <Badge ton="alerte">Aujourd&apos;hui</Badge>;
                    return <Badge ton={j <= 30 ? "attente" : "info"}>Dans {j} j</Badge>;
                  })()}
                </div>
                <p className="mt-1.5 text-xs text-ardoise-500">
                  {prochainGroupe.compagnie_aerienne ?? "Compagnie non renseignée"} · départ{" "}
                  {dateCourte(prochainGroupe.date_depart)}
                  {prochainGroupe.date_retour
                    ? ` · retour ${dateCourte(prochainGroupe.date_retour)}`
                    : ""}
                </p>
                <p className="mt-0.5 text-xs text-ardoise-500">
                  Au départ de {prochainGroupe.aeroport_depart ?? "NIM"} — {prochainGroupe.nom}
                </p>
              </div>

              <div className="divide-y divide-ardoise-100">
                <LigneJauge
                  libelle="Places pourvues"
                  atteint={membresGroupe.length}
                  objectif={prochainGroupe.capacite}
                  unite="pèlerins"
                  ton={
                    prochainGroupe.capacite && membresGroupe.length > prochainGroupe.capacite
                      ? "alerte"
                      : "ok"
                  }
                />
                <LigneJauge
                  libelle="Chambres attribuées"
                  atteint={chambresAttribuees}
                  objectif={membresGroupe.length || null}
                  ton={chambresAttribuees < membresGroupe.length ? "attente" : "ok"}
                />
                <LigneJauge
                  libelle="Dossiers soldés"
                  atteint={membresGroupe.filter((m) => m.solde_xof <= 0).length}
                  objectif={membresGroupe.length || null}
                  ton={
                    membresGroupe.some((m) => m.solde_xof > 0) ? "attente" : "ok"
                  }
                />
              </div>

              {prochainGroupe.encadrant_nom && (
                <p className="border-t border-ardoise-100 px-5 py-3 text-xs text-ardoise-500">
                  Encadrant : {prochainGroupe.encadrant_nom}
                </p>
              )}

              <div className="border-t border-ardoise-200 px-5 py-3">
                <Link
                  href="/groupes"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-marque-700 hover:underline"
                >
                  <BedDoubleIcon className="h-4 w-4" aria-hidden />
                  Manifeste du groupe
                </Link>
              </div>
            </>
          )}
        </Carte>
      </div>

      {/* Points de blocage avant départ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Carte
            titre="À régler avant le départ"
            action={
              <Link href="/dossiers" className="text-xs font-medium text-marque-700 hover:underline">
                Filtrer les dossiers
              </Link>
            }
          >
            {passeportsARisque.length === 0 && piecesIncompletes === 0 ? (
              <EtatVide
                titre="Aucun blocage"
                description="Passeports valides et pièces justificatives complètes sur tous les dossiers."
              />
            ) : (
              <>
                <div className="grid gap-px bg-ardoise-200 sm:grid-cols-2">
                  <div className="bg-white px-5 py-3">
                    <p className="text-xs uppercase tracking-wide text-ardoise-500">
                      Dossiers incomplets
                    </p>
                    <p
                      className={`tabular mt-0.5 text-lg font-semibold ${
                        piecesIncompletes > 0 ? "text-sable-700" : "text-marque-700"
                      }`}
                    >
                      {nombre(piecesIncompletes)}
                    </p>
                  </div>
                  <div className="bg-white px-5 py-3">
                    <p className="text-xs uppercase tracking-wide text-ardoise-500">
                      Passeports à risque
                    </p>
                    <p
                      className={`tabular mt-0.5 text-lg font-semibold ${
                        passeportsARisque.length > 0 ? "text-rose-600" : "text-marque-700"
                      }`}
                    >
                      {nombre(passeportsARisque.length)}
                    </p>
                  </div>
                </div>

                {passeportsARisque.length > 0 && (
                  <ul className="divide-y divide-ardoise-100">
                    {passeportsARisque.slice(0, 5).map((d) => (
                      <li
                        key={d.dossier_id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <TriangleAlertIcon
                            className="h-4 w-4 shrink-0 text-rose-500"
                            aria-hidden
                          />
                          <Link
                            href={`/dossiers/${d.dossier_id}`}
                            className="truncate text-sm font-medium text-ardoise-900 hover:text-marque-700"
                          >
                            {d.prenom} {d.nom}
                          </Link>
                        </span>
                        <span className="tabular shrink-0 text-xs text-ardoise-500">
                          expire le {dateCourte(d.passeport_expire_le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Carte>
        </div>

        {voitPaiements && (
        <Carte
          titre="Derniers encaissements"
          action={
            <Link href="/paiements" className="text-xs font-medium text-marque-700 hover:underline">
              Journal
            </Link>
          }
        >
          {paiements.length === 0 ? (
            <EtatVide titre="Aucun encaissement" />
          ) : (
            <ul className="divide-y divide-ardoise-100">
              {paiements.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ardoise-900">
                      {p.dossiers?.pelerins
                        ? `${p.dossiers.pelerins.prenom} ${p.dossiers.pelerins.nom}`
                        : p.numero_recu}
                    </span>
                    <span className="block text-xs text-ardoise-500">
                      {dateCourte(p.paye_le)} · {MOYENS_PAIEMENT[p.moyen].court}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-medium text-ardoise-900">
                    {xof(p.montant_xof)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
        )}
      </div>

      {/* Action principale, pour qui a le droit de saisir */}
      {droits.saisir && (
      <Link
        href="/pelerins/inscription"
        className="sans-impression fixed bottom-6 right-6 z-20 inline-flex items-center gap-2 rounded-full bg-marque-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-marque-900/20 transition-colors hover:bg-marque-800"
      >
        <UserPlusIcon className="h-4 w-4" aria-hidden />
        Enregistrer un pèlerin
      </Link>
      )}
    </>
  );
}
