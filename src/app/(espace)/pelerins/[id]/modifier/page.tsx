import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigerSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnTetePage } from "@/components/ui";
import FormulairePelerin from "@/components/formulaire-pelerin";
import { modifierPelerin } from "@/lib/actions/pelerins";

export const metadata: Metadata = { title: "Modifier un pèlerin" };

export default async function PageModifierPelerin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerSession();
  const { id } = await params;
  const supabase = await creerClientServeur();

  const [{ data: pelerin }, { data: mahrams }] = await Promise.all([
    supabase.from("pelerins").select("*").eq("id", id).maybeSingle(),
    supabase.from("pelerins").select("id, nom, prenom, matricule").eq("sexe", "M").order("nom"),
  ]);

  if (!pelerin) notFound();

  return (
    <>
      <EnTetePage
        titre={`${pelerin.prenom} ${pelerin.nom}`}
        description={`Fiche ${pelerin.matricule}`}
      />
      <FormulairePelerin
        action={modifierPelerin.bind(null, id)}
        pelerin={pelerin}
        mahramPossibles={(mahrams ?? []).filter((m) => m.id !== id)}
      />
    </>
  );
}
