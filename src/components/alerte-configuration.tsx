import { supabaseConfigure } from "@/lib/supabase/config";

/**
 * Bandeau affiché tant que le projet Supabase n'est pas branché. Sans lui,
 * l'utilisateur remplit tout le formulaire avant de tomber sur une erreur réseau.
 */
export function AlerteConfiguration() {
  if (supabaseConfigure()) return null;

  return (
    <div className="rounded-xl border border-sable-300 bg-sable-50 px-4 py-3.5">
      <p className="text-sm font-semibold text-sable-900">
        Base de données non configurée
      </p>
      <p className="mt-1 text-sm text-sable-800">
        La création de compte ne fonctionnera pas tant que l&apos;application
        n&apos;est pas reliée à un projet Supabase.
      </p>
      <ol className="mt-2.5 space-y-1 text-sm text-sable-800">
        <li>
          1. Créez un projet gratuit sur{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            supabase.com
          </a>
        </li>
        <li>
          2. Exécutez <code className="rounded bg-sable-100 px-1 py-0.5 text-xs">supabase/migrations/0001_init.sql</code>{" "}
          dans le SQL Editor
        </li>
        <li>
          3. Reportez l&apos;URL et la clé <span className="font-mono text-xs">anon</span> dans{" "}
          <code className="rounded bg-sable-100 px-1 py-0.5 text-xs">.env.local</code>, puis
          relancez <code className="rounded bg-sable-100 px-1 py-0.5 text-xs">npm run dev</code>
        </li>
      </ol>
    </div>
  );
}
