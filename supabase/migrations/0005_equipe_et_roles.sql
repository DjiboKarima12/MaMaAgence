-- =============================================================================
--  Migration 0005 : ouverture de l'agence a plusieurs, et pouvoirs des roles
--
--  Deux manques empechaient un usage reel a plusieurs :
--
--  1. Inviter un collegue supposait de passer par la console Supabase. On
--     introduit des codes d'invitation : le proprietaire en genere un, le
--     collegue cree son compte et le saisit. Pas d'envoi d'e-mail, ce qui evite
--     de dependre d'une distribution de courrier peu fiable — le code se
--     transmet de vive voix, par SMS ou par WhatsApp.
--
--  2. Les roles existaient mais ne changeaient rien : tout membre de l'agence
--     pouvait tout faire, y compris supprimer. Les politiques sont refaites
--     par role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Invitations
-- -----------------------------------------------------------------------------
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid not null references agences (id) on delete cascade,
  code        text not null unique,
  role        user_role not null default 'agent',
  nom_prevu   text,
  cree_par    uuid references profils (id) on delete set null,
  expire_le   timestamptz not null default now() + interval '14 days',
  utilise_le  timestamptz,
  utilise_par uuid references profils (id) on delete set null,
  cree_le     timestamptz not null default now()
);
create index on invitations (agence_id, cree_le desc);

alter table invitations enable row level security;

-- Seul le proprietaire manipule les invitations de son agence.
create policy invitations_lecture on invitations
  for select using (agence_id = agence_courante() and role_courant() = 'proprietaire');
create policy invitations_suppression on invitations
  for delete using (agence_id = agence_courante() and role_courant() = 'proprietaire');

/**
 * Code court, lisible a voix haute : pas de 0/O ni de 1/I/L, qui se confondent
 * au telephone. Format XXXX-XXXX.
 */
create or replace function code_invitation()
returns text
language plpgsql
as $fn$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text := '';
  i int;
begin
  for i in 1 .. 8 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    if i = 4 then v_code := v_code || '-'; end if;
  end loop;
  return v_code;
end;
$fn$;

