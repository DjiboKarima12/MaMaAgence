import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import FormulaireNouveauMotDePasse from "./formulaire";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function PageNouveauMotDePasse() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/connexion" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marque-600 text-sm font-bold text-white">
          MA
        </span>
        <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
        Choisir un nouveau mot de passe
      </h1>

      <div className="mt-8">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-ardoise-100" />}>
          <FormulaireNouveauMotDePasse />
        </Suspense>
      </div>
    </main>
  );
}
