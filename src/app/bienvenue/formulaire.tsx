"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Selection } from "@/components/ui";
import { REGIONS_NIGER } from "@/lib/niger";
import { messageErreurAuth } from "@/lib/supabase/config";

export default function FormulaireAgence({ nomSuggere }: { nomSuggere: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("creer_agence", {
      p_nom_agence: String(formData.get("nomAgence") ?? "").trim(),
      p_nom_complet: String(formData.get("nomComplet") ?? "").trim(),
      p_telephone: String(formData.get("telephone") ?? "").trim() || null,
      p_ville: String(formData.get("ville") ?? "Niamey"),
    });

    if (error) {
      setErreur(messageErreurAuth(error));
      setEnCours(false);
      return;
    }

    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>

      <Champ label="Nom de l'agence" requis>
        <Saisie name="nomAgence" required placeholder="Agence Al-Baraka Voyages" />
      </Champ>

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Votre nom complet" requis>
          <Saisie name="nomComplet" required defaultValue={nomSuggere} />
        </Champ>
        <Champ label="Téléphone">
          <Saisie name="telephone" type="tel" placeholder="+227 90 00 00 00" />
        </Champ>
      </div>

      <Champ label="Ville">
        <Selection name="ville" defaultValue="Niamey">
          {REGIONS_NIGER.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Selection>
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Création…" : "Ouvrir mon espace"}
      </Bouton>
    </form>
  );
}
