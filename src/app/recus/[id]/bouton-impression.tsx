"use client";

import { PrinterIcon } from "lucide-react";
import { Bouton } from "@/components/ui";

export default function BoutonImpression() {
  return (
    <Bouton type="button" onClick={() => window.print()}>
      <PrinterIcon className="h-4 w-4" aria-hidden />
      Imprimer le reçu
    </Bouton>
  );
}
