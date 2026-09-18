"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Selection } from "@/components/ui";
import { REGIONS_NIGER } from "@/lib/niger";
import { messageErreurAuth } from "@/lib/supabase/config";

type Mode = "rejoindre" | "creer";

export default function FormulaireAgence({ nomSuggere }: { nomSuggere: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("rejoindre");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    const supabase = creerClientNavigateur();
    const nomComplet = String(formData.get("nomComplet") ?? "").trim();
    const telephone = String(formData.get("telephone") ?? "").trim() || null;

    const { error } =
      mode === "rejoindre"
        ? await supabase.rpc("rejoindre_agence", {
            p_code: String(formData.get("code") ?? "").trim().toUpperCase(),
            p_nom_complet: nomComplet,
            p_telephone: telephone,
          })
        : await supabase.rpc("creer_agence", {
            p_nom_agence: String(formData.get("nomAgence") ?? "").trim(),
            p_nom_complet: nomComplet,
            p_telephone: telephone,
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
    <div className="space-y-5">
      {/* Rejoindre une agence existante, ou en ouvrir une nouvelle. */}
      <div
        role="tablist"
        aria-label="Type de compte"
        className="grid grid-cols-2 gap-1 rounded-lg bg-ardoise-100 p-1"
      >
        {(
          [
            { v: "rejoindre", l: "J'ai un code d'invitation" },
            { v: "creer", l: "Je crée mon agence" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            role="tab"
            type="button"
            aria-selected={mode === o.v}
            onClick={() => {
              setMode(o.v);
              setErreur(null);
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === o.v
                ? "bg-white text-ardoise-950 shadow-sm"
                : "text-ardoise-600 hover:text-ardoise-900"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>

      <form action={envoyer} className="space-y-4">
        <Erreur>{erreur}</Erreur>

        {mode === "rejoindre" ? (
          <Champ
            label="Code d'invitation"
            requis
            aide="Huit caractères, transmis par le propriétaire de l'agence"
          >
            <Saisie
              name="code"
              required
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="A7K2-9XPQ"
              className="tabular text-center text-lg font-semibold uppercase tracking-[0.2em]"
            />
          </Champ>
        ) : (
          <Champ label="Nom de l'agence" requis>
            <Saisie name="nomAgence" required placeholder="Agence Al-Baraka Voyages" />
          </Champ>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Votre nom complet" requis>
            <Saisie name="nomComplet" required defaultValue={nomSuggere} />
          </Champ>
          <Champ label="Téléphone">
            <Saisie name="telephone" type="tel" placeholder="+227 90 00 00 00" />
          </Champ>
        </div>

        {mode === "creer" && (
          <Champ label="Ville">
            <Selection name="ville" defaultValue="Niamey">
              {REGIONS_NIGER.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Selection>
          </Champ>
        )}

        <Bouton type="submit" disabled={enCours} className="w-full">
          {enCours
            ? "Validation…"
            : mode === "rejoindre"
              ? "Rejoindre l'agence"
              : "Ouvrir mon espace"}
        </Bouton>
      </form>
    </div>
  );
}
