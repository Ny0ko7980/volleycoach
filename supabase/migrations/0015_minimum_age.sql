-- Coach Volley — âge minimum porté à 15 ans (RGPD art. 8)
--
-- Le schéma initial acceptait un âge dès 5 ans. En France, le seuil fixé en
-- application de l'article 8 du RGPD est de 15 ans : en dessous, le traitement
-- des données d'un mineur n'est licite qu'avec le consentement conjoint du
-- titulaire de l'autorité parentale — un mécanisme que l'application ne met pas
-- en œuvre. Tant qu'il n'existe pas, l'inscription est réservée aux 15 ans et
-- plus, et les documents légaux le disent.
--
-- Rien n'est supprimé ici. Si des profils existants déclarent un âge inférieur,
-- la migration s'interrompt AVANT toute modification et dit combien : c'est une
-- décision humaine (recontacter la personne, recueillir un consentement
-- parental, supprimer le compte), pas quelque chose à trancher en silence dans
-- une migration.

do $$
declare
  v_count int;
begin
  select count(*) into v_count
    from public.player_profiles
   where age is not null and age < 15;

  if v_count > 0 then
    raise exception
      'Migration interrompue : % profil(s) déclarent un âge inférieur à 15 ans. Aucune donnée n''a été modifiée. Traite ces comptes (consentement parental ou suppression) avant de rejouer cette migration.',
      v_count;
  end if;
end $$;

alter table public.player_profiles drop constraint if exists player_profiles_age_check;
alter table public.player_profiles add constraint player_profiles_age_check
  check (age is null or age between 15 and 100);

comment on column public.player_profiles.age is
  'Âge déclaré par le joueur. Minimum 15 ans (RGPD art. 8, seuil français) tant qu''aucun recueil de consentement parental n''existe.';
