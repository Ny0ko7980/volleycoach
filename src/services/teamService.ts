import { supabase } from "@/lib/supabase";
import type { PlayerProfile, Team, TeamMember } from "@/types/database";

export async function fetchMyCoachingTeam(): Promise<Team | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase.from("teams").select("*").eq("coach_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return data as Team | null;
}

export async function fetchMyTeamMembership(): Promise<TeamMember | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("player_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as TeamMember | null;
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (error) throw error;
  return data as Team | null;
}

export async function fetchTeamRoster(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*, player:player_profiles(*)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function createTeamAsCoach(name: string): Promise<Team> {
  const { data, error } = await supabase.rpc("create_team_as_coach", { p_name: name, p_club_id: null });
  if (error) throw error;
  return data as Team;
}

export async function joinTeamByCode(code: string): Promise<Team> {
  const { data, error } = await supabase.rpc("join_team_by_code", { p_code: code });
  if (error) throw error;
  return data as Team;
}

export async function leaveTeam(): Promise<void> {
  const { error } = await supabase.rpc("leave_team");
  if (error) throw error;
}

export async function removeMemberFromTeam(teamId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("player_id", playerId);
  if (error) throw error;
}

export interface RosterEntryWithActivity {
  member: TeamMember;
  profile: PlayerProfile;
}

export function splitRosterByRole(roster: TeamMember[]): { coaches: TeamMember[]; players: TeamMember[] } {
  return {
    coaches: roster.filter((m) => m.role === "coach"),
    players: roster.filter((m) => m.role === "player"),
  };
}
