import type { Metadata } from "next";
import { exigerAcces } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { Badge, Carte, EnTetePage, EtatVide, Tableau, Td, Th } from "@/components/ui";
import { nombre, xof } from "@/lib/format";
import {
  BasculeForfait,
  BasculeSaison,
  FormulaireForfait,
  FormulaireSaison,
} from "./formulaires";
import type { Forfait, Saison } from "@/lib/database.types";

export const metadata: Metadata = { title: "Saisons & forfaits" };

export default async function PageCatalogue() {
  await exigerAcces("catalogue");
  const supabase = await creerClientServeur();

  const [{ data: saisonsBrutes }, { data: forfaitsBruts }, { data: dossiers }] = await Promise.all([
    supabase.from("saisons").select("*").order("annee_greg", { ascending: false }),
    supabase.from("forfaits").select("*").order("prix_xof", { ascending: false }),
    supabase.from("dossiers").select("saison_id, forfait_id, statut"),
  ]);

  const saisons = (saisonsBrutes ?? []) as Saison[];
  const forfaits = (forfaitsBruts ?? []) as Forfait[];
  const actifs = (dossiers ?? []).filter((d) => d.statut !== "annule");

  const inscritsParSaison = (saisonId: string) =>
    actifs.filter((d) => d.saison_id === saisonId).length;
  const inscritsParForfait = (forfaitId: string) =>
    actifs.filter((d) => d.forfait_id === forfaitId).length;

  return (
    <>
      <EnTetePage
        titre="Saisons & forfaits"
        description="Une saison porte le quota de la tutelle ; les forfaits en déclinent les prix."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Carte titre="Saisons">
            {saisons.length === 0 ? (
              <EtatVide
                titre="Aucune saison"
                description="Créez la saison en cours pour commencer à enregistrer des inscriptions."
              />
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <Th>Saison</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Inscrits</Th>
                    <Th className="text-right">Quota</Th>
                    <Th>État</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {saisons.map((s) => {
                    const inscrits = inscritsParSaison(s.id);
                    const depassement = s.quota !== null && inscrits > s.quota;
                    return (
                      <tr key={s.id}>
                        <Td className="font-medium text-ardoise-900">
                          {s.libelle}
                          <span className="block text-xs text-ardoise-400">
                            {s.annee_hijri ? `${s.annee_hijri} H · ` : ""}
                            {s.annee_greg}
                          </span>
                        </Td>
                        <Td className="uppercase">{s.type}</Td>
                        <Td
                          className={`tabular text-right font-medium ${
                            depassement ? "text-rose-600" : "text-ardoise-900"
                          }`}
                        >
                          {nombre(inscrits)}
                        </Td>
                        <Td className="tabular text-right">
                          {s.quota !== null ? nombre(s.quota) : "—"}
                        </Td>
                        <Td>
                          {s.ouverte ? (
                            <Badge ton="ok">Ouverte</Badge>
                          ) : (
                            <Badge ton="neutre">Clôturée</Badge>
                          )}
                        </Td>
                        <Td className="text-right">
                          <BasculeSaison saisonId={s.id} ouverte={s.ouverte} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            )}
          </Carte>

          <Carte titre="Forfaits">
            {forfaits.length === 0 ? (
              <EtatVide
                titre="Aucun forfait"
                description="Un forfait fixe le prix, l'acompte et les prestations incluses."
              />
            ) : (
              <ul className="divide-y divide-ardoise-100">
                {forfaits.map((f) => {
                  const saison = saisons.find((s) => s.id === f.saison_id);
                  return (
                    <li key={f.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ardoise-900">
                            {f.nom}
                            {!f.actif && (
                              <span className="ml-2">
                                <Badge ton="neutre">Inactif</Badge>
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-ardoise-500">
                            {saison?.libelle ?? "—"} · {f.type.toUpperCase()}
                            {f.duree_jours ? ` · ${f.duree_jours} jours` : ""}
                            {f.distance_haram ? ` · ${f.distance_haram}` : ""}
                          </p>
                          {(f.hotel_makkah || f.hotel_madinah) && (
                            <p className="mt-0.5 text-xs text-ardoise-500">
                              {[f.hotel_makkah, f.hotel_madinah].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {f.inclusions.length > 0 && (
                            <p className="mt-1.5 text-xs text-ardoise-600">
                              {f.inclusions.join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tabular text-sm font-semibold text-ardoise-950">
                            {xof(f.prix_xof)}
                          </p>
                          <p className="tabular text-xs text-ardoise-500">
                            acompte {xof(f.acompte_xof)}
                          </p>
                          <p className="mt-1 text-xs text-ardoise-500">
                            {nombre(inscritsParForfait(f.id))} inscrit(s)
                          </p>
                          <div className="mt-1">
                            <BasculeForfait forfaitId={f.id} actif={f.actif} />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte titre="Nouvelle saison">
            <FormulaireSaison />
          </Carte>
          <Carte titre="Nouveau forfait">
            <FormulaireForfait
              saisons={saisons
                .filter((s) => s.ouverte)
                .map((s) => ({ id: s.id, libelle: s.libelle, type: s.type }))}
            />
          </Carte>
        </div>
      </div>
    </>
  );
}
