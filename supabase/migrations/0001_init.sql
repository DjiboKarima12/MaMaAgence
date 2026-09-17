-- =============================================================================
--  MaMaAgence — Gestion de pelerinage (Hajj / Omra) — Niger
--  Migration 0001 : schema initial, multi-tenant par agence, RLS stricte
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type user_role       as enum ('proprietaire', 'gestionnaire', 'agent', 'comptable');
create type sexe            as enum ('M', 'F');
create type type_pelerinage as enum ('hajj', 'omra');

create type statut_dossier as enum (
  'brouillon',        -- saisie en cours
  'preinscrit',       -- pelerin enregistre, acompte non verse
  'confirme',         -- acompte verse, place reservee
  'visa_depose',      -- dossier transmis pour visa
  'visa_obtenu',
  'parti',
  'revenu',
  'annule'
);

create type type_document as enum (
  'passeport', 'photo_identite', 'carnet_vaccination', 'acte_naissance',
  'certificat_medical', 'visa', 'billet_avion', 'autorisation_mahram', 'autre'
);

create type statut_document as enum ('manquant', 'fourni', 'valide', 'refuse', 'expire');

-- Moyens de paiement courants au Niger
create type moyen_paiement as enum (
  'especes', 'airtel_money', 'moov_money', 'virement_bancaire', 'cheque', 'autre'
);

create type statut_paiement as enum ('en_attente', 'confirme', 'annule');

