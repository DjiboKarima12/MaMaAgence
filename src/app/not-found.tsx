import Link from "next/link";

export default function Introuvable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-marque-700">Erreur 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ardoise-950">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-md text-sm text-ardoise-500">
        Le dossier, le pèlerin ou la page demandée n&apos;existe pas, ou ne fait pas partie de votre
        agence.
      </p>
      <Link
        href="/tableau-de-bord"
        className="mt-6 rounded-lg bg-marque-600 px-4 py-2 text-sm font-medium text-white hover:bg-marque-700"
      >
        Retour au tableau de bord
      </Link>
    </main>
  );
}
