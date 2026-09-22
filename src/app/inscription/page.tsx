import Link from "next/link";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import FormulaireInscription from "./formulaire";
import { AlerteConfiguration } from "@/components/alerte-configuration";

export const metadata: Metadata = { title: "Créer un espace agence" };

export default function PageInscription() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/connexion" className="flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
        Créer votre compte
      </h1>
      <p className="mt-2 text-sm text-ardoise-500">
        Créez votre compte. À l&apos;étape suivante, vous ouvrirez votre agence — ou vous la
        rejoindrez avec le code d&apos;invitation qu&apos;un collègue vous a transmis.
      </p>

      <div className="mt-6">
        <AlerteConfiguration />
      </div>

      <div className="mt-6">
        <FormulaireInscription />
      </div>

      <p className="mt-8 text-sm text-ardoise-500">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-marque-700 hover:text-marque-800">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
