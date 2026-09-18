"use client";

import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Succes } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

export default function FormulaireOubli() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnCours(true);

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(formData.get("email") ?? "").trim(),
      { redirectTo: `${window.location.origin}/nouveau-mot-de-passe` },
    );

    if (error) {
      setErreur(messageErreurAuth(error));
      setEnCours(false);
      return;
    }

    setEnvoye(true);
    setEnCours(false);
  }

  if (envoye) {
    return (
      <Succes>
        Si un compte existe avec cette adresse, un lien vient d&apos;y être envoyé. Pensez à
        regarder dans les indésirables : le lien est valable une heure.
      </Succes>
    );
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>
      <Champ label="Adresse e-mail" requis>
        <Saisie name="email" type="email" autoComplete="email" required />
      </Champ>
      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Envoi…" : "Recevoir le lien"}
      </Bouton>
    </form>
  );
}
