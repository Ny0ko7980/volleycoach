import { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/constants/theme";

interface Props extends PropsWithChildren {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

export function ScreenContainer({ children, scroll = true, refreshing, onRefresh, padded = true }: Props) {
  const { theme } = useAppTheme();

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={[padded && styles.padded, styles.flex]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={padded ? styles.padded : undefined}
        // Sans ceci, quand le clavier est ouvert, le premier appui sur un
        // bouton ne fait que le refermer : il faut appuyer deux fois pour
        // valider. C'est le cas sur les neuf écrans qui utilisent TextField.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.lg, paddingBottom: 40 },
});
