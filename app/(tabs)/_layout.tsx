import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Home, Dumbbell, TrendingUp, Bot, User } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius } from "@/constants/theme";

const ICONS: Record<string, typeof Home> = {
  index: Home,
  training: Dumbbell,
  stats: TrendingUp,
  coach: Bot,
  profile: User,
};

/** Onglets contenant une pile de navigation, à ramener à leur écran principal. */
const STACK_TABS = ["training", "stats", "coach", "profile"];

const LABELS: Record<string, string> = {
  index: "Accueil",
  training: "Entraînement",
  stats: "Progression",
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
        tabBarInactiveTintColor: theme.textFaint,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 58,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarLabel: LABELS[route.name] ?? route.name,
        tabBarIcon: ({ color, focused, size }) => {
          const Icon = ICONS[route.name];
          if (!Icon) return null;
          return (
            <View style={[styles.iconWrap, focused && { backgroundColor: theme.primaryMuted }]}>
              <Icon color={color} size={size ?? 21} strokeWidth={focused ? 2.4 : 2} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" />
      {STACK_TABS.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          listeners={({ navigation }) => ({
            // Sans cela, l'onglet rouvre le dernier écran visité de sa pile :
            // revenir sur Profil après avoir consulté "Mes objectifs" y
            // ramenait au lieu d'afficher la fiche.
            tabPress: () => navigation.navigate(name, { screen: "index" }),
          })}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
