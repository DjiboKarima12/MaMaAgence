"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";
import { identifiantVersEmail } from "@/lib/identifiant";

export default function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    // Un numéro de téléphone est traduit en adresse technique : les agents
    // se connectent avec leur numéro, les propriétaires avec leur e-mail.
    const email = identifiantVersEmail(String(formData.get("identifiant") ?? ""));
    if (!email) {
      setErreur("Saisissez votre adresse e-mail, ou vos huit chiffres de téléphone.");
      setEnCours(false);
      return;
    }

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithPassword({
      email,
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

      <Champ label="Téléphone ou adresse e-mail" requis>
        <Saisie
          name="identifiant"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="96 45 12 78"
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

      <div className="text-right">
        <Link
          href="/mot-de-passe-oublie"
          className="text-sm font-medium text-marque-700 hover:text-marque-800"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>
    </form>
  );
}
