"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { Bouton, Champ, Erreur, Saisie, Selection, Succes } from "@/components/ui";
import { REGIONS_NIGER } from "@/lib/niger";
import { messageErreurAuth } from "@/lib/supabase/config";

export default function FormulaireInscription() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setInfo(null);
    setEnCours(true);

    const email = String(formData.get("email") ?? "").trim();
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const nomAgence = String(formData.get("nomAgence") ?? "").trim();
    const nomComplet = String(formData.get("nomComplet") ?? "").trim();
    const telephone = String(formData.get("telephone") ?? "").trim() || null;
    const ville = String(formData.get("ville") ?? "Niamey");

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      setEnCours(false);
      return;
    }

    const supabase = creerClientNavigateur();

    const { data: inscription, error: erreurAuth } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom_complet: nomComplet } },
    });

    if (erreurAuth) {
      setErreur(messageErreurAuth(erreurAuth));
      setEnCours(false);
      return;
    }

    // Si la confirmation par e-mail est activée, il n'y a pas encore de session :
    // l'agence sera créée à la première connexion.
    if (!inscription.session) {
      setInfo(
        "Compte créé. Confirmez votre adresse e-mail, puis connectez-vous pour finaliser la création de l'agence.",
      );
      setEnCours(false);
      return;
    }

    const { error: erreurAgence } = await supabase.rpc("creer_agence", {
      p_nom_agence: nomAgence,
      p_nom_complet: nomComplet,
      p_telephone: telephone,
      p_ville: ville,
    });

    if (erreurAgence) {
      setErreur(messageErreurAuth(erreurAgence));
      setEnCours(false);
      return;
    }

    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <form action={envoyer} className="space-y-4">
      <Erreur>{erreur}</Erreur>
      <Succes>{info}</Succes>

      <Champ label="Nom de l'agence" requis>
        <Saisie name="nomAgence" required placeholder="Agence Al-Baraka Voyages" />
      </Champ>

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Votre nom complet" requis>
          <Saisie name="nomComplet" required placeholder="Ibrahim Moussa" />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Adresse e-mail" requis>
          <Saisie name="email" type="email" autoComplete="email" required />
        </Champ>
        <Champ label="Mot de passe" requis aide="8 caractères minimum">
          <Saisie name="motDePasse" type="password" autoComplete="new-password" required />
        </Champ>
      </div>

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Création…" : "Créer l'espace agence"}
      </Bouton>
    </form>
  );
}
