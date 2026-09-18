-- =============================================================================
--  Migration 0003 : parcours d'inscription guide
--
--  1. Point d'embarquement souhaite par le pelerin, choisi des l'inscription.
--     Il precede l'affectation a un groupe : on sait ou la personne veut
--     partir avant de savoir sur quel vol elle partira.
--  2. Rappel du bucket de pieces jointes et de ses politiques, au cas ou la
--     migration 0001 se soit arretee sur un manque de privileges.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Point d'embarquement
-- -----------------------------------------------------------------------------
alter table dossiers
  add column if not exists aeroport_prefere text;

comment on column dossiers.aeroport_prefere is
  'Code AITA du point d''embarquement souhaite : NIM, ZND, AJY, MFQ, THZ.';

-- -----------------------------------------------------------------------------
-- Stockage des pieces jointes (idempotent)
-- -----------------------------------------------------------------------------
do $storage$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('documents', 'documents', false, 10485760)
  on conflict (id) do update set file_size_limit = 10485760;

  -- Chaque agence ne voit que son propre dossier de premier niveau.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents lecture agence'
  ) then
    execute $p$
      create policy "documents lecture agence" on storage.objects
        for select using (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.agence_courante()::text
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents ecriture agence'
  ) then
    execute $p$
      create policy "documents ecriture agence" on storage.objects
        for insert with check (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.agence_courante()::text
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents maj agence'
  ) then
    execute $p$
      create policy "documents maj agence" on storage.objects
        for update using (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.agence_courante()::text
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents suppression agence'
  ) then
    execute $p$
      create policy "documents suppression agence" on storage.objects
        for delete using (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.agence_courante()::text
        )
    $p$;
  end if;

exception
  when insufficient_privilege then
    raise notice 'Bucket non configure (droits insuffisants) : creez "documents" depuis Storage, puis ses politiques. Le reste de la migration est applique.';
end
$storage$;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
do $verif$
declare
  v_bucket boolean;
begin
  select exists (select 1 from storage.buckets where id = 'documents') into v_bucket;

  if not v_bucket then
    raise notice 'ATTENTION : le bucket "documents" est absent, le televersement des pieces echouera.';
  else
    raise notice 'Inscription guidee prete : colonne aeroport_prefere et bucket "documents" en place.';
  end if;
end
$verif$;
