import { useState } from "react";
import { Alert, Switch, Text, View, StyleSheet } from "react-native";
import { Trash2 } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { useAuthStore } from "@/store/authStore";
import { updateMyProfile, deleteMyAccount } from "@/services/profileService";
import {
  requestNotificationPermissions,
  scheduleDailyTrainingReminder,
  cancelAllNotifications,
} from "@/services/notificationsService";
import { errorMessage } from "@/utils/errors";
import { spacing } from "@/constants/theme";

// Mot à recopier pour armer la suppression. Un simple bouton « confirmer »
// s'appuie trop facilement par erreur pour une action irréversible.
const CONFIRMATION_WORD = "SUPPRIMER";

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const { profile, updateLocal } = useProfileStore();
  const { signOut } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [deletionArmed, setDeletionArmed] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  // Deuxième confirmation : le mot recopié arme le bouton, l'alerte système
  // demande le dernier accord avant l'appel réellement destructeur.
  function askFinalConfirmation() {
    Alert.alert(
      "Supprimer définitivement ton compte ?",
      "Ton profil, tes séances, tes statistiques, tes objectifs, tes badges et tes conversations avec le Coach IA seront effacés. Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => void performDeletion() },
      ]
    );
  }

  async function performDeletion() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      // Le compte n'existe plus : la session locale doit partir avec lui, ce
      // qui renvoie automatiquement vers l'écran de connexion.
      await signOut();
    } catch (e) {
      setDeleting(false);
      Alert.alert("Suppression impossible", errorMessage(e, "Ton compte n'a pas pu être supprimé. Réessaie plus tard."));
    }
  }

  if (!profile) return null;

  const canDelete = confirmation.trim().toUpperCase() === CONFIRMATION_WORD;

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
            <Text style={{ color: theme.text, fontWeight: "700" }}>Apparence</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Thème sombre, conçu pour le gymnase</Text>
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

      <Card style={{ borderColor: theme.danger }}>
        <Text style={{ color: theme.text, fontWeight: "700" }}>Supprimer mon compte</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
          Efface définitivement ton profil, tes séances, tes statistiques, tes objectifs, tes badges et tes
          conversations avec le Coach IA. Cette action est irréversible et ne peut pas être annulée.
        </Text>

        {deletionArmed ? (
          <View style={{ marginTop: spacing.md }}>
            <TextField
              label={`Recopie « ${CONFIRMATION_WORD} » pour confirmer`}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRMATION_WORD}
              editable={!deleting}
            />
            <Button
              label="Supprimer définitivement"
              variant="danger"
              icon={<Trash2 size={16} color="#FFFFFF" />}
              disabled={!canDelete}
              loading={deleting}
              onPress={askFinalConfirmation}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Annuler"
              variant="ghost"
              disabled={deleting}
              onPress={() => {
                setDeletionArmed(false);
                setConfirmation("");
              }}
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Supprimer mon compte"
              variant="outline"
              icon={<Trash2 size={16} color={theme.danger} />}
              onPress={() => setDeletionArmed(true)}
            />
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
});
