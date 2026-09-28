import type { ExerciseFilters } from "@/services/exerciseService";

/**
 * Clés de cache, toutes déclarées ici.
 *
 * Les écrire en ligne dans les écrans est la façon la plus sûre de rater une
 * invalidation : il suffit qu'une clé soit orthographiée différemment à deux
 * endroits pour qu'une écriture ne rafraîchisse pas la lecture correspondante.
 * Chaque famille expose une racine, ce qui permet d'invalider d'un coup tout
 * ce qui en dépend.
 */
export const queryKeys = {
  exercises: {
    root: ["exercises"] as const,
    list: (filters: ExerciseFilters = {}) => ["exercises", "list", filters] as const,
    detail: (id: string) => ["exercises", "detail", id] as const,
  },
  goals: {
    root: ["goals"] as const,
    list: (status?: string) => ["goals", "list", status ?? "all"] as const,
  },
  profile: {
    root: ["profile"] as const,
    me: () => ["profile", "me"] as const,
  },
  sessions: {
    root: ["sessions"] as const,
    today: () => ["sessions", "today"] as const,
    history: (limit: number) => ["sessions", "history", limit] as const,
  },
  statistics: {
    root: ["statistics"] as const,
    all: () => ["statistics", "all"] as const,
  },
  skillScores: {
    root: ["skillScores"] as const,
    all: () => ["skillScores", "all"] as const,
  },
  conversations: {
    root: ["conversations"] as const,
    list: () => ["conversations", "list"] as const,
  },
  team: {
    root: ["team"] as const,
    mine: () => ["team", "mine"] as const,
    roster: (teamId: string) => ["team", "roster", teamId] as const,
  },
  recommendation: {
    root: ["recommendation"] as const,
    forPlayer: (playerId: string, profileVersion: string) =>
      ["recommendation", playerId, profileVersion] as const,
  },
  admin: {
    root: ["admin"] as const,
    globalStats: () => ["admin", "globalStats"] as const,
    players: () => ["admin", "players"] as const,
  },
} as const;
