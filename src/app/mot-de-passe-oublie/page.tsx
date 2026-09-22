import Link from "next/link";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import FormulaireOubli from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function PageOubli() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/connexion" className="flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
        Mot de passe oublié
      </h1>
      <p className="mt-2 text-sm text-ardoise-500">
        Indiquez votre adresse e-mail : vous recevrez un lien pour en choisir un nouveau.
      </p>

      <div className="mt-8">
        <FormulaireOubli />
      </div>

      <p className="mt-8 text-sm text-ardoise-500">
        <Link href="/connexion" className="font-medium text-marque-700 hover:text-marque-800">
          Revenir à la connexion
        </Link>
      </p>
    </main>
  );
}
