import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Badge, Carte, EnTetePage, Jauge, Tuile } from "@/components/ui";
import {
  ListePieces,
  PanneauEcheances,
  PanneauGroupe,
  PanneauPaiements,
  PanneauStatut,
} from "@/components/dossier-panneaux";
import {
  affecterGroupe,
  ajouterEcheance,
  changerStatutDossier,
  majPieceDossier,
} from "@/lib/actions/dossiers";
import { STATUTS_DOSSIER } from "@/lib/niger";
import { alertePasseport, dateCourte, dateLongue, pourcentage, telephone, xof } from "@/lib/format";
import type {
  DocumentDossier,
  DossierFinance,
  Echeance,
  Forfait,
  Groupe,
  Paiement,
  Pelerin,
} from "@/lib/database.types";

export const metadata: Metadata = { title: "Dossier" };

export default async function PageDossier({ params }: { params: Promise<{ id: string }> }) {
  const { droits } = await exigerAcces("dossiers");
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data: financeBrut } = await supabase
    .from("v_dossiers_finance")
    .select("*")
    .eq("dossier_id", id)
    .maybeSingle();

  if (!financeBrut) notFound();
  const finance = financeBrut as DossierFinance;

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("*, forfaits(*), groupes(*), pelerins(*)")
    .eq("id", id)
    .maybeSingle();

  if (!dossier) notFound();

  const forfait = (dossier as unknown as { forfaits: Forfait }).forfaits;
  const groupe = (dossier as unknown as { groupes: Groupe | null }).groupes;
  const pelerin = (dossier as unknown as { pelerins: Pelerin }).pelerins;

  const [{ data: pieces }, { data: echeances }, { data: paiements }, { data: groupes }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("dossier_id", id).order("type"),
      supabase.from("echeances").select("*").eq("dossier_id", id).order("echue_le"),
      supabase.from("paiements").select("*").eq("dossier_id", id).order("paye_le", { ascending: false }),
      supabase
        .from("groupes")
        .select("id, nom")
        .eq("saison_id", dossier.saison_id)
        .order("date_depart"),
    ]);

  const alerte = alertePasseport(pelerin.passeport_expire_le, groupe?.date_depart ?? null);
  const statut = STATUTS_DOSSIER[finance.statut];

  return (
    <>
      <EnTetePage
        titre={finance.reference}
        description={`${pelerin.prenom} ${pelerin.nom} · ${forfait.nom}`}
        action={
          <div className="flex items-center gap-3">
            <Badge ton={statut.ton}>{statut.label}</Badge>
            <Link
              href={`/pelerins/${pelerin.id}`}
              className="text-sm font-medium text-marque-700 hover:underline"
            >
              Voir la fiche pèlerin
            </Link>
          </div>
        }
      />

      {alerte !== "aucune" && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5">
          <p className="text-sm font-medium text-rose-800">
            {alerte === "expire"
              ? "Passeport expiré"
              : alerte === "insuffisante"
                ? "Validité du passeport insuffisante au regard de la date de départ"
                : "Passeport proche de l'expiration"}
          </p>
          <p className="mt-0.5 text-sm text-rose-700">
            Expire le {dateLongue(pelerin.passeport_expire_le)}
            {groupe?.date_depart ? ` — départ prévu le ${dateCourte(groupe.date_depart)}` : ""}.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tuile libelle="Prix du forfait" valeur={xof(finance.net_xof + dossier.remise_xof)} />
        <Tuile
          libelle="Net à payer"
          valeur={xof(finance.net_xof)}
          detail={dossier.remise_xof > 0 ? `remise de ${xof(dossier.remise_xof)}` : undefined}
          ton="info"
        />
        <Tuile libelle="Réglé" valeur={xof(finance.regle_xof)} ton="ok" />
        <Tuile
          libelle="Solde"
          valeur={xof(finance.solde_xof)}
          ton={finance.solde_xof > 0 ? "attente" : "ok"}
        />
      </div>

      <div className="mt-4">
        <Carte className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ardoise-900">Avancement du règlement</h2>
            <span className="tabular text-sm text-ardoise-500">
              {pourcentage(finance.regle_xof, finance.net_xof)} %
            </span>
          </div>
          <div className="mt-3">
            <Jauge
              valeur={pourcentage(finance.regle_xof, finance.net_xof)}
              ton={finance.solde_xof > 0 ? "attente" : "ok"}
            />
          </div>
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Carte
            titre={`Pièces du dossier — ${finance.pieces_valides}/${finance.pieces_total} validées`}
          >
            <ListePieces
              action={majPieceDossier.bind(null, id)}
              pieces={(pieces ?? []) as DocumentDossier[]}
            />
          </Carte>

          <Carte titre="Encaissements">
            <PanneauPaiements
              dossierId={id}
              paiements={(paiements ?? []) as Paiement[]}
              solde={finance.solde_xof}
              peutEncaisser={droits.encaisser}
            />
          </Carte>

          <Carte titre="Échéancier">
            <PanneauEcheances
              action={ajouterEcheance.bind(null, id)}
              echeances={(echeances ?? []) as Echeance[]}
              dossierId={id}
            />
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte titre="Forfait">
            <dl className="divide-y divide-ardoise-100 text-sm">
              {[
                ["Nom", forfait.nom],
                ["Type", forfait.type === "hajj" ? "Hajj" : "Omra"],
                ["Durée", forfait.duree_jours ? `${forfait.duree_jours} jours` : null],
                ["Hôtel à Makkah", forfait.hotel_makkah],
                ["Hôtel à Madinah", forfait.hotel_madinah],
                ["Distance du Haram", forfait.distance_haram],
                ["Chambre", dossier.type_chambre],
                ["Acompte exigé", xof(forfait.acompte_xof)],
              ].map(([k, v]) => (
                <div key={k as string} className="px-5 py-2.5">
                  <dt className="text-xs uppercase tracking-wide text-ardoise-500">{k}</dt>
                  <dd className="mt-0.5 text-ardoise-900">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {forfait.inclusions.length > 0 && (
              <ul className="space-y-1 border-t border-ardoise-100 px-5 py-3 text-sm text-ardoise-600">
                {forfait.inclusions.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-marque-600">✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte titre="Statut">
            <PanneauStatut
              action={changerStatutDossier.bind(null, id)}
              statutActuel={finance.statut}
            />
          </Carte>

          <Carte titre="Départ">
            <PanneauGroupe
              action={affecterGroupe.bind(null, id)}
              groupes={groupes ?? []}
              groupeActuel={dossier.groupe_id}
              chambreActuelle={dossier.numero_chambre}
            />
            {groupe && (
              <div className="border-t border-ardoise-100 px-5 py-3 text-sm text-ardoise-600">
                <p>
                  Départ le {dateCourte(groupe.date_depart)}
                  {groupe.compagnie_aerienne ? ` · ${groupe.compagnie_aerienne}` : ""}
                  {groupe.numero_vol ? ` ${groupe.numero_vol}` : ""}
                </p>
                {groupe.encadrant_nom && (
                  <p className="mt-1">
                    Encadrant : {groupe.encadrant_nom} — {telephone(groupe.encadrant_telephone)}
                  </p>
                )}
              </div>
            )}
          </Carte>

          {dossier.notes && (
            <Carte titre="Observations">
              <p className="whitespace-pre-line px-5 py-4 text-sm text-ardoise-700">
                {dossier.notes}
              </p>
            </Carte>
          )}

          {dossier.statut === "annule" && dossier.motif_annulation && (
            <Carte titre="Annulation">
              <p className="px-5 py-4 text-sm text-rose-700">{dossier.motif_annulation}</p>
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}
