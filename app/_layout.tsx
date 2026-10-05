import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { useAppFonts } from "@/design/fonts";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { connectQueryClientToAppLifecycle, queryClient } from "@/lib/queryClient";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { errorMessage } from "@/utils/errors";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { ConfigErrorView } from "@/components/ConfigErrorView";
import { isSupabaseConfigured, missingSupabaseEnvVars } from "@/lib/supabase";
import { APP_NAME } from "@/constants/brand";

// L'écran de lancement reste affiché jusqu'à ce que les polices soient
// prêtes : sinon la première image montre les titres en police système, puis
// ils sautent vers Archivo. L'appel peut échouer sur certaines plateformes
// (web, rechargement rapide) : ce n'est jamais une raison de ne pas démarrer.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigationGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initializing, init } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Incrémenté par « Réessayer » : relance le chargement du profil sans
  // dépendre d'un changement de session.
  const [reloadToken, setReloadToken] = useState(0);

  // Rejoue les mutations mises en attente hors-ligne (ouverture de session,
  // retour du réseau, retour au premier plan). Monté ici pour couvrir toute
  // l'application, y compris quand le joueur n'est plus sur l'écran de séance.
  useOfflineSync();

  // Relie react-query au cycle de vie React Native : retour au premier plan et
  // retour du réseau. Sans cela, `refetchOnWindowFocus` n'a pas de fenêtre à
  // écouter et le client se croit toujours en ligne.
  useEffect(() => connectQueryClientToAppLifecycle(), []);

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
    setProfileError(null);
    fetchMyProfile()
      .then(setProfile)
      // Sans ce catch, un échec réseau au lancement laissait `profile` à null
      // et le garde ci-dessous entrait quand même dans l'application : elle
      // paraissait fonctionner, mais « Terminer la séance » ne faisait rien
      // du tout (elle exige un profil), sans aucun message.
      .catch((e: unknown) => setProfileError(errorMessage(e, "Ton profil n'a pas pu être chargé.")))
      .finally(() => setProfileLoading(false));
  }, [session, initializing, setProfile, reloadToken]);

  useEffect(() => {
    if (initializing || profileLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    // La réinitialisation de mot de passe ouvre une session pour pouvoir
    // appeler updateUser(). Le garde doit donc se taire complètement sur cet
    // écran : sinon la session fraîchement ouverte déclenche une redirection
    // (vers (tabs), ou vers l'onboarding si le profil n'est pas complet) avant
    // que l'utilisateur ait pu saisir son nouveau mot de passe.
    if (segments.join("/") === "(auth)/reset-password") return;

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
    return <LoadingView label={`Chargement de ${APP_NAME}...`} />;
  }

  // Connecté mais profil illisible : on le dit et on propose de réessayer,
  // plutôt que d'ouvrir une application à moitié fonctionnelle.
  if (session && !profile && profileError) {
    return <ErrorView message={profileError} onRetry={() => setReloadToken((n) => n + 1)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <SyncStatusBanner />
    </View>
  );
}

export default function RootLayout() {
  const { theme } = useAppTheme();
  // Vrai dès que les polices sont là, qu'elles ont échoué, ou après trois
  // secondes : dans les trois cas on affiche. Le garde d'authentification
  // ci-dessous n'est pas monté avant, donc rien ne se joue en coulisses
  // pendant que l'écran de lancement est visible.
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* L'app est sombre en permanence (useAppTheme renvoie toujours
              darkTheme). "auto" choisirait la couleur des icônes selon le thème
              du téléphone : sur un appareil en mode clair, on obtenait des
              icônes noires sur le fond quasi noir de l'app. */}
          <StatusBar style="light" />
          {isSupabaseConfigured ? (
            <RootNavigationGate />
          ) : (
            <ConfigErrorView missing={missingSupabaseEnvVars} />
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * expo-router utilise l'export nommé `ErrorBoundary` d'un fichier de layout
 * comme frontière d'erreur pour tout ce que ce layout contient. L'exporter
 * depuis le layout racine couvre donc l'application entière.
 */
export { AppErrorBoundary as ErrorBoundary };
