import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import FormulaireConnexion from "./formulaire";
import { AlerteConfiguration } from "@/components/alerte-configuration";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[46%] lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marque-600 text-sm font-bold text-white">
              MA
            </span>
            <span className="text-lg font-semibold tracking-tight text-ardoise-950">MaMaAgence</span>
          </Link>

          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ardoise-950">
            Connexion à votre espace
          </h1>
          <p className="mt-2 text-sm text-ardoise-500">
            Gérez vos pèlerins, vos dossiers et vos encaissements.
          </p>

          <div className="mt-6">
            <AlerteConfiguration />
          </div>

          <div className="mt-6">
            <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-ardoise-100" />}>
              <FormulaireConnexion />
            </Suspense>
          </div>

          <div className="mt-8 space-y-3 border-t border-ardoise-200 pt-6">
            <Link
              href="/rejoindre"
              className="flex items-center justify-between gap-3 rounded-lg bg-marque-50 px-4 py-3 ring-1 ring-inset ring-marque-200 transition-colors hover:ring-marque-400"
            >
              <span>
                <span className="block text-sm font-medium text-marque-900">
                  J&apos;ai reçu un code d&apos;invitation
                </span>
                <span className="block text-xs text-marque-700">
                  Votre nom, votre téléphone, et vous entrez
                </span>
              </span>
              <span className="text-marque-700" aria-hidden>
                →
              </span>
            </Link>

            <p className="text-sm text-ardoise-500">
              Votre agence n&apos;a pas encore d&apos;espace ?{" "}
              <Link href="/inscription" className="font-medium text-marque-700 hover:text-marque-800">
                En créer un
              </Link>
            </p>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-marque-900 lg:block lg:w-[54%]">
        {/*
          Photo de fond. Déposez votre image dans public/accueil.jpg : si le
          fichier est absent, le vert de la marque reste seul, sans rien casser.
        */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/accueil.jpg')" }}
          aria-hidden
        />
        {/*
          Voile dégradé : dense en bas, où se trouve le texte, léger en haut
          pour laisser voir la photo. Sans lui, le texte blanc disparaîtrait
          sur un ciel clair.
        */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-marque-950/95 via-marque-900/80 to-marque-900/40"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-between p-16 text-marque-50">
          <div />
          <div className="max-w-md">
            <p className="text-3xl font-semibold leading-snug tracking-tight text-white">
              Le Hajj et la Omra, gérés sans classeur ni cahier.
            </p>
            <p className="mt-6 text-marque-200">
              Suivi des pièces du dossier, échéanciers en FCFA, reçus numérotés, alertes sur les
              passeports arrivant à expiration et listes de départ prêtes pour la tutelle.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-marque-800 pt-8 text-sm">
            <div>
              <dt className="text-marque-300">Devise</dt>
              <dd className="mt-1 font-semibold text-white">Franc CFA</dd>
            </div>
            <div>
              <dt className="text-marque-300">Encaissements</dt>
              <dd className="mt-1 font-semibold text-white">Airtel &amp; Moov Money</dd>
            </div>
            <div>
              <dt className="text-marque-300">Données</dt>
              <dd className="mt-1 font-semibold text-white">Cloisonnées par agence</dd>
            </div>
          </dl>
        </div>
      </aside>
    </main>
  );
}
