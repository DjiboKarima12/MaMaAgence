import { exigerSession } from "@/lib/session";
import { Navigation } from "@/components/navigation";

export default async function LayoutEspace({ children }: { children: React.ReactNode }) {
  const session = await exigerSession();

  return (
    <div className="min-h-screen">
      <Navigation
        nomAgence={session.agence.nom}
        nomUtilisateur={session.profil.nom_complet}
        role={session.profil.role}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
