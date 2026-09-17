"use client";

export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-rose-700">Une erreur est survenue</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ardoise-950">
        L&apos;opération n&apos;a pas abouti
      </h1>
      <p className="mt-2 max-w-md text-sm text-ardoise-500">
        Vérifiez votre connexion internet puis réessayez. Si le problème persiste, contactez le
        support en précisant l&apos;action tentée.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-marque-600 px-4 py-2 text-sm font-medium text-white hover:bg-marque-700"
      >
        Réessayer
      </button>
    </main>
  );
}
