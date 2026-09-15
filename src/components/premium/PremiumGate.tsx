import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { spacing } from "@/constants/theme";

interface Props extends PropsWithChildren {
  isPremium: boolean;
  featureName: string;
}

/**
 * Enveloppe une fonctionnalité Premium. Architecture prête pour Stripe /
 * achats intégrés (voir README section Monétisation) — aucun paiement
 * réel n'est déclenché ici, seul l'accès est conditionné à
 * `player_profiles.is_premium`.
 */
export function PremiumGate({ isPremium, featureName, children }: Props) {
  const { theme } = useAppTheme();
  if (isPremium) return <>{children}</>;

  return (
    <Card>
      <View style={styles.row}>
        <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✨</Text>
        <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }}>{featureName}</Text>
        <Badge label="Premium" tone="warning" />
      </View>
      <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontSize: 13 }}>
        Cette fonctionnalité sera disponible avec l'offre Premium (à venir).
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
