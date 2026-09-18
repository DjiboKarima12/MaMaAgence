"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Succes } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

/**
 * Changement de mot de passe. Un collaborateur entre la première fois avec le
 * code que son agence lui a remis — un secret que le propriétaire connaît.
 * C'est ici qu'il le remplace par le sien.
 */
export function FormulaireMotDePasse() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setSucces(null);

    const mdp = String(formData.get("motDePasse") ?? "");
    if (mdp.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mdp !== String(formData.get("confirmation") ?? "")) {
      setErreur("Les deux saisies ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.updateUser({ password: mdp });

    if (error) {
      setErreur(messageErreurAuth(error));
      setEnCours(false);
      return;
    }

    setSucces("Mot de passe enregistré. Utilisez-le à votre prochaine connexion.");
    setEnCours(false);
  }

  return (
    <form action={envoyer} className="space-y-3 px-5 py-4">
      <Erreur>{erreur}</Erreur>
      <Succes>{succes}</Succes>

      <Champ label="Nouveau mot de passe" aide="8 caractères minimum">
        <Saisie name="motDePasse" type="password" autoComplete="new-password" required />
      </Champ>
      <Champ label="Confirmer">
        <Saisie name="confirmation" type="password" autoComplete="new-password" required />
      </Champ>

      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        <KeyRoundIcon className="h-4 w-4" aria-hidden />
        {enCours ? "Enregistrement…" : "Changer mon mot de passe"}
      </Bouton>
    </form>
  );
}
