-- =============================================================================
--  Migration 0002 : fermer l'acces public a la numerotation
--
--  prochain_numero() est SECURITY DEFINER : elle ecrit dans `compteurs` en
--  contournant la RLS, car les declencheurs doivent pouvoir numeroter une
--  ligne que l'utilisateur vient tout juste de creer.
--
--  Or PostgREST expose par defaut toute fonction du schema `public`. Elle
--  etait donc appelable directement par n'importe quel visiteur : il suffisait
--  de connaitre l'identifiant d'une agence pour faire avancer ses compteurs et
--  creer des trous dans la numerotation des recus.
--
--  Correctif : les declencheurs passent en SECURITY DEFINER (ils appellent donc
--  prochain_numero sous l'identite du proprietaire), ce qui permet de retirer
--  le droit d'execution a tout le monde sur la fonction elle-meme.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Declencheurs de numerotation
--
-- Le garde `agence_id is null` evite une erreur technique confuse : sans lui,
-- une insertion sans agence echouait sur une contrainte de `compteurs` avant
-- meme que la RLS n'ait eu l'occasion de la refuser proprement.
-- -----------------------------------------------------------------------------
create or replace function set_matricule_pelerin()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.agence_id is null then
    return new;   -- laisse la RLS refuser la ligne
  end if;

  if new.matricule is null or new.matricule = '' then
    new.matricule := 'PEL-' || extract(year from current_date) || '-' ||
                     lpad(prochain_numero(new.agence_id, 'pelerin')::text, 4, '0');
  end if;

  return new;
end;
$fn$;

create or replace function set_reference_dossier()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.agence_id is null then
    return new;
  end if;

  if new.reference is null or new.reference = '' then
    new.reference := 'DOS-' || extract(year from current_date) || '-' ||
                     lpad(prochain_numero(new.agence_id, 'dossier')::text, 4, '0');
  end if;

  return new;
end;
$fn$;

create or replace function set_numero_recu()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.agence_id is null then
    return new;
  end if;

  if new.numero_recu is null or new.numero_recu = '' then
    new.numero_recu := 'REC-' || extract(year from current_date) || '-' ||
                       lpad(prochain_numero(new.agence_id, 'recu')::text, 5, '0');
  end if;

  return new;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- Fermeture de l'acces direct
-- -----------------------------------------------------------------------------
revoke all on function prochain_numero(uuid, text) from public;
revoke all on function prochain_numero(uuid, text) from anon;
revoke all on function prochain_numero(uuid, text) from authenticated;

-- Les declencheurs s'executent desormais sous l'identite du proprietaire, qui
-- conserve son droit d'execution : la numerotation continue de fonctionner.

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
do $verif$
begin
  if has_function_privilege('anon', 'public.prochain_numero(uuid, text)', 'execute') then
    raise exception 'prochain_numero reste executable par anon';
  end if;
  if has_function_privilege('authenticated', 'public.prochain_numero(uuid, text)', 'execute') then
    raise exception 'prochain_numero reste executable par authenticated';
  end if;
  raise notice 'Numerotation fermee : prochain_numero n''est plus appelable directement.';
end
$verif$;
