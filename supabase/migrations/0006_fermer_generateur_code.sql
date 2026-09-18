-- =============================================================================
--  Migration 0006 : fermer le generateur de codes
--
--  code_invitation() est un utilitaire interne, appele par creer_invitation().
--  La migration 0005 la revoquait de PUBLIC, ce qui ne suffit pas : Supabase
--  accorde separement l'execution aux roles `anon` et `authenticated`, et ces
--  droits-la survivent a un revoke sur PUBLIC. Il faut les nommer.
--
--  Portee reelle du defaut : faible. La fonction ne lit ni n'ecrit aucune
--  donnee, elle ne fait que tirer huit caracteres au hasard. Un appelant
--  n'apprenait rien et ne pouvait rien creer — un code n'existe que si
--  creer_invitation() l'enregistre, ce qui reste reserve au proprietaire.
--  On la ferme par hygiene : une fonction interne n'a rien a faire dans
--  l'API publique.
-- =============================================================================

revoke all on function code_invitation() from anon;
revoke all on function code_invitation() from authenticated;

-- creer_invitation() est SECURITY DEFINER : elle s'execute sous l'identite du
-- proprietaire de la fonction, qui conserve son droit. La generation de codes
-- continue donc de fonctionner.

do $verif$
begin
  if has_function_privilege('anon', 'public.code_invitation()', 'execute') then
    raise exception 'code_invitation reste executable par anon';
  end if;
  if has_function_privilege('authenticated', 'public.code_invitation()', 'execute') then
    raise exception 'code_invitation reste executable par authenticated';
  end if;
  raise notice 'Generateur de codes ferme : code_invitation n''est plus appelable directement.';
end
$verif$;
