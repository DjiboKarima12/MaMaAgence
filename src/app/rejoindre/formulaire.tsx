"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

/**
 * Première entrée d'un collaborateur. Son compte a déjà été créé par le
 * propriétaire : le code reçu tient lieu de mot de passe d'entrée, il n'y a
 * donc rien à inscrire, seulement à se connecter.
 */
export default function FormulaireRejoindre() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const code = String(formData.get("code") ?? "").trim().toUpperCase();

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithPassword({ email, password: code });

    if (error) {
      setErreur(
        /invalid login credentials/i.test(error.message)
          ? "Adresse ou code incorrect. Vérifiez les deux auprès de votre agence : le code comporte huit caractères, avec un tiret au milieu."
          : messageErreurAuth(error),
      );
      setEnCours(false);
      return;
    }

    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>

      <Champ label="Votre adresse e-mail" requis>
        <Saisie
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="aicha@agence.ne"
        />
      </Champ>

      <Champ label="Code reçu" requis aide="Huit caractères, transmis par votre agence">
        <Saisie
          name="code"
          required
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="A7K2-9XPQ"
          className="tabular text-center text-xl font-semibold uppercase tracking-[0.25em]"
        />
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Vérification…" : "Entrer dans mon espace"}
      </Bouton>

      <p className="text-center text-sm text-ardoise-500">
        Vous avez déjà choisi votre mot de passe ?{" "}
        <Link href="/connexion" className="font-medium text-marque-700 hover:text-marque-800">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
