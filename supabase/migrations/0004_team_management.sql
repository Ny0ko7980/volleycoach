-- Coach Volley — gestion d'équipe (v1 simplifiée, section 15 du cahier des charges)
--
-- Problème résolu: les policies RLS de team_members (0002) empêchent un
-- coach de s'ajouter lui-même à l'équipe qu'il vient de créer (chicken-and-egg:
-- is_team_coach_of() exige une ligne team_members déjà existante). On résout
-- ça avec deux fonctions SECURITY DEFINER qui encapsulent la création
-- d'équipe et l'adhésion par code d'invitation, sans élargir les policies
-- RLS de base (un joueur ne peut toujours pas insérer arbitrairement dans
-- team_members).

alter table public.teams
  add column if not exists invite_code text unique;

create or replace function public.generate_invite_code()
returns text as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$ language sql volatile;

update public.teams set invite_code = public.generate_invite_code() where invite_code is null;
alter table public.teams alter column invite_code set default public.generate_invite_code();

-- Un joueur devient coach d'une nouvelle équipe: crée la ligne teams (coach_id
-- = lui-même) puis s'ajoute à team_members avec role='coach', en une seule
-- transaction atomique.
create or replace function public.create_team_as_coach(p_name text, p_club_id uuid default null)
returns public.teams as $$
declare
  v_team public.teams;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Le nom de l''équipe est obligatoire.';
  end if;

  insert into public.teams (name, club_id, coach_id)
  values (trim(p_name), p_club_id, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, player_id, role)
  values (v_team.id, auth.uid(), 'coach');

  update public.player_profiles set team_id = v_team.id where id = auth.uid();

  return v_team;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.create_team_as_coach(text, uuid) to authenticated;

-- Un joueur rejoint une équipe existante via le code d'invitation partagé
-- par son coach (hors-ligne: à l'oral, par SMS, etc. — pas de notion
-- d'invitation par email dans cette v1 simplifiée).
create or replace function public.join_team_by_code(p_code text)
returns public.teams as $$
declare
  v_team public.teams;
begin
  select * into v_team from public.teams where invite_code = upper(trim(p_code));
  if v_team.id is null then
    raise exception 'Code d''invitation invalide.';
  end if;

  insert into public.team_members (team_id, player_id, role)
  values (v_team.id, auth.uid(), 'player')
  on conflict (team_id, player_id) do nothing;

  update public.player_profiles set team_id = v_team.id where id = auth.uid();

  return v_team;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.join_team_by_code(text) to authenticated;

-- Un joueur peut toujours quitter une équipe de son propre chef.
create policy "team_members_leave_self" on public.team_members
  for delete to authenticated
  using (player_id = auth.uid());

create or replace function public.leave_team()
returns void as $$
begin
  delete from public.team_members where player_id = auth.uid();
  update public.player_profiles set team_id = null where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.leave_team() to authenticated;
