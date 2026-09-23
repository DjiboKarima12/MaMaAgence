"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { libelleRole } from "@/lib/roles";
import { peutVoir, type Section } from "@/lib/acces";
import type { UserRole } from "@/lib/database.types";
import {
  BanknoteIcon,
  BedDoubleIcon,
  FolderOpenIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PackageIcon,
  PlaneTakeoffIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

const LIENS: { section: Section; label: string; Icone: typeof UsersIcon }[] = [
  { section: "tableau-de-bord", label: "Tableau de bord", Icone: LayoutDashboardIcon },
  { section: "pelerins", label: "Pèlerins", Icone: UsersIcon },
  { section: "dossiers", label: "Dossiers", Icone: FolderOpenIcon },
  { section: "paiements", label: "Paiements", Icone: BanknoteIcon },
  { section: "groupes", label: "Groupes de départ", Icone: PlaneTakeoffIcon },
  { section: "logistique", label: "Hébergement", Icone: BedDoubleIcon },
  { section: "catalogue", label: "Saisons & forfaits", Icone: PackageIcon },
  { section: "parametres", label: "Paramètres", Icone: SettingsIcon },
];

export function Navigation({
  nomAgence,
  nomUtilisateur,
  role,
}: {
  nomAgence: string;
  nomUtilisateur: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  const contenu = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{nomAgence}</p>
          <p className="text-xs text-marque-300">MaMaAgence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {LIENS.filter((l) => peutVoir(role, l.section)).map(({ section, label, Icone }) => {
          const href = `/${section}`;
          const actif = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOuvert(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                actif
                  ? "bg-marque-800 font-medium text-white"
                  : "text-marque-200 hover:bg-marque-800/60 hover:text-white"
              }`}
            >
              <Icone className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-marque-800 p-3">
        <div className="px-2 pb-2">
          <p className="truncate text-sm font-medium text-white">{nomUtilisateur}</p>
          <p className="text-xs text-marque-300">{libelleRole(role)}</p>
        </div>
        <form action="/auth/deconnexion" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-marque-200 transition-colors hover:bg-marque-800/60 hover:text-white"
          >
            <LogOutIcon className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre mobile */}
      <div className="sans-impression flex items-center gap-3 border-b border-ardoise-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="rounded-lg p-2 text-ardoise-600 hover:bg-ardoise-100"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-semibold text-ardoise-900">{nomAgence}</span>
      </div>

      {ouvert && (
        <div className="sans-impression fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ardoise-950/50"
            onClick={() => setOuvert(false)}
            aria-label="Fermer le menu"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-marque-900">
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-marque-200 hover:bg-marque-800"
              aria-label="Fermer le menu"
            >
              <XIcon className="h-5 w-5" />
            </button>
            {contenu}
          </div>
        </div>
      )}

      {/* Barre latérale fixe */}
      <aside className="sans-impression hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:bg-marque-900">
        {contenu}
      </aside>
    </>
  );
}
