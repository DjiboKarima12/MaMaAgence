-- =============================================================================
--  Jeu de donnees de demonstration
--
--  A executer APRES avoir cree votre agence via /inscription.
--  Le script cible l'agence la plus recemment creee et lui ajoute une saison,
--  trois forfaits, deux groupes de depart et quelques pelerins.
--
--  A lancer depuis le SQL Editor de Supabase (il contourne la RLS).
-- =============================================================================

do $seed$
declare
  v_agence   uuid;
  v_saison   uuid;
  v_eco      uuid;
  v_confort  uuid;
  v_groupe1  uuid;
  v_dossier  uuid;
  v_pelerin  uuid;
  v_mahram   uuid;
begin
  select id into v_agence from agences order by cree_le desc limit 1;
  if v_agence is null then
    raise exception 'Aucune agence : creez d''abord votre espace via /inscription';
  end if;

  ---------------------------------------------------------------------------
  -- Saison
  ---------------------------------------------------------------------------
  insert into saisons (agence_id, libelle, type, annee_hijri, annee_greg, quota)
  values (v_agence, 'Hajj 1448 / 2027', 'hajj', 1448, 2027, 120)
  returning id into v_saison;

  ---------------------------------------------------------------------------
  -- Forfaits
  ---------------------------------------------------------------------------
  insert into forfaits (
    agence_id, saison_id, nom, type, prix_xof, acompte_xof, duree_jours,
    hotel_makkah, hotel_madinah, distance_haram, inclusions
  ) values (
    v_agence, v_saison, 'Hajj economique — chambre quintuple', 'hajj',
    3200000, 800000, 35,
    'Al Kiswah Towers', 'Dar Al Eiman Royal', '1,2 km du Haram',
    array['Billet aller-retour Niamey-Djeddah', 'Visa', 'Hebergement', 'Restauration', 'Transport interne']
  ) returning id into v_eco;

  insert into forfaits (
    agence_id, saison_id, nom, type, prix_xof, acompte_xof, duree_jours,
    hotel_makkah, hotel_madinah, distance_haram, inclusions
  ) values (
    v_agence, v_saison, 'Hajj confort — chambre quadruple', 'hajj',
    4100000, 1000000, 32,
    'Swissotel Al Maqam', 'Anwar Al Madinah Movenpick', '300 m du Haram',
    array['Billet aller-retour Niamey-Djeddah', 'Visa', 'Hebergement', 'Restauration complete',
          'Transport interne', 'Encadrement religieux', 'Guide francophone']
  ) returning id into v_confort;

  insert into forfaits (
    agence_id, saison_id, nom, type, prix_xof, acompte_xof, duree_jours,
    hotel_makkah, hotel_madinah, distance_haram, inclusions
  ) values (
    v_agence, v_saison, 'Hajj VIP — chambre double', 'hajj',
    6500000, 2000000, 30,
    'Fairmont Makkah Clock Royal Tower', 'The Oberoi Madina', 'Face au Haram',
    array['Billet aller-retour en classe affaires', 'Visa', 'Hebergement 5 etoiles',
          'Pension complete', 'Transport prive', 'Encadrement religieux']
  );

  ---------------------------------------------------------------------------
  -- Groupes de depart
  ---------------------------------------------------------------------------
  insert into groupes (
    agence_id, saison_id, nom, date_depart, date_retour,
    compagnie_aerienne, numero_vol, capacite, encadrant_nom, encadrant_telephone
  ) values (
    v_agence, v_saison, 'Vol 1 — Niamey', current_date + 120, current_date + 152,
    'Saudia', 'SV 1742', 90, 'Cheikh Abdoul Razak Idrissa', '+227 96 12 34 56'
  ) returning id into v_groupe1;

  insert into groupes (
    agence_id, saison_id, nom, date_depart, date_retour,
    compagnie_aerienne, numero_vol, capacite, encadrant_nom, encadrant_telephone
  ) values (
    v_agence, v_saison, 'Vol 2 — Niamey', current_date + 127, current_date + 157,
    'Turkish Airlines', 'TK 0562', 60, 'Malam Souley Garba', '+227 90 87 65 43'
  );

  ---------------------------------------------------------------------------
  -- Pelerins : un couple (le mari sert de mahram) et deux autres
  ---------------------------------------------------------------------------
  insert into pelerins (
    agence_id, nom, prenom, sexe, date_naissance, lieu_naissance, nin,
    telephone, region, ville, profession,
    passeport_numero, passeport_delivre_le, passeport_expire_le, passeport_lieu,
    contact_urgence_nom, contact_urgence_tel, contact_urgence_lien
  ) values (
    v_agence, 'Abdoulaye', 'Issoufou', 'M', '1968-04-12', 'Dosso', '1968041200123',
    '+227 96 45 12 78', 'Dosso', 'Dosso', 'Commercant',
    'N0184392', current_date - 800, current_date + 900, 'Niamey',
    'Hadiza Abdoulaye', '+227 90 11 22 33', 'Fille'
  ) returning id into v_mahram;

  insert into pelerins (
    agence_id, nom, prenom, sexe, date_naissance, lieu_naissance,
    telephone, region, ville, profession,
    passeport_numero, passeport_delivre_le, passeport_expire_le, passeport_lieu,
    mahram_pelerin_id, mahram_lien,
    contact_urgence_nom, contact_urgence_tel, contact_urgence_lien
  ) values (
    v_agence, 'Abdoulaye', 'Fatouma', 'F', '1974-09-03', 'Dosso',
    '+227 96 45 12 79', 'Dosso', 'Dosso', 'Menagere',
    'N0184393', current_date - 800, current_date + 900, 'Niamey',
    v_mahram, 'Epoux',
    'Hadiza Abdoulaye', '+227 90 11 22 33', 'Fille'
  );

  -- Passeport bientot insuffisant : declenche l'alerte visa sur le tableau de bord
  insert into pelerins (
    agence_id, nom, prenom, sexe, date_naissance, lieu_naissance,
    telephone, region, ville, profession,
    passeport_numero, passeport_delivre_le, passeport_expire_le, passeport_lieu,
    deja_effectue_hajj
  ) values (
    v_agence, 'Maiga', 'Amadou', 'M', '1959-01-20', 'Tillaberi',
    '+227 94 22 88 10', 'Tillaberi', 'Tillaberi', 'Retraite',
    'N0165001', current_date - 1700, current_date + 100, 'Niamey',
    true
  ) returning id into v_pelerin;

  insert into pelerins (
    agence_id, nom, prenom, sexe, date_naissance, lieu_naissance,
    telephone, region, ville, profession,
    passeport_numero, passeport_delivre_le, passeport_expire_le, passeport_lieu
  ) values (
    v_agence, 'Hassane', 'Zeinabou', 'F', '1981-06-17', 'Zinder',
    '+227 92 30 45 67', 'Zinder', 'Zinder', 'Enseignante',
    'N0191204', current_date - 300, current_date + 1500, 'Zinder'
  );

  ---------------------------------------------------------------------------
  -- Un dossier confirme, avec acompte verse
  ---------------------------------------------------------------------------
  insert into dossiers (
    agence_id, pelerin_id, saison_id, forfait_id, groupe_id,
    prix_xof, type_chambre
  )
  select v_agence, v_mahram, v_saison, v_confort, v_groupe1, prix_xof, 'Quadruple'
  from forfaits where id = v_confort
  returning id into v_dossier;

  insert into paiements (
    agence_id, dossier_id, montant_xof, moyen, paye_le, reference_operateur, note
  ) values (
    v_agence, v_dossier, 1000000, 'airtel_money', current_date - 5,
    'AM250913.1432.C84102', 'Acompte a l''inscription'
  );

  -- Un dossier au stade pre-inscrit, sans versement
  insert into dossiers (agence_id, pelerin_id, saison_id, forfait_id, prix_xof, type_chambre)
  select v_agence, v_pelerin, v_saison, v_eco, prix_xof, 'Quintuple'
  from forfaits where id = v_eco;

  raise notice 'Donnees de demonstration ajoutees a l''agence %', v_agence;
end
$seed$;
