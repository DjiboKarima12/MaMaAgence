import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MaMaAgence — Gestion de pèlerinage",
    template: "%s · MaMaAgence",
  },
  description:
    "Logiciel de gestion Hajj et Omra pour les agences de voyage agréées du Niger : pèlerins, dossiers, pièces justificatives et paiements en FCFA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
