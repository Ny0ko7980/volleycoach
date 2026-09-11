import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
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
import { spacing, typography, radius } from "@/constants/theme";
import type { Exercise, Objective, PlayerLevel, Position } from "@/types/database";

export default function ExerciseLibraryScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

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

  const visibleExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    );
  }, [exercises, query]);

  const activeSecondaryFilters = (filters.position ? 1 : 0) + (filters.level ? 1 : 0);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>Exercices</Text>
        {offline ? <Text style={{ color: theme.warning, fontSize: 12, marginBottom: spacing.sm }}>Mode hors-ligne — contenu mis en cache</Text> : null}

        <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un exercice"
            placeholderTextColor={theme.textMuted}
            style={[typography.body, styles.searchInput, { color: theme.text }]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} accessibilityLabel="Effacer la recherche" accessibilityRole="button">
              <X size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.categoryRow}>
          <FlatList
            data={OBJECTIVES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(o) => o.value}
            renderItem={({ item: o }) => (
              <Chip label={o.label.replace("Améliorer ", "").replace("ma ", "").replace("mon ", "")} selected={filters.objective === o.value} onPress={() => toggleFilter("objective", o.value as Objective)} />
            )}
          />
        </View>

        <Pressable style={styles.moreFiltersToggle} onPress={() => setMoreFiltersOpen((v) => !v)}>
          <SlidersHorizontal size={14} color={theme.textMuted} />
          <Text style={[typography.caption, { color: theme.textMuted, marginLeft: spacing.xs }]}>
            Filtres {activeSecondaryFilters > 0 ? `(${activeSecondaryFilters})` : ""}
          </Text>
        </Pressable>

        {moreFiltersOpen ? (
          <View style={styles.moreFilters}>
            <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.xs }]}>Poste</Text>
            <View style={styles.chipRow}>
              {POSITIONS.map((p) => (
                <Chip key={p.value} label={p.short} selected={filters.position === p.value} onPress={() => toggleFilter("position", p.value as Position)} />
              ))}
            </View>
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>Niveau</Text>
            <View style={styles.chipRow}>
              {LEVELS.map((l) => (
                <Chip key={l.value} label={l.label} selected={filters.level === l.value} onPress={() => toggleFilter("level", l.value as PlayerLevel)} />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={() => load(filters)} />
      ) : visibleExercises.length === 0 ? (
        <EmptyState icon={<Search size={26} color={theme.textMuted} />} title="Aucun exercice trouvé" description="Essaie d'autres filtres ou une autre recherche." />
      ) : (
        <FlatList
          data={visibleExercises}
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
  header: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.sm },
  title: { marginBottom: spacing.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, height: "100%" },
  categoryRow: { marginBottom: spacing.xs },
  moreFiltersToggle: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: spacing.xs },
  moreFilters: { marginTop: spacing.xs, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  list: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.xxl },
});
