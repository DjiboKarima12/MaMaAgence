import Image from "next/image";

/**
 * Marque de l'application.
 *
 * L'image est décorative : le nom « MaMaAgence » l'accompagne partout où elle
 * apparaît, un texte de remplacement ferait donc doublon pour un lecteur
 * d'écran.
 */
export function Logo({
  taille = 36,
  className = "",
}: {
  taille?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.jpg"
      alt=""
      width={taille}
      height={taille}
      priority
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
}
