"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CameraIcon,
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { rattacherPiece } from "@/lib/actions/inscription";

const TAILLE_MAX = 10 * 1024 * 1024; // aligné sur la limite du bucket
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

type Etat = "vide" | "envoi" | "fait" | "erreur";

export interface PieceExistante {
  chemin: string;
  nomFichier: string;
}

/**
 * Dépôt d'une pièce justificative : glisser-déposer, sélection de fichier ou
 * prise de vue. Le fichier part directement du navigateur vers le stockage,
 * dans le dossier de l'agence ; une action serveur l'attache ensuite au
 * dossier du pèlerin.
 */
export function CarteTeleversement({
  dossierId,
  agenceId,
  type,
  titre,
  description,
  obligatoire = false,
  pieceExistante,
}: {
  dossierId: string;
  agenceId: string;
  type: string;
  titre: string;
  description?: string;
  obligatoire?: boolean;
  pieceExistante?: PieceExistante;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const appareil = useRef<HTMLInputElement>(null);

  const [etat, setEtat] = useState<Etat>(pieceExistante ? "fait" : "vide");
  const [nomFichier, setNomFichier] = useState(pieceExistante?.nomFichier ?? "");
  const [apercu, setApercu] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);

  async function envoyer(fichier: File) {
    setErreur(null);

    if (fichier.size > TAILLE_MAX) {
      setEtat("erreur");
      setErreur(
        `Fichier trop lourd (${Math.round(fichier.size / 1024 / 1024)} Mo). Maximum 10 Mo — photographiez en qualité moyenne.`,
      );
      return;
    }
    if (fichier.type && !TYPES_ACCEPTES.includes(fichier.type)) {
      setEtat("erreur");
      setErreur("Format non accepté. Utilisez une photo (JPG, PNG) ou un PDF.");
      return;
    }

    setEtat("envoi");
    setNomFichier(fichier.name);

    if (fichier.type.startsWith("image/")) {
      setApercu(URL.createObjectURL(fichier));
    }

    const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "bin";
    const chemin = `${agenceId}/${dossierId}/${type}-${Date.now()}.${extension}`;

    const supabase = creerClientNavigateur();
    const { error } = await supabase.storage
      .from("documents")
      .upload(chemin, fichier, { upsert: true, contentType: fichier.type || undefined });

    if (error) {
      setEtat("erreur");
      setErreur(
        error.message.toLowerCase().includes("bucket")
          ? "Le stockage n'est pas configuré. Lancez la migration 0003 dans Supabase."
          : error.message,
      );
      return;
    }

    const resultat = await rattacherPiece(dossierId, type, chemin);
    if (resultat.statut === "erreur") {
      setEtat("erreur");
      setErreur(resultat.message);
      return;
    }

    setEtat("fait");
  }

  function deposer(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setSurvol(false);
    const fichier = e.dataTransfer.files?.[0];
    if (fichier) void envoyer(fichier);
  }

  const bordure =
    etat === "fait"
      ? "border-marque-300 bg-marque-50/40"
      : etat === "erreur"
        ? "border-rose-300 bg-rose-50/40"
        : survol
          ? "border-sable-400 bg-sable-50"
          : "border-ardoise-300 bg-white";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={deposer}
      className={`rounded-xl border-2 border-dashed p-4 transition-colors ${bordure}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ardoise-900">
            {titre}
            {obligatoire && <span className="ml-1 text-xs font-normal text-rose-600">requis</span>}
          </p>
          {description && <p className="mt-0.5 text-xs text-ardoise-500">{description}</p>}
        </div>

        {etat === "fait" && (
          <CheckCircle2Icon className="h-5 w-5 shrink-0 text-marque-600" aria-hidden />
        )}
        {etat === "envoi" && (
          <Loader2Icon className="h-5 w-5 shrink-0 animate-spin text-ardoise-400" aria-hidden />
        )}
        {etat === "erreur" && (
          <TriangleAlertIcon className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        )}
      </div>

      {etat === "fait" || etat === "envoi" ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-white p-2 ring-1 ring-inset ring-ardoise-200">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={apercu}
              alt=""
              className="h-12 w-12 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-ardoise-100">
              <FileTextIcon className="h-5 w-5 text-ardoise-500" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-ardoise-800">
              {nomFichier}
            </span>
            <span className="block text-xs text-ardoise-500">
              {etat === "envoi" ? "Envoi en cours…" : "Enregistré"}
            </span>
          </span>
          {etat === "fait" && (
            <button
              type="button"
              onClick={() => {
                setEtat("vide");
                setApercu(null);
                setNomFichier("");
              }}
              className="shrink-0 rounded p-1 text-ardoise-400 hover:bg-ardoise-100 hover:text-ardoise-700"
              aria-label="Remplacer le fichier"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-ardoise-500">
            Glissez le fichier ici, ou :
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => champ.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ardoise-800 ring-1 ring-inset ring-ardoise-300 hover:bg-ardoise-50"
            >
              <UploadIcon className="h-3.5 w-3.5" aria-hidden />
              Choisir un fichier
            </button>
            <button
              type="button"
              onClick={() => appareil.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ardoise-800 ring-1 ring-inset ring-ardoise-300 hover:bg-ardoise-50"
            >
              <CameraIcon className="h-3.5 w-3.5" aria-hidden />
              Photographier
            </button>
          </div>
        </>
      )}

      {erreur && <p className="mt-2 text-xs text-rose-700">{erreur}</p>}

      <input
        ref={champ}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void envoyer(f);
          e.target.value = "";
        }}
      />
      {/* `capture` ouvre directement l'appareil photo sur mobile. */}
      <input
        ref={appareil}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void envoyer(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
