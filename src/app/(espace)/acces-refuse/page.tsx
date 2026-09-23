import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { Carte, LienBouton } from "@/components/ui";
import { ROLES } from "@/lib/roles";
import { SECTIONS_PAR_ROLE, sectionParDefaut, type Section } from "@/lib/acces";

export const metadata: Metadata = { title: "Accès refusé" };

const NOMS: Record<Section, string> = {
  "tableau-de-bord": "Tableau de bord",
  pelerins: "Pèlerins",
  dossiers: "Dossiers",
  paiements: "Paiements",
  groupes: "Groupes de départ",
  logistique: "Hébergement",
  catalogue: "Saisons & forfaits",
  parametres: "Paramètres",
};

export default async function PageAccesRefuse({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const session = await exigerSession();
  const { section } = await searchParams;

  const role = session.profil.role;
  const demandee = section && section in NOMS ? (section as Section) : null;
  const ouvertes = SECTIONS_PAR_ROLE[role];

  return (
    <div className="mx-auto max-w-lg py-12">
      <Carte>
        <div className="px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ardoise-100">
            <LockIcon className="h-5 w-5 text-ardoise-500" aria-hidden />
          </span>

          <h1 className="mt-4 text-lg font-semibold text-ardoise-950">
            {demandee ? `${NOMS[demandee]} ne fait pas partie de vos accès` : "Accès refusé"}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm text-ardoise-500">
            Votre rôle est <span className="font-medium text-ardoise-700">{ROLES[role].label}</span>{" "}
            — {ROLES[role].description.toLowerCase()}. Demandez au propriétaire de
            l&apos;agence s&apos;il vous faut davantage de droits.
          </p>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-ardoise-400">
              Ce à quoi vous avez accès
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {ouvertes.map((s) => (
                <LienBouton key={s} href={`/${s}`} variante="secondaire">
                  {NOMS[s]}
                </LienBouton>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <LienBouton href={`/${sectionParDefaut(role)}`}>Revenir à mon espace</LienBouton>
          </div>
        </div>
      </Carte>
    </div>
  );
}
