import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius } from "@/constants/theme";

interface Props {
  percent: number; // 0-100
  color?: string;
  height?: number;
}

export function ProgressBar({ percent, color, height = 10 }: Props) {
  const { theme } = useAppTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color ?? theme.primary,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
