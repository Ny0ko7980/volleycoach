import { useCallback, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createTeamAsCoach,
  fetchMyCoachingTeam,
  fetchMyTeamMembership,
  fetchTeamById,
  fetchTeamRoster,
  joinTeamByCode,
  leaveTeam,
  removeMemberFromTeam,
  splitRosterByRole,
} from "@/services/teamService";
import { positionLabel, levelLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Team, TeamMember } from "@/types/database";

type ViewState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "coach"; team: Team; roster: TeamMember[] }
  | { kind: "player"; team: Team };

export default function TeamScreen() {
  const { theme } = useAppTheme();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const coachingTeam = await fetchMyCoachingTeam();
      if (coachingTeam) {
        const roster = await fetchTeamRoster(coachingTeam.id);
        setState({ kind: "coach", team: coachingTeam, roster });
        return;
      }

      const membership = await fetchMyTeamMembership();
      if (membership) {
        const team = await fetchTeamById(membership.team_id);
        if (team) {
          setState({ kind: "player", team });
          return;
        }
      }

      setState({ kind: "none" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
      setState({ kind: "none" });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (state.kind === "loading") return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScreenContainer onRefresh={load} refreshing={false}>
      <Text style={[styles.title, { color: theme.text }]}>Équipe</Text>

      {state.kind === "coach" ? (
        <CoachView team={state.team} roster={state.roster} onChanged={load} />
      ) : state.kind === "player" ? (
        <PlayerView team={state.team} onLeft={load} />
      ) : (
        <NoTeamView onChanged={load} />
      )}
    </ScreenContainer>
  );
}

function CoachView({ team, roster, onChanged }: { team: Team; roster: TeamMember[]; onChanged: () => void }) {
  const { theme } = useAppTheme();
  const { players } = splitRosterByRole(roster);

  async function handleShareCode() {
    await Share.share({
      message: `Rejoins mon équipe "${team.name}" sur Coach Volley avec le code: ${team.invite_code}`,
    });
  }

  async function handleRemove(playerId: string, username: string) {
    Alert.alert("Retirer ce joueur ?", `${username} sera retiré de l'équipe "${team.name}".`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          await removeMemberFromTeam(team.id, playerId);
          onChanged();
        },
      },
    ]);
  }

  return (
    <>
      <Card>
        <Text style={{ color: theme.text, fontWeight: "800", fontSize: 18 }}>{team.name}</Text>
        <Text style={{ color: theme.textMuted, marginTop: spacing.xs }}>Tu es le coach de cette équipe.</Text>
        <View style={styles.codeRow}>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Code d'invitation</Text>
          <Text style={[styles.code, { color: theme.primary }]}>{team.invite_code}</Text>
        </View>
        <Button label="Partager le code" variant="outline" onPress={handleShareCode} />
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Joueurs ({players.length})</Text>
      {players.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textMuted }}>
            Aucun joueur pour le moment. Partage le code d'invitation pour qu'ils te rejoignent.
          </Text>
        </Card>
      ) : (
        players.map((m) => {
          const p = m.player!;
          return (
            <Card key={m.player_id}>
              <View style={styles.rosterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{p.username}</Text>
                  <View style={styles.badgeRow}>
                    <Badge label={positionLabel(p.position)} tone="primary" />
                    <Badge label={levelLabel(p.level)} />
                    <Badge label={`${p.streak_count} j`} tone={p.streak_count > 0 ? "success" : "neutral"} />
                  </View>
                </View>
                <Text onPress={() => handleRemove(p.id, p.username)} style={{ color: theme.danger, fontSize: 12 }}>
                  Retirer
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </>
  );
}

function PlayerView({ team, onLeft }: { team: Team; onLeft: () => void }) {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);

  async function handleLeave() {
    Alert.alert("Quitter l'équipe ?", `Tu ne feras plus partie de "${team.name}".`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Quitter",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await leaveTeam();
            onLeft();
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <Card>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 18 }}>{team.name}</Text>
      <Text style={{ color: theme.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
        Ton coach peut consulter tes statistiques, ta progression et tes objectifs pour t'accompagner.
      </Text>
      <Button label="Quitter l'équipe" variant="ghost" onPress={handleLeave} loading={loading} />
    </Card>
  );
}

function NoTeamView({ onChanged }: { onChanged: () => void }) {
  const { theme } = useAppTheme();
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!teamName.trim()) {
      setError("Le nom de l'équipe est obligatoire.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      await createTeamAsCoach(teamName.trim());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer l'équipe.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) {
      setError("Renseigne le code d'invitation.");
      return;
    }
    setError(null);
    setJoining(true);
    try {
      await joinTeamByCode(code.trim());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <Card>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.sm }}>Rejoindre une équipe</Text>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Ton coach t'a donné un code d'invitation ? Entre-le ici.
        </Text>
        <TextField value={code} onChangeText={setCode} placeholder="Ex: A1B2C3" autoCapitalize="characters" />
        <Button label="Rejoindre" onPress={handleJoin} loading={joining} />
      </Card>

      <Card>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.sm }}>Créer une équipe</Text>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Tu es entraîneur ? Crée ton équipe pour suivre tes joueurs.
        </Text>
        <TextField value={teamName} onChangeText={setTeamName} placeholder="Nom de l'équipe" />
        <Button label="Créer l'équipe" variant="outline" onPress={handleCreate} loading={creating} />
      </Card>

      {error ? <Text style={{ color: theme.danger, marginTop: spacing.sm }}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: spacing.md, marginBottom: spacing.sm },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: spacing.md },
  code: { fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  rosterRow: { flexDirection: "row", alignItems: "center" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
});
