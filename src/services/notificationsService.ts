import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { APP_NAME } from "@/constants/brand";
import { useProfileStore } from "@/store/profileStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Le joueur a-t-il laissé les notifications activées ?
 *
 * Les rappels programmés sont annulés quand il désactive l'interrupteur, mais
 * les notifications ponctuelles — badge débloqué, objectif atteint — partaient
 * quand même : elles ne sont pas programmées à l'avance, donc rien ne les
 * annulait. Un joueur qui avait tout coupé en recevait encore.
 *
 * Lu depuis le store plutôt que passé en paramètre : sinon chaque appelant
 * doit y penser, et il suffit d'en oublier un pour recréer le trou.
 */
function notificationsAllowed(): boolean {
  return useProfileStore.getState().profile?.notifications_enabled !== false;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: APP_NAME,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return finalStatus === "granted";
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

const DAILY_REMINDER_ID = "daily-training-reminder";

export async function scheduleDailyTrainingReminder(hour = 18, minute = 0) {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "C'est l'heure de progresser 🏐",
      body: `Ta séance du jour t'attend dans ${APP_NAME}.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function scheduleStreakReminder(streakCount: number) {
  if (streakCount <= 0 || !notificationsAllowed()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 Série de ${streakCount} jours !`,
      body: "Ne casse pas ta série, entraîne-toi aujourd'hui.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 60 * 20 }, // rappel dans ~20h si pas d'entraînement entre-temps
  });
}

export async function notifyGoalProgress(goalName: string, percent: number) {
  if (!notificationsAllowed()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Progression d'objectif 🎯",
      body: `${goalName}: ${percent}% atteint !`,
    },
    trigger: null,
  });
}

export async function notifyAchievementUnlocked(name: string, icon: string) {
  if (!notificationsAllowed()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${icon} Nouveau badge débloqué !`,
      body: name,
    },
    trigger: null,
  });
}
