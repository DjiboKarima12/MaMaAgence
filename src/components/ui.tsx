import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

export type Ton = "neutre" | "ok" | "attente" | "info" | "alerte";

const TONS: Record<Ton, string> = {
  neutre: "bg-ardoise-100 text-ardoise-700 ring-ardoise-200",
  ok: "bg-marque-50 text-marque-700 ring-marque-200",
  attente: "bg-sable-50 text-sable-700 ring-sable-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  alerte: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function Badge({
  ton = "neutre",
  children,
}: {
  ton?: Ton;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONS[ton]}`}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Structure                                                                   */
/* -------------------------------------------------------------------------- */

export function Carte({
  titre,
  action,
  children,
  className = "",
}: {
  titre?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-ardoise-200 bg-white ${className}`}>
      {(titre || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ardoise-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-ardoise-900">{titre}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EnTetePage({
  titre,
  description,
  action,
}: {
  titre: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ardoise-950">{titre}</h1>
        {description && <p className="mt-1 text-sm text-ardoise-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EtatVide({
  titre,
  description,
  action,
}: {
  titre: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-ardoise-800">{titre}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ardoise-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Boutons                                                                     */
/* -------------------------------------------------------------------------- */

const VARIANTES = {
  principal:
    "bg-marque-600 text-white hover:bg-marque-700 focus-visible:outline-marque-600 disabled:bg-marque-300",
  secondaire:
    "bg-white text-ardoise-800 ring-1 ring-inset ring-ardoise-300 hover:bg-ardoise-50 disabled:text-ardoise-400",
  discret: "text-ardoise-600 hover:bg-ardoise-100 hover:text-ardoise-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
} as const;

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof VARIANTES }) {
  return <button {...props} className={`${BASE} ${VARIANTES[variante]} ${className}`} />;
}

export function LienBouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: keyof typeof VARIANTES }) {
  return <Link {...props} className={`${BASE} ${VARIANTES[variante]} ${className}`} />;
}

/* -------------------------------------------------------------------------- */
/* Formulaires                                                                 */
/* -------------------------------------------------------------------------- */

const CONTROLE =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ardoise-900 ring-1 ring-inset ring-ardoise-300 placeholder:text-ardoise-400 focus:ring-2 focus:ring-inset focus:ring-marque-500 disabled:bg-ardoise-50";

export function Champ({
  label,
  aide,
  requis,
  children,
  className = "",
}: {
  label: string;
  aide?: string;
  requis?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ardoise-700">
        {label}
        {requis && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {aide && <span className="mt-1 block text-xs text-ardoise-500">{aide}</span>}
    </label>
  );
}

export function Saisie({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROLE} ${className}`} />;
}

export function Selection({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROLE} ${className}`} />;
}

export function Zone({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${CONTROLE} ${className}`} />;
}

export function Erreur({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
      {children}
    </p>
  );
}

export function Succes({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-marque-50 px-3 py-2 text-sm text-marque-700 ring-1 ring-inset ring-marque-200">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Tableaux                                                                    */
/* -------------------------------------------------------------------------- */

export function Tableau({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-ardoise-200 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ardoise-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-ardoise-700 ${className}`}>{children}</td>;
}

/* -------------------------------------------------------------------------- */
/* Statistiques                                                                */
/* -------------------------------------------------------------------------- */

export function Tuile({
  libelle,
  valeur,
  detail,
  ton = "neutre",
}: {
  libelle: string;
  valeur: ReactNode;
  detail?: ReactNode;
  ton?: Ton;
}) {
  const barre: Record<Ton, string> = {
    neutre: "bg-ardoise-300",
    ok: "bg-marque-500",
    attente: "bg-sable-400",
    info: "bg-sky-500",
    alerte: "bg-rose-500",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-ardoise-200 bg-white p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${barre[ton]}`} aria-hidden />
      <p className="text-xs font-medium uppercase tracking-wide text-ardoise-500">{libelle}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold text-ardoise-950">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-ardoise-500">{detail}</p>}
    </div>
  );
}

export function Jauge({ valeur, ton = "ok" }: { valeur: number; ton?: Ton }) {
  const couleur: Record<Ton, string> = {
    neutre: "bg-ardoise-400",
    ok: "bg-marque-500",
    attente: "bg-sable-400",
    info: "bg-sky-500",
    alerte: "bg-rose-500",
  };
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ardoise-200"
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${couleur[ton]}`} style={{ width: `${valeur}%` }} />
    </div>
  );
}
