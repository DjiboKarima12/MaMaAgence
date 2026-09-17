import Link from "next/link";
import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
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
import { STATUTS_DOSSIER, MOYENS_PAIEMENT } from "@/lib/niger";
import {
  alertePasseport,
  dateCourte,
  joursRestants,
  nombre,
  pourcentage,
  xof,
  xofCompact,
} from "@/lib/format";
import type { DossierFinance, Groupe, Paiement } from "@/lib/database.types";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function PageTableauDeBord() {
  const session = await exigerSession();
  const supabase = await creerClientServeur();

  const [{ data: dossiersBruts }, { data: groupesBruts }, { data: paiementsBruts }] =
    await Promise.all([
      supabase.from("v_dossiers_finance").select("*"),
      supabase
        .from("groupes")
        .select("*")
        .not("date_depart", "is", null)
        .gte("date_depart", new Date().toISOString().slice(0, 10))
        .order("date_depart", { ascending: true })
        .limit(4),
      supabase
        .from("paiements")
        .select("*, dossiers(reference, pelerins(nom, prenom))")
        .eq("statut", "confirme")
        .order("cree_le", { ascending: false })
        .limit(6),
    ]);

  const dossiers = (dossiersBruts ?? []) as DossierFinance[];
  const groupes = (groupesBruts ?? []) as Groupe[];
  const paiements = (paiementsBruts ?? []) as (Paiement & {
    dossiers: { reference: string; pelerins: { nom: string; prenom: string } | null } | null;
  })[];

  const actifs = dossiers.filter((d) => d.statut !== "annule");
  const attendu = actifs.reduce((s, d) => s + d.net_xof, 0);
  const encaisse = actifs.reduce((s, d) => s + d.regle_xof, 0);
  const restant = attendu - encaisse;
  const soldes = actifs.filter((d) => d.solde_xof > 0);

  const piecesIncompletes = actifs.filter((d) => d.pieces_valides < d.pieces_total).length;

  const passeportsARisque = actifs
    .map((d) => ({ d, alerte: alertePasseport(d.passeport_expire_le) }))
    .filter((x) => x.alerte === "expire" || x.alerte === "insuffisante" || x.alerte === "bientot")
    .sort((a, b) => (a.d.passeport_expire_le ?? "").localeCompare(b.d.passeport_expire_le ?? ""))
    .slice(0, 6);

  const parStatut = actifs.reduce<Record<string, number>>((acc, d) => {
    acc[d.statut] = (acc[d.statut] ?? 0) + 1;
    return acc;
  }, {});

  if (dossiers.length === 0) {
    return (
      <>
        <EnTetePage
          titre={`Bienvenue, ${session.profil.nom_complet.split(" ")[0]}`}
          description="Votre espace est prêt. Trois étapes pour démarrer."
        />
        <Carte>
          <ol className="divide-y divide-ardoise-200">
            {[
              {
                n: 1,
                titre: "Créez une saison et vos forfaits",
                texte: "Hajj 1447, Omra Ramadan… avec les prix et l'acompte exigé.",
                href: "/catalogue",
                cta: "Ouvrir le catalogue",
              },
              {
                n: 2,
                titre: "Enregistrez vos pèlerins",
                texte: "État civil, passeport, contact d'urgence et mahram le cas échéant.",
                href: "/pelerins/nouveau",
                cta: "Ajouter un pèlerin",
              },
              {
                n: 3,
                titre: "Ouvrez les dossiers d'inscription",
                texte: "Les pièces à fournir et l'échéancier sont créés automatiquement.",
                href: "/dossiers/nouveau",
                cta: "Créer un dossier",
              },
            ].map((e) => (
              <li key={e.n} className="flex items-start gap-4 px-5 py-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marque-50 text-sm font-semibold text-marque-700">
                  {e.n}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ardoise-900">{e.titre}</p>
                  <p className="mt-0.5 text-sm text-ardoise-500">{e.texte}</p>
                </div>
                <LienBouton href={e.href} variante="secondaire">
                  {e.cta}
                </LienBouton>
              </li>
            ))}
          </ol>
        </Carte>
      </>
    );
  }

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        description={`${session.agence.nom} — vue d'ensemble de la campagne en cours`}
        action={
          <LienBouton href="/dossiers/nouveau">Nouveau dossier</LienBouton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tuile
          libelle="Dossiers actifs"
          valeur={nombre(actifs.length)}
          detail={`${nombre(dossiers.length - actifs.length)} annulé(s)`}
          ton="ok"
        />
        <Tuile
          libelle="Encaissé"
          valeur={xofCompact(encaisse)}
          detail={`${pourcentage(encaisse, attendu)} % du montant attendu`}
          ton="ok"
        />
        <Tuile
          libelle="Reste à recouvrer"
          valeur={xofCompact(restant)}
          detail={`${nombre(soldes.length)} dossier(s) avec solde`}
          ton={restant > 0 ? "attente" : "ok"}
        />
        <Tuile
          libelle="Dossiers incomplets"
          valeur={nombre(piecesIncompletes)}
          detail="pièces justificatives manquantes"
          ton={piecesIncompletes > 0 ? "alerte" : "ok"}
        />
      </div>

      <div className="mt-4">
        <Carte className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ardoise-900">Recouvrement</h2>
            <p className="tabular text-sm text-ardoise-500">
              <span className="font-semibold text-ardoise-900">{xof(encaisse)}</span> sur{" "}
              {xof(attendu)}
            </p>
          </div>
          <div className="mt-3">
            <Jauge valeur={pourcentage(encaisse, attendu)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(parStatut).map(([statut, n]) => {
              const meta = STATUTS_DOSSIER[statut as keyof typeof STATUTS_DOSSIER];
              return (
                <Badge key={statut} ton={meta?.ton ?? "neutre"}>
                  {meta?.label ?? statut} · {n}
                </Badge>
              );
            })}
          </div>
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Carte
          titre="Passeports à surveiller"
          action={
            <Link href="/pelerins" className="text-xs font-medium text-marque-700 hover:underline">
              Tous les pèlerins
            </Link>
          }
        >
          {passeportsARisque.length === 0 ? (
            <EtatVide
              titre="Aucune alerte"
              description="Tous les passeports couvrent la validité exigée pour le visa saoudien."
            />
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <Th>Pèlerin</Th>
                  <Th>Expire le</Th>
                  <Th>Situation</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {passeportsARisque.map(({ d, alerte }) => (
                  <tr key={d.dossier_id}>
                    <Td>
                      <Link
                        href={`/dossiers/${d.dossier_id}`}
                        className="font-medium text-ardoise-900 hover:text-marque-700"
                      >
                        {d.prenom} {d.nom}
                      </Link>
                      <span className="block text-xs text-ardoise-400">{d.matricule}</span>
                    </Td>
                    <Td className="tabular">{dateCourte(d.passeport_expire_le)}</Td>
                    <Td>
                      {alerte === "expire" ? (
                        <Badge ton="alerte">Expiré</Badge>
                      ) : alerte === "insuffisante" ? (
                        <Badge ton="alerte">Moins de 6 mois</Badge>
                      ) : (
                        <Badge ton="attente">À renouveler</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>

        <Carte
          titre="Prochains départs"
          action={
            <Link href="/groupes" className="text-xs font-medium text-marque-700 hover:underline">
              Tous les groupes
            </Link>
          }
        >
          {groupes.length === 0 ? (
            <EtatVide
              titre="Aucun départ programmé"
              description="Créez un groupe de départ pour planifier vols et encadrement."
              action={
                <LienBouton href="/groupes" variante="secondaire">
                  Créer un groupe
                </LienBouton>
              }
            />
          ) : (
            <ul className="divide-y divide-ardoise-100">
              {groupes.map((g) => {
                const jours = joursRestants(g.date_depart);
                const inscrits = actifs.filter((d) => d.groupe_id === g.id).length;
                return (
                  <li key={g.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ardoise-900">{g.nom}</p>
                      <p className="text-xs text-ardoise-500">
                        {dateCourte(g.date_depart)}
                        {g.compagnie_aerienne ? ` · ${g.compagnie_aerienne}` : ""}
                        {g.numero_vol ? ` ${g.numero_vol}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-sm font-medium text-ardoise-900">
                        {inscrits}
                        {g.capacite ? ` / ${g.capacite}` : ""}
                      </p>
                      {jours !== null && (
                        <p className="text-xs text-ardoise-500">
                          {jours > 0 ? `dans ${jours} j` : "aujourd'hui"}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Carte>
      </div>

      <div className="mt-4">
        <Carte
          titre="Derniers encaissements"
          action={
            <Link href="/paiements" className="text-xs font-medium text-marque-700 hover:underline">
              Journal complet
            </Link>
          }
        >
          {paiements.length === 0 ? (
            <EtatVide titre="Aucun encaissement enregistré" />
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <Th>Reçu</Th>
                  <Th>Pèlerin</Th>
                  <Th>Moyen</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Montant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {paiements.map((p) => (
                  <tr key={p.id}>
                    <Td className="tabular font-medium text-ardoise-900">{p.numero_recu}</Td>
                    <Td>
                      {p.dossiers?.pelerins
                        ? `${p.dossiers.pelerins.prenom} ${p.dossiers.pelerins.nom}`
                        : "—"}
                    </Td>
                    <Td>
                      <Badge>{MOYENS_PAIEMENT[p.moyen].court}</Badge>
                    </Td>
                    <Td className="tabular">{dateCourte(p.paye_le)}</Td>
                    <Td className="tabular text-right font-medium text-ardoise-900">
                      {xof(p.montant_xof)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      </div>
    </>
  );
}
