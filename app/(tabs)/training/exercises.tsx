import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { Search } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Chip } from "@/components/ui/Chip";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchExercises, type ExerciseFilters } from "@/services/exerciseService";
import { cacheExercisesForOffline, getCachedExercises } from "@/services/offlineQueue";
import { OBJECTIVES, LEVELS, POSITIONS } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import type { Exercise, Objective, PlayerLevel, Position } from "@/types/database";

export default function ExerciseLibraryScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (f: ExerciseFilters) => {
    setLoading(true);
    setError(null);
    try {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        setOffline(true);
        setExercises(await getCachedExercises<Exercise>());
        return;
      }
      setOffline(false);
      const data = await fetchExercises(f);
      setExercises(data);
      if (Object.keys(f).length === 0) await cacheExercisesForOffline(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les exercices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  function toggleFilter<K extends keyof ExerciseFilters>(key: K, value: ExerciseFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Bibliothèque d'exercices</Text>
        {offline ? <Text style={{ color: theme.warning, fontSize: 12 }}>Mode hors-ligne — contenu mis en cache</Text> : null}

        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Objectif</Text>
        <View style={styles.chipRow}>
          {OBJECTIVES.map((o) => (
            <Chip key={o.value} label={o.label} selected={filters.objective === o.value} onPress={() => toggleFilter("objective", o.value as Objective)} />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Poste</Text>
        <View style={styles.chipRow}>
          {POSITIONS.map((p) => (
            <Chip key={p.value} label={p.short} selected={filters.position === p.value} onPress={() => toggleFilter("position", p.value as Position)} />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Niveau</Text>
        <View style={styles.chipRow}>
          {LEVELS.map((l) => (
            <Chip key={l.value} label={l.label} selected={filters.level === l.value} onPress={() => toggleFilter("level", l.value as PlayerLevel)} />
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={() => load(filters)} />
      ) : exercises.length === 0 ? (
        <EmptyState icon={<Search size={26} color={theme.textMuted} />} title="Aucun exercice trouvé" description="Essaie d'autres filtres." />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ExerciseCard exercise={item} onPress={() => router.push(`/(tabs)/training/exercise/${item.id}`)} />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: spacing.sm },
  title: { ...typography.screenTitle, marginBottom: spacing.sm },
  filterLabel: { fontSize: 12, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  list: { paddingHorizontal: 20, paddingBottom: spacing.xxl },
});
