-- =============================================================================
--  Migration 0007 : le proprietaire cree directement le compte du collaborateur
--
--  Jusqu'ici, la personne invitee devait creer son compte elle-meme. Desormais
--  le proprietaire saisit son nom, son e-mail et son telephone ; le compte est
--  cree dans la foulee et le code sert de mot de passe d'entree. La personne
--  n'a plus qu'a saisir son e-mail et son code.
--
--  L'invitation garde la trace de ce qui a ete declare : elle devient la fiche
--  d'arrivee du collaborateur, et non plus un simple jeton.
-- =============================================================================

alter table invitations
  add column if not exists email text,
  add column if not exists telephone_prevu text;

comment on column invitations.email is
  'Adresse declaree par le proprietaire ; sert d''identifiant de connexion.';

-- Un meme e-mail ne doit pas etre invite deux fois tant que le code est actif.
create unique index if not exists invitations_email_actif
  on invitations (agence_id, lower(email))
  where email is not null and utilise_le is null;

-- -----------------------------------------------------------------------------
-- Creation d'invitation, avec les coordonnees du collaborateur
--
-- L'ancienne signature est remplacee : conserver les deux exposerait une
-- surcharge ambigue a PostgREST.
-- -----------------------------------------------------------------------------
drop function if exists creer_invitation(user_role, text, int);

create or replace function creer_invitation(
  p_role user_role,
  p_nom_prevu text default null,
  p_jours int default 30,
  p_email text default null,
  p_telephone text default null
)
returns invitations
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_agence uuid := agence_courante();
  v_code   text;
  v_essais int := 0;
  v_ligne  invitations;
begin
  if v_agence is null then
    raise exception 'Authentification requise';
  end if;
  if role_courant() <> 'proprietaire' then
    raise exception 'Seul le proprietaire peut inviter un collaborateur';
  end if;
  if p_jours < 1 or p_jours > 365 then
    raise exception 'Duree de validite hors limites (1 a 365 jours)';
  end if;

  loop
    v_code := code_invitation();
    exit when not exists (select 1 from invitations where code = v_code);
    v_essais := v_essais + 1;
    if v_essais > 20 then
      raise exception 'Impossible de generer un code, reessayez';
    end if;
  end loop;

  insert into invitations (
    agence_id, code, role, nom_prevu, email, telephone_prevu, cree_par, expire_le
  )
  values (
    v_agence, v_code, p_role, p_nom_prevu, nullif(lower(trim(p_email)), ''),
    nullif(trim(p_telephone), ''), auth.uid(), now() + make_interval(days => p_jours)
  )
  returning * into v_ligne;

  return v_ligne;
end;
$fn$;

revoke all on function creer_invitation(user_role, text, int, text, text) from public;
revoke all on function creer_invitation(user_role, text, int, text, text) from anon;
grant execute on function creer_invitation(user_role, text, int, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Marquage de l'invitation une fois le compte cree
--
-- Appelee par le serveur apres creation du compte. SECURITY DEFINER pour
-- pouvoir ecrire `utilise_par`, qui reference un profil tout juste insere.
-- -----------------------------------------------------------------------------
create or replace function marquer_invitation_utilisee(
  p_invitation uuid,
  p_utilisateur uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if role_courant() <> 'proprietaire' then
    raise exception 'Seul le proprietaire peut finaliser une invitation';
  end if;

  update invitations
    set utilise_le = now(), utilise_par = p_utilisateur
    where id = p_invitation
      and agence_id = agence_courante();
end;
$fn$;

revoke all on function marquer_invitation_utilisee(uuid, uuid) from public;
revoke all on function marquer_invitation_utilisee(uuid, uuid) from anon;
grant execute on function marquer_invitation_utilisee(uuid, uuid) to authenticated;

do $verif$
begin
  raise notice 'Invitations enrichies : e-mail et telephone du collaborateur, compte cree par le proprietaire.';
end
$verif$;
