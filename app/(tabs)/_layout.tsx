import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Home, Dumbbell, ChartNoAxesColumn, Bot, User } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

const ICONS: Record<string, typeof Home> = {
  index: Home,
  training: Dumbbell,
  stats: ChartNoAxesColumn,
  coach: Bot,
  profile: User,
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
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarLabel: LABELS[route.name] ?? route.name,
        tabBarIcon: ({ color, size }) => {
          const Icon = ICONS[route.name];
          return Icon ? <Icon color={color} size={size ?? 22} /> : null;
        },
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
