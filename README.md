# MaMaAgence — SaaS de gestion de pèlerinage (Hajj / Omra) · Niger

Logiciel de gestion pour les agences de voyage agréées Hajj et Omra au Niger.
Chaque agence dispose d'un espace isolé : ses pèlerins, ses dossiers, ses pièces
justificatives et ses encaissements en francs CFA.

## Ce que couvre cette version

| Domaine | Contenu |
| --- | --- |
| Pèlerins | État civil, NIN, passeport, contact d'urgence, mahram, antécédents médicaux |
| Dossiers | Référence auto, forfait figé à l'inscription, remise, statut du parcours jusqu'au retour |
| Pièces | Check-list des pièces obligatoires créée à l'ouverture du dossier, validation et dates d'expiration |
| Paiements | Échéancier, encaissement multi-moyens, reçu numéroté et imprimable, montant en toutes lettres |
| Groupes | Manifeste de départ, vol, encadrant, état de préparation du groupe |
| Catalogue | Saisons (avec quota de la tutelle) et forfaits |
| Accès | Quatre rôles : propriétaire, gestionnaire, comptable, agent |

Spécificités nigériennes intégrées : devise XOF sans décimale, régions du pays,
numéros au format `+227 XX XX XX XX`, encaissement **Airtel Money** et **Moov
Money** avec référence de transaction obligatoire, et alerte automatique sur les
passeports ne couvrant pas les **6 mois de validité** exigés pour le visa saoudien.

## Stack

- **Next.js 16** (App Router, Server Actions) · React 19 · TypeScript
- **Supabase** : Postgres, Auth, Storage
- **Tailwind CSS 4**
- **Zod** pour la validation des formulaires côté serveur

## Installation

### 1. Créer le projet Supabase

Sur [supabase.com](https://supabase.com), créez un projet (région `eu-west-3`
ou `eu-central-1` pour une latence correcte depuis le Niger).

### 2. Appliquer le schéma

Dans le dashboard Supabase → **SQL Editor**, collez et exécutez le contenu de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

Ce script crée les tables, les déclencheurs de numérotation, la vue financière,
le bucket de stockage et **toutes les politiques RLS**.

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(dashboard → Project Settings → API).

### 4. Lancer

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000/inscription> pour créer votre agence et le compte
propriétaire.

> Si la confirmation d'e-mail est activée dans Supabase (Authentication →
> Providers → Email), le compte est créé mais l'agence ne l'est qu'à la première
> connexion, via la page `/bienvenue`. Pour des tests rapides, désactivez
> « Confirm email ».

## Isolation des données

Le cloisonnement ne repose pas sur le code applicatif mais sur Postgres :

```sql
create policy pelerins_tenant on pelerins for all
  using (agence_id = agence_courante())
  with check (agence_id = agence_courante());
```

`agence_courante()` lit l'agence du profil rattaché à `auth.uid()`. Une requête
mal filtrée côté application ne peut donc pas faire fuiter les données d'une
autre agence. Les pièces jointes suivent la même règle : le premier segment du
chemin dans le bucket `documents` doit être l'identifiant de l'agence.

## Règles métier notables

- **Le prix ne vient jamais du formulaire.** À la création d'un dossier, il est
  relu depuis le forfait côté serveur, puis figé — une hausse de tarif ne
  modifie pas les dossiers déjà ouverts.
- **Un encaissement ne peut pas dépasser le solde** restant dû ; le serveur
  recalcule le solde avant d'écrire.
- **Les paiements mobile money, virements et chèques exigent une référence** de
  transaction, pour que chaque ligne du journal soit rapprochable.
- **Le statut passe de « pré-inscrit » à « confirmé »** automatiquement dès que
  le cumul des versements atteint l'acompte du forfait (déclencheur Postgres).
- Les numéros (`PEL-2026-0001`, `DOS-2026-0001`, `REC-2026-00001`) sont
  attribués par une séquence **par agence et par année**.

## Limites connues de cette version

- **Un pèlerin ne peut avoir qu'un dossier par saison**, y compris si le premier
  a été annulé. Pour réinscrire quelqu'un après annulation, il faut aujourd'hui
  rouvrir le dossier existant plutôt qu'en créer un second.
- **L'envoi des pièces jointes n'est pas branché** : le bucket, les politiques et
  la colonne `chemin_fichier` existent, mais l'interface ne fait que suivre le
  statut des pièces (manquante, fournie, validée). Le téléversement est la
  première brique à ajouter.
- **L'invitation de collaborateurs passe par la console Supabase.** Créez
  l'utilisateur dans Authentication → Users, puis insérez sa ligne dans `profils`
  avec l'`agence_id` correspondant.
- **Pas encore de facturation de l'abonnement SaaS** ni de rôle de supervision
  nationale (tutelle) : le produit s'arrête à la frontière de l'agence.
- Aucun envoi de SMS ou WhatsApp pour les relances d'échéance.

## Structure

```
src/
  app/
    (espace)/              espace de travail authentifié (barre latérale)
      tableau-de-bord/     indicateurs, alertes passeport, prochains départs
      pelerins/            liste, fiche, création, modification
      dossiers/            liste, création, fiche (pièces, échéancier, paiements)
      paiements/           journal des encaissements
      groupes/             manifestes de départ
      catalogue/           saisons et forfaits
      parametres/          agence et équipe
    connexion/ inscription/ bienvenue/   parcours d'accès
    recus/[id]/            reçu imprimable
  components/              bibliothèque d'interface et panneaux métier
  lib/
    actions/               Server Actions, validation Zod
    supabase/              clients navigateur et serveur
    niger.ts               régions, moyens de paiement, statuts, pièces
    format.ts              FCFA, dates, téléphone, montant en lettres
    session.ts             session agence et contrôle de rôle
  proxy.ts                 garde d'authentification sur toutes les routes
supabase/migrations/       schéma SQL et politiques RLS
```

## Scripts

```bash
npm run dev     # développement
npm run build   # build de production
npm start       # serveur de production
```
