"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

export default function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("motDePasse") ?? ""),
    });

    if (error) {
      setErreur(messageErreurAuth(error));
      setEnCours(false);
      return;
    }

    const suite = params.get("suite");
    router.replace(suite && suite.startsWith("/") ? suite : "/tableau-de-bord");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>

      <Champ label="Adresse e-mail" requis>
        <Saisie
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@agence.ne"
        />
      </Champ>

      <Champ label="Mot de passe" requis>
        <Saisie
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>
    </form>
  );
}
