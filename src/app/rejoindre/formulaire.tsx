"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie } from "@/components/ui";
import { emailTechnique, normaliserTelephone } from "@/lib/identifiant";
import { messageErreurAuth } from "@/lib/supabase/config";

/**
 * Entrée d'un collaborateur invité : code, nom, téléphone, mot de passe.
 * Un seul écran, sans adresse e-mail. Le compte est créé puis rattaché à
 * l'agence dans la foulée.
 */
export default function FormulaireRejoindre() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);

    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const nom = String(formData.get("nom") ?? "").trim();
    const telSaisi = String(formData.get("telephone") ?? "");
    const motDePasse = String(formData.get("motDePasse") ?? "");

    const local = normaliserTelephone(telSaisi);
    if (!local) {
      setErreur("Numéro de téléphone invalide : huit chiffres attendus, par exemple 96 45 12 78.");
      return;
    }
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setEnCours(true);
    const supabase = creerClientNavigateur();

    const { data, error: erreurCompte } = await supabase.auth.signUp({
      email: emailTechnique(local),
      password: motDePasse,
      options: { data: { nom_complet: nom, telephone: `+227${local}` } },
    });

    if (erreurCompte) {
      setErreur(
        /already registered|already been/i.test(erreurCompte.message)
          ? "Ce numéro a déjà un compte. Connectez-vous avec votre mot de passe habituel."
          : messageErreurAuth(erreurCompte),
      );
      setEnCours(false);
      return;
    }

    // Sans session, le rattachement ne peut pas se faire : la confirmation
    // d'e-mail est restée activée côté Supabase.
    if (!data.session) {
      setErreur(
        "La création de compte immédiate est désactivée sur ce projet. " +
          "Demandez au responsable de décocher « Confirm email » dans les réglages Supabase.",
      );
      setEnCours(false);
      return;
    }

    const { error: erreurRattachement } = await supabase.rpc("rejoindre_agence", {
      p_code: code,
      p_nom_complet: nom,
      p_telephone: `+227${local}`,
    });

    if (erreurRattachement) {
      setErreur(messageErreurAuth(erreurRattachement));
      setEnCours(false);
      return;
    }

    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>

      <Champ label="Code reçu" requis aide="Huit caractères, transmis par votre agence">
        <Saisie
          name="code"
          required
          autoFocus
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="A7K2-9XPQ"
          className="tabular text-center text-xl font-semibold uppercase tracking-[0.25em]"
        />
      </Champ>

      <Champ label="Votre nom complet" requis>
        <Saisie name="nom" required autoComplete="name" placeholder="Aïcha Oumarou" />
      </Champ>

      <Champ label="Votre téléphone" requis aide="Ce numéro vous servira à vous reconnecter">
        <span className="flex">
          <span className="inline-flex items-center rounded-l-lg bg-ardoise-100 px-3 text-sm text-ardoise-600 ring-1 ring-inset ring-ardoise-300">
            +227
          </span>
          <Saisie
            name="telephone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="96 45 12 78"
            className="rounded-l-none"
          />
        </span>
      </Champ>

      <Champ label="Choisissez un mot de passe" requis aide="8 caractères minimum">
        <Saisie name="motDePasse" type="password" required autoComplete="new-password" />
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Validation…" : "Entrer dans mon espace"}
      </Bouton>

      <p className="text-center text-sm text-ardoise-500">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-marque-700 hover:text-marque-800">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
