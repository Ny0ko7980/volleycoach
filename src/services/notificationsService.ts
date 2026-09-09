import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Coach Volley",
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
      body: "Ta séance du jour t'attend dans Coach Volley.",
    },
    trigger: { hour, minute, repeats: true },
  });
}

export async function scheduleStreakReminder(streakCount: number) {
  if (streakCount <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 Série de ${streakCount} jours !`,
      body: "Ne casse pas ta série, entraîne-toi aujourd'hui.",
    },
    trigger: { seconds: 60 * 60 * 20 }, // rappel dans ~20h si pas d'entraînement entre-temps
  });
}

export async function notifyGoalProgress(goalName: string, percent: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Progression d'objectif 🎯",
      body: `${goalName}: ${percent}% atteint !`,
    },
    trigger: null,
  });
}

export async function notifyAchievementUnlocked(name: string, icon: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${icon} Nouveau badge débloqué !`,
      body: name,
    },
    trigger: null,
  });
}
