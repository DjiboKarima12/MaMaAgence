import Link from "next/link";
import type { Metadata } from "next";
import FormulaireInscription from "./formulaire";
import { AlerteConfiguration } from "@/components/alerte-configuration";

export const metadata: Metadata = { title: "Créer un espace agence" };

export default function PageInscription() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/connexion" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marque-600 text-sm font-bold text-white">
          MA
        </span>
        <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
        Créer l&apos;espace de votre agence
      </h1>
      <p className="mt-2 text-sm text-ardoise-500">
        Vous devenez propriétaire de l&apos;espace et pourrez ensuite inviter vos agents,
        gestionnaires et comptables.
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