create or replace function creer_invitation(
  p_role user_role,
  p_nom_prevu text default null,
  p_jours int default 14
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_agence uuid := agence_courante();
  v_code   text;
  v_essais int := 0;
begin
  if v_agence is null then
    raise exception 'Authentification requise';
  end if;
  if role_courant() <> 'proprietaire' then
    raise exception 'Seul le proprietaire peut inviter un collaborateur';
  end if;
  if p_jours < 1 or p_jours > 90 then
    raise exception 'Duree de validite hors limites (1 a 90 jours)';
  end if;

  loop
    v_code := code_invitation();
    exit when not exists (select 1 from invitations where code = v_code);
    v_essais := v_essais + 1;
    if v_essais > 20 then
      raise exception 'Impossible de generer un code, reessayez';
    end if;
  end loop;

  insert into invitations (agence_id, code, role, nom_prevu, cree_par, expire_le)
  values (v_agence, v_code, p_role, p_nom_prevu, auth.uid(),
          now() + make_interval(days => p_jours));

  return v_code;
end;
$fn$;

/**
 * Rattache l'utilisateur connecte a une agence via un code.
 *
 * SECURITY DEFINER car l'appelant n'a encore aucun profil : il ne peut donc
 * pas lire la table `invitations`, protegee par RLS.
 */
create or replace function rejoindre_agence(
  p_code text,
  p_nom_complet text,
  p_telephone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_invitation invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte appartient deja a une agence';
  end if;

  select * into v_invitation
    from invitations
    where code = upper(trim(p_code));

  if v_invitation.id is null then
    raise exception 'Code inconnu';
  end if;
  if v_invitation.utilise_le is not null then
    raise exception 'Ce code a deja ete utilise';
  end if;
  if v_invitation.expire_le < now() then
    raise exception 'Ce code a expire, demandez-en un nouveau';
  end if;

  insert into profils (id, agence_id, nom_complet, telephone, role)
  values (auth.uid(), v_invitation.agence_id,
          coalesce(nullif(trim(p_nom_complet), ''), v_invitation.nom_prevu, 'Collaborateur'),
          p_telephone, v_invitation.role);

  update invitations
    set utilise_le = now(), utilise_par = auth.uid()
    where id = v_invitation.id;

  return v_invitation.agence_id;
end;
$fn$;

revoke all on function creer_invitation(user_role, text, int) from public;
grant execute on function creer_invitation(user_role, text, int) to authenticated;
revoke all on function rejoindre_agence(text, text, text) from public;
grant execute on function rejoindre_agence(text, text, text) to authenticated;
revoke all on function code_invitation() from public;

-- =============================================================================
--  Pouvoirs des roles
--
--  agent        : saisit les pelerins et les dossiers, ne supprime rien
--  comptable    : encaisse, consulte le reste
--  gestionnaire : tout le metier, y compris catalogue et suppressions
--  proprietaire : en plus, l'agence et l'equipe
-- =============================================================================
create or replace function a_role(p_roles user_role[])
returns boolean
language sql
stable
as $fn$
  select role_courant() = any(p_roles)
$fn$;

-- On remplace les politiques uniformes posees par la migration 0001.
do $remplacement$
declare t text;
begin
  foreach t in array array[
    'saisons','forfaits','groupes','pelerins','dossiers',
    'documents','echeances','paiements'
  ] loop
    execute format('drop policy if exists %1$s_tenant on %1$s', t);
  end loop;
end
$remplacement$;

-- Lecture : tout membre actif de l'agence voit l'ensemble du dossier metier.
do $lecture$
declare t text;
begin
  foreach t in array array[
    'saisons','forfaits','groupes','pelerins','dossiers',
    'documents','echeances','paiements','chambres'
  ] loop
    execute format(
      'create policy %1$s_lecture on %1$s for select
         using (agence_id = agence_courante())', t);
  end loop;
end
$lecture$;

-- Saisie courante : agents, gestionnaires et proprietaires.
do $saisie$
declare t text;
begin
  foreach t in array array['pelerins','dossiers','documents','echeances'] loop
    execute format(
      'create policy %1$s_saisie on %1$s for insert
         with check (agence_id = agence_courante()
                     and a_role(array[''agent'',''gestionnaire'',''proprietaire'']::user_role[]))', t);
    execute format(
      'create policy %1$s_maj on %1$s for update
         using (agence_id = agence_courante()
                and a_role(array[''agent'',''gestionnaire'',''proprietaire'']::user_role[]))', t);
    execute format(
      'create policy %1$s_suppression on %1$s for delete
         using (agence_id = agence_courante()
                and a_role(array[''gestionnaire'',''proprietaire'']::user_role[]))', t);
  end loop;
end
$saisie$;

-- Catalogue et logistique : reserves aux gestionnaires et proprietaires.
do $catalogue$
declare t text;
begin
  foreach t in array array['saisons','forfaits','groupes','chambres'] loop
    execute format(
      'create policy %1$s_gestion on %1$s for all
         using (agence_id = agence_courante()
                and a_role(array[''gestionnaire'',''proprietaire'']::user_role[]))
         with check (agence_id = agence_courante()
                and a_role(array[''gestionnaire'',''proprietaire'']::user_role[]))', t);
  end loop;
end
$catalogue$;

-- Encaissements : comptables, gestionnaires et proprietaires.
-- Pas de suppression : un versement s'annule, il ne s'efface pas.
create policy paiements_saisie on paiements
  for insert with check (
    agence_id = agence_courante()
    and a_role(array['comptable','gestionnaire','proprietaire']::user_role[])
  );
create policy paiements_maj on paiements
  for update using (
    agence_id = agence_courante()
    and a_role(array['comptable','gestionnaire','proprietaire']::user_role[])
  );

-- La chambre d'un pelerin se change depuis l'ecran d'hebergement : c'est une
-- mise a jour de `dossiers`, deja couverte par dossiers_maj.

do $verif$
begin
  raise notice 'Equipe et roles en place : codes d''invitation et politiques par role.';
end
$verif$;
