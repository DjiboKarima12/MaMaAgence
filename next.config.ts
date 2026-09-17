import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le badge de développement s'ancre dans un coin de l'écran et recouvrait le
  // bouton de déconnexion. Tous les coins étant occupés (barre latérale,
  // recherche, bouton flottant), on le masque : Next.js continue d'afficher
  // les erreurs de compilation et d'exécution.
  devIndicators: false,

  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
