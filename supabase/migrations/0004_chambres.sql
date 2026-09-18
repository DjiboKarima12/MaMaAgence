-- =============================================================================
--  Migration 0004 : plan d'hebergement
--
--  Jusqu'ici l'hebergement tenait dans `dossiers.numero_chambre`, un simple
--  texte. Impossible d'en tirer une liste de rooming : on ne savait pas quelles
--  chambres existaient, combien de lits restaient libres, ni a quel hotel.
--
--  Un pelerin occupe deux chambres pendant le voyage : une a Makkah, une a
--  Madinah. D'ou une reference par ville sur le dossier plutot qu'une table
--  d'affectation : la contrainte « une seule chambre par ville » devient
--  structurelle au lieu d'etre a verifier.
-- =============================================================================

create type ville_sejour as enum ('makkah', 'madinah');

-- Une chambre accueille un seul sexe, sauf chambre familiale ou un mahram
-- loge avec les siens.
create type occupation_chambre as enum ('hommes', 'femmes', 'famille');

create table chambres (
  id         uuid primary key default gen_random_uuid(),
  agence_id  uuid not null references agences (id) on delete cascade,
  groupe_id  uuid not null references groupes (id) on delete cascade,
  ville      ville_sejour not null,
  hotel      text,
  etage      text,
  numero     text not null,
  capacite   int not null check (capacite between 1 and 8),
  occupation occupation_chambre not null default 'hommes',
  notes      text,
  cree_le    timestamptz not null default now(),
  unique (groupe_id, ville, numero)
);
create index on chambres (agence_id, groupe_id, ville);

alter table dossiers
  add column if not exists chambre_makkah_id uuid references chambres (id) on delete set null,
  add column if not exists chambre_madinah_id uuid references chambres (id) on delete set null;

create index on dossiers (chambre_makkah_id);
create index on dossiers (chambre_madinah_id);

-- -----------------------------------------------------------------------------
-- Garde-fous
--
-- Places disponibles et mixite sont verifies en base : une affectation passee
-- par un import ou un script ne doit pas pouvoir surcharger une chambre, ni y
-- loger quelqu'un du mauvais sexe.
-- -----------------------------------------------------------------------------
create or replace function verifier_affectation_chambre()
returns trigger
language plpgsql
as $fn$
declare
  v_chambre  chambres;
  v_sexe     sexe;
  v_occupees int;
  v_colonne  text;
begin
  select p.sexe into v_sexe from pelerins p where p.id = new.pelerin_id;

  foreach v_colonne in array array['makkah', 'madinah'] loop
    declare
      v_id uuid;
    begin
      v_id := case v_colonne
                when 'makkah' then new.chambre_makkah_id
                else new.chambre_madinah_id
              end;

      if v_id is null then continue; end if;

      select * into v_chambre from chambres where id = v_id;
      if v_chambre.id is null then
        raise exception 'Chambre introuvable';
      end if;

      if v_chambre.ville::text <> v_colonne then
        raise exception 'La chambre % est a %, pas a %',
          v_chambre.numero, v_chambre.ville, v_colonne;
      end if;

      if v_chambre.occupation = 'hommes' and v_sexe = 'F' then
        raise exception 'La chambre % est reservee aux hommes', v_chambre.numero;
      end if;
      if v_chambre.occupation = 'femmes' and v_sexe = 'M' then
        raise exception 'La chambre % est reservee aux femmes', v_chambre.numero;
      end if;

      select count(*) into v_occupees
        from dossiers d
        where d.statut <> 'annule'
          and d.id <> new.id
          and (case v_colonne
                 when 'makkah' then d.chambre_makkah_id
                 else d.chambre_madinah_id
               end) = v_id;

      if v_occupees >= v_chambre.capacite then
        raise exception 'La chambre % est complete (% lits)',
          v_chambre.numero, v_chambre.capacite;
      end if;
    end;
  end loop;

  return new;
end;
$fn$;

create trigger trg_affectation_chambre
  before insert or update of chambre_makkah_id, chambre_madinah_id, pelerin_id
  on dossiers
  for each row execute function verifier_affectation_chambre();

-- -----------------------------------------------------------------------------
-- Vue de remplissage, pour afficher la grille sans recompter cote application
-- -----------------------------------------------------------------------------
create or replace view v_chambres_occupation
with (security_invoker = true) as
select
  c.*,
  coalesce(o.occupants, 0)            as occupants,
  c.capacite - coalesce(o.occupants, 0) as lits_libres
from chambres c
left join lateral (
  select count(*) as occupants
  from dossiers d
  where d.statut <> 'annule'
    and (
      (c.ville = 'makkah'  and d.chambre_makkah_id  = c.id) or
      (c.ville = 'madinah' and d.chambre_madinah_id = c.id)
    )
) o on true;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table chambres enable row level security;

create policy chambres_tenant on chambres
  for all
  using (agence_id = agence_courante())
  with check (agence_id = agence_courante());

-- -----------------------------------------------------------------------------
-- Creation de chambres en serie
--
-- Une agence qui loge 300 pelerins ne saisit pas 75 chambres une par une.
-- -----------------------------------------------------------------------------
create or replace function creer_chambres_en_serie(
  p_groupe uuid,
  p_ville ville_sejour,
  p_hotel text,
  p_etage text,
  p_numero_depart int,
  p_nombre int,
  p_capacite int,
  p_occupation occupation_chambre
)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_agence uuid := agence_courante();
  v_creees int := 0;
  i int;
begin
  if v_agence is null then
    raise exception 'Authentification requise';
  end if;

  if not exists (select 1 from groupes where id = p_groupe and agence_id = v_agence) then
    raise exception 'Groupe introuvable';
  end if;

  if p_nombre < 1 or p_nombre > 200 then
    raise exception 'Nombre de chambres hors limites (1 a 200)';
  end if;

  for i in 0 .. p_nombre - 1 loop
    begin
      insert into chambres (agence_id, groupe_id, ville, hotel, etage, numero, capacite, occupation)
      values (v_agence, p_groupe, p_ville, p_hotel, p_etage,
              (p_numero_depart + i)::text, p_capacite, p_occupation);
      v_creees := v_creees + 1;
    exception
      when unique_violation then
        -- Le numero existe deja pour ce groupe et cette ville : on passe.
        null;
    end;
  end loop;

  return v_creees;
end;
$fn$;

revoke all on function creer_chambres_en_serie(uuid, ville_sejour, text, text, int, int, int, occupation_chambre) from public;
grant execute on function creer_chambres_en_serie(uuid, ville_sejour, text, text, int, int, int, occupation_chambre) to authenticated;

do $verif$
begin
  raise notice 'Plan d''hebergement pret : table chambres, vue v_chambres_occupation, garde-fous de capacite et de mixite.';
end
$verif$;
