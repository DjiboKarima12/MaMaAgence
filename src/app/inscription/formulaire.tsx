"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Succes } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

/**
 * Crée uniquement le compte. Le rattachement a une agence — la créer, ou en
 * rejoindre une avec un code — se fait ensuite sur /bienvenue : un seul
 * chemin, que l'on arrive avec ou sans confirmation d'e-mail.
 */
export default function FormulaireInscription() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setInfo(null);
    setEnCours(true);

    const motDePasse = String(formData.get("motDePasse") ?? "");
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      setEnCours(false);
      return;
    }

    const nomComplet = String(formData.get("nomComplet") ?? "").trim();
    const supabase = creerClientNavigateur();

    const { data, error } = await supabase.auth.signUp({
      email: String(formData.get("email") ?? "").trim(),
      password: motDePasse,
      options: { data: { nom_complet: nomComplet } },
    });

    if (error) {
      setErreur(messageErreurAuth(error));
      setEnCours(false);
      return;
    }

    // Sans confirmation d'e-mail activee, la session est immediate.
    if (!data.session) {
      setInfo(
        "Compte créé. Confirmez votre adresse e-mail, puis connectez-vous pour terminer.",
      );
      setEnCours(false);
      return;
    }

    router.replace("/bienvenue");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>
      <Succes>{info}</Succes>

      <Champ label="Votre nom complet" requis>
        <Saisie name="nomComplet" required placeholder="Ibrahim Moussa" autoComplete="name" />
      </Champ>

      <Champ label="Adresse e-mail" requis>
        <Saisie name="email" type="email" autoComplete="email" required />
      </Champ>

      <Champ label="Mot de passe" requis aide="8 caractères minimum">
        <Saisie name="motDePasse" type="password" autoComplete="new-password" required />
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Création…" : "Créer mon compte"}
      </Bouton>
    </form>
  );
}
