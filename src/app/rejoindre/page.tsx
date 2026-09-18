import Link from "next/link";
import type { Metadata } from "next";
import FormulaireRejoindre from "./formulaire";
import { AlerteConfiguration } from "@/components/alerte-configuration";

export const metadata: Metadata = { title: "Rejoindre mon agence" };

export default function PageRejoindre() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/connexion" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marque-600 text-sm font-bold text-white">
          MA
        </span>
        <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
        Rejoindre mon agence
      </h1>
      <p className="mt-2 text-sm text-ardoise-500">
        Votre agence vous a remis un code. Renseignez-le avec votre nom et votre téléphone :
        votre espace s&apos;ouvre aussitôt. Pas besoin d&apos;adresse e-mail.
      </p>

      <div className="mt-6">
        <AlerteConfiguration />
      </div>

      <div className="mt-6">
        <FormulaireRejoindre />
      </div>
    </main>
  );
}