-- -----------------------------------------------------------------------------
-- Agences (tenants)
-- -----------------------------------------------------------------------------
create table agences (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  slug              text not null unique,
  numero_agrement   text,                       -- agrement Hajj/Omra (COHO)
  nif               text,                       -- numero d'identification fiscale
  telephone         text,
  email             text,
  adresse           text,
  ville             text default 'Niamey',
  region            text default 'Niamey',
  logo_url          text,
  devise            text not null default 'XOF',
  actif             boolean not null default true,
  cree_le           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Utilisateurs (profil lie a auth.users)
-- -----------------------------------------------------------------------------
create table profils (
  id            uuid primary key references auth.users (id) on delete cascade,
  agence_id     uuid not null references agences (id) on delete cascade,
  nom_complet   text not null,
  telephone     text,
  role          user_role not null default 'agent',
  actif         boolean not null default true,
  cree_le       timestamptz not null default now()
);
create index on profils (agence_id);

-- Agence de l'utilisateur courant. SECURITY DEFINER pour eviter la recursion RLS.
create or replace function agence_courante()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select agence_id from profils where id = auth.uid() and actif
$fn$;

create or replace function role_courant()
returns user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select role from profils where id = auth.uid() and actif
$fn$;

-- -----------------------------------------------------------------------------
-- Saisons (Hajj 1447, Omra Ramadan 2026, ...)
-- -----------------------------------------------------------------------------
create table saisons (
  id           uuid primary key default gen_random_uuid(),
  agence_id    uuid not null references agences (id) on delete cascade,
  libelle      text not null,
  type         type_pelerinage not null,
  annee_hijri  int,
  annee_greg   int not null,
  quota        int,                 -- places attribuees par la tutelle
  ouverte      boolean not null default true,
  cree_le      timestamptz not null default now()
);
create index on saisons (agence_id);

-- -----------------------------------------------------------------------------
-- Forfaits
-- -----------------------------------------------------------------------------
create table forfaits (
  id             uuid primary key default gen_random_uuid(),
  agence_id      uuid not null references agences (id) on delete cascade,
  saison_id      uuid not null references saisons (id) on delete cascade,
  nom            text not null,
  type           type_pelerinage not null,
  prix_xof       bigint not null check (prix_xof >= 0),
  acompte_xof    bigint not null default 0 check (acompte_xof >= 0),
  duree_jours    int,
  hotel_makkah   text,
  hotel_madinah  text,
  distance_haram text,               -- ex: "300 m du Haram"
  inclusions     text[] not null default '{}',
  actif          boolean not null default true,
  cree_le        timestamptz not null default now()
);
create index on forfaits (agence_id, saison_id);

-- -----------------------------------------------------------------------------
-- Groupes de depart
-- -----------------------------------------------------------------------------
create table groupes (
  id                  uuid primary key default gen_random_uuid(),
  agence_id           uuid not null references agences (id) on delete cascade,
  saison_id           uuid not null references saisons (id) on delete cascade,
  nom                 text not null,
  date_depart         date,
  date_retour         date,
  compagnie_aerienne  text,
  numero_vol          text,
  aeroport_depart     text default 'NIM',   -- Diori Hamani, Niamey
  capacite            int,
  encadrant_nom       text,
  encadrant_telephone text,
  cree_le             timestamptz not null default now()
);
create index on groupes (agence_id, saison_id);

-- -----------------------------------------------------------------------------
-- Pelerins
-- -----------------------------------------------------------------------------
create table pelerins (
  id                     uuid primary key default gen_random_uuid(),
  agence_id              uuid not null references agences (id) on delete cascade,
  matricule              text not null,
  nom                    text not null,
  prenom                 text not null,
  sexe                   sexe not null,
  date_naissance         date,
  lieu_naissance         text,
  nationalite            text not null default 'Nigerienne',
  nin                    text,                -- numero d'identification nationale
  telephone              text,
  telephone_secondaire   text,
  email                  text,
  region                 text,
  ville                  text,
  adresse                text,
  profession             text,
  passeport_numero       text,
  passeport_delivre_le   date,
  passeport_expire_le    date,
  passeport_lieu         text,
  contact_urgence_nom    text,
  contact_urgence_tel    text,
  contact_urgence_lien   text,
  mahram_pelerin_id      uuid references pelerins (id) on delete set null,
  mahram_lien            text,                -- epoux, fils, frere, pere...
  deja_effectue_hajj     boolean not null default false,
  groupe_sanguin         text,
  antecedents_medicaux   text,
  photo_url              text,
  notes                  text,
  cree_par               uuid references profils (id) on delete set null,
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now(),
  unique (agence_id, matricule)
);
create index on pelerins (agence_id);
create index on pelerins (agence_id, nom, prenom);
create unique index pelerins_passeport_unique
  on pelerins (agence_id, passeport_numero)
  where passeport_numero is not null;

-- -----------------------------------------------------------------------------
-- Dossiers d'inscription
-- -----------------------------------------------------------------------------
create table dossiers (
  id               uuid primary key default gen_random_uuid(),
  agence_id        uuid not null references agences (id) on delete cascade,
  reference        text not null,
  pelerin_id       uuid not null references pelerins (id) on delete cascade,
  saison_id        uuid not null references saisons (id) on delete restrict,
  forfait_id       uuid not null references forfaits (id) on delete restrict,
  groupe_id        uuid references groupes (id) on delete set null,
  statut           statut_dossier not null default 'preinscrit',
  prix_xof         bigint not null check (prix_xof >= 0),   -- fige a l'inscription
  remise_xof       bigint not null default 0 check (remise_xof >= 0),
  type_chambre     text,                                    -- quadruple, triple, double
  numero_chambre   text,
  inscrit_le       date not null default current_date,
  annule_le        timestamptz,
  motif_annulation text,
  notes            text,
  cree_par         uuid references profils (id) on delete set null,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  unique (agence_id, reference),
  unique (pelerin_id, saison_id)   -- un pelerin, un dossier par saison
);
create index on dossiers (agence_id, statut);
create index on dossiers (agence_id, groupe_id);

-- -----------------------------------------------------------------------------
-- Pieces du dossier
-- -----------------------------------------------------------------------------
create table documents (
  id             uuid primary key default gen_random_uuid(),
  agence_id      uuid not null references agences (id) on delete cascade,
  dossier_id     uuid not null references dossiers (id) on delete cascade,
  type           type_document not null,
  statut         statut_document not null default 'manquant',
  chemin_fichier text,               -- storage: documents/{agence_id}/{dossier_id}/...
  expire_le      date,
  verifie_le     timestamptz,
  verifie_par    uuid references profils (id) on delete set null,
  note           text,
  cree_le        timestamptz not null default now(),
  unique (dossier_id, type)
);
create index on documents (agence_id, statut);

-- -----------------------------------------------------------------------------
-- Echeancier
-- -----------------------------------------------------------------------------
create table echeances (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid not null references agences (id) on delete cascade,
  dossier_id  uuid not null references dossiers (id) on delete cascade,
  libelle     text not null,
  montant_xof bigint not null check (montant_xof > 0),
  echue_le    date not null,
  rang        int not null default 1,
  cree_le     timestamptz not null default now()
);
create index on echeances (agence_id, echue_le);

-- -----------------------------------------------------------------------------
-- Versements
-- -----------------------------------------------------------------------------
create table paiements (
  id                  uuid primary key default gen_random_uuid(),
  agence_id           uuid not null references agences (id) on delete cascade,
  dossier_id          uuid not null references dossiers (id) on delete cascade,
  numero_recu         text not null,
  montant_xof         bigint not null check (montant_xof > 0),
  moyen               moyen_paiement not null,
  statut              statut_paiement not null default 'confirme',
  paye_le             date not null default current_date,
  reference_operateur text,          -- ID transaction Airtel/Moov, n° cheque...
  encaisse_par        uuid references profils (id) on delete set null,
  note                text,
  cree_le             timestamptz not null default now(),
  unique (agence_id, numero_recu)
);
create index on paiements (agence_id, paye_le);
create index on paiements (dossier_id);

-- -----------------------------------------------------------------------------
-- Journal d'audit
-- -----------------------------------------------------------------------------
create table journal_audit (
  id         bigserial primary key,
  agence_id  uuid not null references agences (id) on delete cascade,
  acteur_id  uuid references profils (id) on delete set null,
  action     text not null,
  entite     text not null,
  entite_id  uuid,
  donnees    jsonb,
  cree_le    timestamptz not null default now()
);
create index on journal_audit (agence_id, cree_le desc);

-- =============================================================================
--  Numerotation automatique (matricule, reference dossier, numero de recu)
-- =============================================================================
create table compteurs (
  agence_id uuid not null references agences (id) on delete cascade,
  cle       text not null,           -- 'pelerin' | 'dossier' | 'recu'
  annee     int  not null,
  valeur    int  not null default 0,
  primary key (agence_id, cle, annee)
);

create or replace function prochain_numero(p_agence uuid, p_cle text)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_annee int := extract(year from current_date);
  v_val   int;
begin
  insert into compteurs (agence_id, cle, annee, valeur)
  values (p_agence, p_cle, v_annee, 1)
  on conflict (agence_id, cle, annee)
    do update set valeur = compteurs.valeur + 1
  returning valeur into v_val;
  return v_val;
end;
$fn$;

create or replace function set_matricule_pelerin()
returns trigger language plpgsql as $fn$
begin
  if new.matricule is null or new.matricule = '' then
    new.matricule := 'PEL-' || extract(year from current_date) || '-' ||
                     lpad(prochain_numero(new.agence_id, 'pelerin')::text, 4, '0');
  end if;
  return new;
end;
$fn$;
create trigger trg_matricule before insert on pelerins
  for each row execute function set_matricule_pelerin();

create or replace function set_reference_dossier()
returns trigger language plpgsql as $fn$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'DOS-' || extract(year from current_date) || '-' ||
                     lpad(prochain_numero(new.agence_id, 'dossier')::text, 4, '0');
  end if;
  return new;
end;
$fn$;
create trigger trg_reference before insert on dossiers
  for each row execute function set_reference_dossier();

create or replace function set_numero_recu()
returns trigger language plpgsql as $fn$
begin
  if new.numero_recu is null or new.numero_recu = '' then
    new.numero_recu := 'REC-' || extract(year from current_date) || '-' ||
                       lpad(prochain_numero(new.agence_id, 'recu')::text, 5, '0');
  end if;
  return new;
end;
$fn$;
create trigger trg_recu before insert on paiements
  for each row execute function set_numero_recu();

create or replace function touch_maj_le()
returns trigger language plpgsql as $fn$
begin new.maj_le := now(); return new; end;
$fn$;
create trigger trg_touch_pelerin before update on pelerins
  for each row execute function touch_maj_le();
create trigger trg_touch_dossier before update on dossiers
  for each row execute function touch_maj_le();

-- Ouverture d'un dossier : check-list des pieces obligatoires + echeance d'acompte.
-- Place en base plutot que dans l'application pour qu'un dossier cree par import
-- ou par script parte lui aussi avec son dossier de pieces.
create or replace function initialiser_dossier()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_acompte bigint;
begin
  insert into documents (agence_id, dossier_id, type, statut)
  select new.agence_id, new.id, piece, 'manquant'
  from unnest(array[
    'passeport', 'photo_identite', 'carnet_vaccination', 'acte_naissance'
  ]::type_document[]) as piece
  on conflict (dossier_id, type) do nothing;

  select acompte_xof into v_acompte from forfaits where id = new.forfait_id;

  if coalesce(v_acompte, 0) > 0 then
    insert into echeances (agence_id, dossier_id, libelle, montant_xof, echue_le, rang)
    values (new.agence_id, new.id, 'Acompte', v_acompte, current_date + 15, 1);
  end if;

  return null;
end;
$fn$;
create trigger trg_init_dossier after insert on dossiers
  for each row execute function initialiser_dossier();

-- Passage automatique preinscrit -> confirme des que l'acompte est atteint
create or replace function maj_statut_apres_paiement()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_dossier dossiers;
  v_forfait forfaits;
  v_regle   bigint;
begin
  select * into v_dossier from dossiers
    where id = coalesce(new.dossier_id, old.dossier_id);
  if v_dossier.id is null then return null; end if;

  select * into v_forfait from forfaits where id = v_dossier.forfait_id;

  select coalesce(sum(montant_xof), 0) into v_regle
    from paiements
    where dossier_id = v_dossier.id and statut = 'confirme';

  if v_dossier.statut = 'preinscrit'
     and v_regle >= greatest(v_forfait.acompte_xof, 1) then
    update dossiers set statut = 'confirme' where id = v_dossier.id;
  end if;

  return null;
end;
$fn$;
create trigger trg_statut_paiement
  after insert or update or delete on paiements
  for each row execute function maj_statut_apres_paiement();

-- =============================================================================
--  Vue de synthese financiere par dossier
-- =============================================================================
create or replace view v_dossiers_finance
with (security_invoker = true) as
select
  d.id                                             as dossier_id,
  d.agence_id,
  d.reference,
  d.statut,
  d.saison_id,
  d.groupe_id,
  d.inscrit_le,
  p.id                                             as pelerin_id,
  p.matricule,
  p.nom,
  p.prenom,
  p.sexe,
  p.telephone,
  p.passeport_numero,
  p.passeport_expire_le,
  f.nom                                            as forfait_nom,
  f.type                                           as type_pelerinage,
  f.acompte_xof,
  (d.prix_xof - d.remise_xof)                      as net_xof,
  coalesce(pay.total, 0)                           as regle_xof,
  (d.prix_xof - d.remise_xof) - coalesce(pay.total, 0) as solde_xof,
  ech.prochaine_echeance,
  coalesce(doc.pieces_valides, 0)                  as pieces_valides,
  coalesce(doc.pieces_total, 0)                    as pieces_total
from dossiers d
join pelerins p on p.id = d.pelerin_id
join forfaits f on f.id = d.forfait_id
left join lateral (
  select sum(montant_xof) as total
  from paiements
  where dossier_id = d.id and statut = 'confirme'
) pay on true
left join lateral (
  select min(echue_le) as prochaine_echeance
  from echeances
  where dossier_id = d.id
) ech on true
left join lateral (
  select count(*) filter (where statut = 'valide') as pieces_valides,
         count(*)                                  as pieces_total
  from documents
  where dossier_id = d.id
) doc on true;

-- =============================================================================
--  RLS — cloisonnement strict par agence
-- =============================================================================
alter table agences       enable row level security;
alter table profils       enable row level security;
alter table saisons       enable row level security;
alter table forfaits      enable row level security;
alter table groupes       enable row level security;
alter table pelerins      enable row level security;
alter table dossiers      enable row level security;
alter table documents     enable row level security;
alter table echeances     enable row level security;
alter table paiements     enable row level security;
alter table journal_audit enable row level security;
alter table compteurs     enable row level security;

-- Agences : lecture de la sienne, modification reservee au proprietaire
create policy agence_lecture on agences
  for select using (id = agence_courante());
create policy agence_maj on agences
  for update using (id = agence_courante() and role_courant() = 'proprietaire');

-- Profils : chacun voit les collegues de son agence ; seul le proprietaire gere
create policy profil_lecture on profils
  for select using (agence_id = agence_courante());
create policy profil_insertion on profils
  for insert with check (agence_id = agence_courante() and role_courant() = 'proprietaire');
create policy profil_maj on profils
  for update using (
    agence_id = agence_courante()
    and (role_courant() = 'proprietaire' or id = auth.uid())
  );

-- Tables metier : acces plein a l'agence de l'utilisateur
do $seed$
declare t text;
begin
  foreach t in array array[
    'saisons','forfaits','groupes','pelerins','dossiers',
    'documents','echeances','paiements'
  ] loop
    execute format(
      'create policy %1$s_tenant on %1$s for all
         using (agence_id = agence_courante())
         with check (agence_id = agence_courante())', t);
  end loop;
end
$seed$;

-- Journal : lecture + insertion par l'agence
create policy audit_lecture on journal_audit
  for select using (agence_id = agence_courante());
create policy audit_insertion on journal_audit
  for insert with check (agence_id = agence_courante());

-- Compteurs : jamais manipules directement par le client
create policy compteurs_lecture on compteurs
  for select using (agence_id = agence_courante());

-- =============================================================================
--  Inscription : creation de l'agence + profil proprietaire
--  Appelee juste apres le signup Supabase, sous l'identite du nouvel utilisateur.
-- =============================================================================
create or replace function creer_agence(
  p_nom_agence text,
  p_nom_complet text,
  p_telephone text default null,
  p_ville text default 'Niamey'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_agence uuid;
  v_slug   text;
  v_suffix int := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Cet utilisateur appartient deja a une agence';
  end if;

  v_slug := regexp_replace(lower(unaccent(p_nom_agence)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'agence'; end if;

  while exists (
    select 1 from agences
    where slug = v_slug || case when v_suffix = 0 then '' else '-' || v_suffix end
  ) loop
    v_suffix := v_suffix + 1;
  end loop;
  if v_suffix > 0 then v_slug := v_slug || '-' || v_suffix; end if;

  insert into agences (nom, slug, ville, telephone)
  values (p_nom_agence, v_slug, p_ville, p_telephone)
  returning id into v_agence;

  insert into profils (id, agence_id, nom_complet, telephone, role)
  values (auth.uid(), v_agence, p_nom_complet, p_telephone, 'proprietaire');

  return v_agence;
end;
$fn$;

revoke all on function creer_agence(text, text, text, text) from public;
grant execute on function creer_agence(text, text, text, text) to authenticated;

-- =============================================================================
--  Stockage des pieces jointes
--
--  Le bucket et ses politiques sont crees dans un bloc tolerant : selon le
--  projet, le role du SQL Editor n'a pas toujours le droit de modifier
--  storage.objects. Un echec ici ne doit pas faire perdre tout le schema
--  metier ; les regles restent alors a poser depuis Storage > Policies.
-- =============================================================================
do $storage$
begin
  insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

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
    raise notice 'Stockage non configure (droits insuffisants) : creez le bucket "documents" et ses politiques depuis Storage > Policies. Le reste du schema est installe.';
end
$storage$;
