import { StyleSheet, Text, View } from "react-native";
import { CategoryScoreRow } from "@/components/charts/CategoryScoreRow";
import { useAppTheme } from "@/hooks/useAppTheme";
import { skillIcon, skillLabel } from "@/constants/skills";
import { MIN_SAMPLE_SIZE, type SkillScoreResult } from "@/services/skillScoreService";
import { spacing, typography } from "@/constants/theme";

interface Props {
  scores: SkillScoreResult[];
}

/**
 * Scores par compétence.
 *
 * Une compétence dont les données sont insuffisantes n'affiche pas de chiffre :
 * elle indique ce qu'il manque. Montrer « 50/100 » par défaut laisserait croire
 * à une mesure alors qu'aucune séance ne la soutient.
 */
export function SkillScoreList({ scores }: Props) {
  const { theme } = useAppTheme();
  const reliable = scores.filter((score) => score.reliable);
  const pending = scores.filter((score) => !score.reliable);

  return (
    <View>
      {reliable.map((score) => (
        <CategoryScoreRow
          key={score.skill}
          label={skillLabel(score.skill)}
          icon={skillIcon(score.skill)}
          score={score.score}
        />
      ))}

      {pending.length > 0 ? (
        <View style={[styles.pending, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            {reliable.length === 0
              ? "Pas encore assez de séances pour calculer un score."
              : "En attente de données :"}{" "}
            {pending.map((score) => skillLabel(score.skill)).join(", ")}.
          </Text>
          <Text style={[typography.caption, { color: theme.textFaint, marginTop: spacing.xs }]}>
            Il faut au moins {MIN_SAMPLE_SIZE} retours ou statistiques par compétence.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { padding: spacing.md, borderRadius: 12, marginTop: spacing.xs },
});
