import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

const ICONS: Record<string, string> = {
  index: "🏠",
  training: "🏋️",
  stats: "📊",
  coach: "🤖",
  profile: "👤",
};

const LABELS: Record<string, string> = {
  index: "Accueil",
  training: "Entraînement",
  stats: "Statistiques",
  coach: "Coach IA",
  profile: "Profil",
};

export default function TabsLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabel: LABELS[route.name] ?? route.name,
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{ICONS[route.name] ?? "•"}</Text>,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="training" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
