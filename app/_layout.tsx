import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { queryClient } from "@/lib/queryClient";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAppTheme } from "@/hooks/useAppTheme";

function RootNavigationGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initializing, init } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const [profileLoading, setProfileLoading] = useState(true);
  const { theme } = useAppTheme();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  useEffect(() => {
    if (initializing) return;
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    fetchMyProfile()
      .then(setProfile)
      .finally(() => setProfileLoading(false));
  }, [session, initializing, setProfile]);

  useEffect(() => {
    if (initializing || profileLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    if (profile && !profile.onboarding_completed) {
      if (!inOnboardingGroup) router.replace("/(onboarding)/welcome");
      return;
    }

    if (inAuthGroup || inOnboardingGroup) {
      router.replace("/(tabs)");
    }
  }, [session, initializing, profile, profileLoading, segments, router]);

  if (initializing || profileLoading) {
    return <LoadingView label="Chargement de Coach Volley..." />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const { theme } = useAppTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <RootNavigationGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
