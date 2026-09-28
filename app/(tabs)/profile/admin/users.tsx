import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { setPlayerRoleAsAdmin } from "@/services/adminService";
import { useAllPlayers } from "@/hooks/queries";
import { positionLabel, levelLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { PlayerProfile, PlayerRole } from "@/types/database";
import { errorMessage } from "@/utils/errors";

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: "player", label: "Joueur" },
  { value: "coach", label: "Coach" },
  { value: "admin", label: "Admin" },
];

export default function AdminUsersScreen() {
  const { theme } = useAppTheme();
  const { session } = useAuthStore();
  const { profile } = useProfileStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { data, isPending, isError, error, refetch, isFetching } = useAllPlayers();
  const players = data ?? [];
  const load = refetch;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  function handleChangeRole(player: PlayerProfile, role: PlayerRole) {
    if (role === player.role) return;
    if (player.id === session?.user.id && role !== "admin") {
      Alert.alert("Action bloquée", "Tu ne peux pas retirer ton propre accès administrateur depuis cet écran.");
      return;
    }
    Alert.alert(
      `Changer le rôle de ${player.username} ?`,
      `Nouveau rôle: ${ROLES.find((r) => r.value === role)?.label}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            setUpdatingId(player.id);
            try {
              await setPlayerRoleAsAdmin(player.id, role);
              // On relit la liste plutôt que de la rapiécer localement : le
              // cache est partagé, et une retouche à la main laisserait les
              // autres écrans sur l'ancienne valeur.
              await refetch();
            } catch (e) {
              Alert.alert("Erreur", errorMessage(e, "Impossible de changer le rôle."));
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  }

  if (profile?.role !== "admin") return <ErrorView message="Accès réservé aux administrateurs." />;
  if (isPending) return <LoadingView />;
  if (isError) {
    return <ErrorView message={errorMessage(error, "Erreur de chargement.")} onRetry={() => void load()} />;
  }

  return (
    <ScreenContainer onRefresh={() => void load()} refreshing={isFetching}>
      <Text style={[styles.title, { color: theme.text }]}>Utilisateurs ({players.length})</Text>

      {players.map((p) => (
        <Card key={p.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{p.username}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
                {positionLabel(p.position)} · {levelLabel(p.level)} · {p.xp} XP
              </Text>
            </View>
            <Badge
              label={ROLES.find((r) => r.value === p.role)?.label ?? p.role}
              tone={p.role === "admin" ? "danger" : p.role === "coach" ? "primary" : "neutral"}
            />
          </View>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={p.role === r.value}
                onPress={() => handleChangeRole(p, r.value)}
              />
            ))}
          </View>
          {updatingId === p.id ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>Mise à jour...</Text> : null}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", flexWrap: "wrap" },
});
