import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { Statistic } from "@/types/database";
import { spacing } from "@/constants/theme";

interface Props {
  title: string;
  stats: Statistic[];
  unit?: string | null;
}

export function StatLineChart({ title, stats, unit }: Props) {
  const { theme } = useAppTheme();
  const width = Dimensions.get("window").width - spacing.lg * 4;

  if (stats.length < 2) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          Ajoute au moins 2 mesures pour voir l'évolution de "{title}".
        </Text>
      </View>
    );
  }

  const data = stats.slice(-12);
  const labels = data.map((s, i) => (i % Math.ceil(data.length / 6) === 0 ? formatShortDate(s.recorded_at) : ""));

  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>
        {title} {unit ? `(${unit})` : ""}
      </Text>
      <LineChart
        data={{ labels, datasets: [{ data: data.map((s) => s.value) }] }}
        width={width}
        height={180}
        withInnerLines={false}
        withOuterLines={false}
        bezier
        chartConfig={{
          backgroundGradientFrom: theme.surface,
          backgroundGradientTo: theme.surface,
          decimalPlaces: 1,
          color: () => theme.chartLine,
          labelColor: () => theme.textMuted,
          propsForDots: { r: "3", strokeWidth: "1", stroke: theme.chartLine },
        }}
        style={{ borderRadius: 12 }}
      />
    </View>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  emptyWrap: { paddingVertical: spacing.lg },
});
