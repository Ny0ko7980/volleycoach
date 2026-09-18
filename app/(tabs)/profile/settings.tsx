import { useState } from "react";
import { Switch, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { updateMyProfile } from "@/services/profileService";
import {
  requestNotificationPermissions,
  scheduleDailyTrainingReminder,
  cancelAllNotifications,
} from "@/services/notificationsService";
import { spacing } from "@/constants/theme";

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const { profile, updateLocal } = useProfileStore();
  const [busy, setBusy] = useState(false);

  async function handleToggleNotifications(value: boolean) {
    setBusy(true);
    try {
      if (value) {
        const granted = await requestNotificationPermissions();
        if (granted) await scheduleDailyTrainingReminder(18, 0);
      } else {
        await cancelAllNotifications();
      }
      updateLocal({ notifications_enabled: value });
      await updateMyProfile({ notifications_enabled: value });
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>Réglages</Text>

      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Notifications</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Rappels d'entraînement, objectifs, séries</Text>
          </View>
          <Switch
            value={profile.notifications_enabled}
            onValueChange={handleToggleNotifications}
            disabled={busy}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Mode sombre</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Suit automatiquement les réglages de ton téléphone</Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Compte</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Version gratuite</Text>
          </View>
          <Badge label={profile.is_premium ? "Premium" : "Gratuit"} tone={profile.is_premium ? "success" : "neutral"} />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
});
