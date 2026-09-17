"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDownIcon } from "lucide-react";

/**
 * Sélecteur de campagne. La saison choisie passe par l'URL plutôt que par un
 * état local : le tableau de bord reste une page serveur, et le lien est
 * partageable entre collègues.
 */
export function SelecteurSaison({
  saisons,
  saisonActive,
}: {
  saisons: { id: string; libelle: string; type: string }[];
  saisonActive: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [enCours, demarrer] = useTransition();

  if (saisons.length === 0) return null;

  function changer(valeur: string) {
    const suivant = new URLSearchParams(params.toString());
    if (valeur) suivant.set("saison", valeur);
    else suivant.delete("saison");

    demarrer(() => {
      const requete = suivant.toString();
      router.replace(requete ? `/tableau-de-bord?${requete}` : "/tableau-de-bord");
    });
  }

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-marque-500"
        aria-hidden
      />
      <select
        aria-label="Campagne affichée"
        value={saisonActive ?? ""}
        disabled={enCours}
        onChange={(e) => changer(e.target.value)}
        className="appearance-none rounded-full border border-ardoise-300 bg-white py-1.5 pl-7 pr-9 text-sm font-medium text-ardoise-800 hover:bg-ardoise-50 focus:outline-none focus:ring-2 focus:ring-marque-500 disabled:opacity-60"
      >
        <option value="">Toutes les campagnes</option>
        {saisons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.libelle}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise-400"
        aria-hidden
      />
    </div>
  );
}
