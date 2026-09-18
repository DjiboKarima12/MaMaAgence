"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Succes } from "@/components/ui";
import { messageErreurAuth } from "@/lib/supabase/config";

export default function FormulaireNouveauMotDePasse() {
  const router = useRouter();
  const params = useSearchParams();
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Le lien reçu par e-mail dépose un code dans l'URL : il faut l'échanger
  // contre une session avant de pouvoir changer le mot de passe.
  useEffect(() => {
    const supabase = creerClientNavigateur();
    const code = params.get("code");

    async function preparer() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && !/already|invalid/i.test(error.message)) {
          setErreur(messageErreurAuth(error));
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setErreur(
          "Lien invalide ou expiré. Demandez-en un nouveau depuis la page de connexion.",
        );
      }
      setPret(true);
    }

    void preparer();
  }, [params]);

  async function envoyer(formData: FormData) {
    setErreur(null);

    const mdp = String(formData.get("motDePasse") ?? "");
    if (mdp.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mdp !== String(formData.get("confirmation") ?? "")) {
      setErreur("Les deux mots de passe ne correspondent pas.");
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

    router.replace("/tableau-de-bord");
    router.refresh();
  }

  if (!pret) {
    return <div className="h-40 animate-pulse rounded-lg bg-ardoise-100" />;
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>
      {!erreur && <Succes>Lien valide. Choisissez votre nouveau mot de passe.</Succes>}

      <Champ label="Nouveau mot de passe" requis aide="8 caractères minimum">
        <Saisie name="motDePasse" type="password" autoComplete="new-password" required />
      </Champ>
      <Champ label="Confirmer" requis>
        <Saisie name="confirmation" type="password" autoComplete="new-password" required />
      </Champ>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Enregistrement…" : "Enregistrer et me connecter"}
      </Bouton>
    </form>
  );
}
