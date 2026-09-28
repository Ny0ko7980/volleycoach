import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_TIMEOUT_MS, queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { withTimeout } from "@/utils/withTimeout";
import { fetchExerciseById, fetchExercises, type ExerciseFilters } from "@/services/exerciseService";
import { cacheExercisesForOffline } from "@/services/offlineQueue";
import { createGoal, deleteGoal, fetchGoals, updateGoalProgress } from "@/services/goalsService";
import { fetchMyProfile } from "@/services/profileService";
import { fetchSessionHistory, fetchTodaySession } from "@/services/workoutService";
import { fetchStatistics } from "@/services/statisticsService";
import { fetchSkillScores } from "@/services/skillScoreService";
import { fetchConversations } from "@/services/aiCoachService";
import { fetchMyCoachingTeam, fetchMyTeamMembership, fetchTeamRoster } from "@/services/teamService";
import { fetchAllPlayersAsAdmin, fetchGlobalStats } from "@/services/adminService";
import { buildTrainingContext } from "@/services/trainingContextService";
import { recommendSession } from "@/services/recommendationEngine";
import type { GoalStatus, PlayerProfile } from "@/types/database";

/**
 * Lectures serveur de l'application.
 *
 * Tout passe par ici plutôt que par un `useEffect` par écran : le cache,
 * l'invalidation, les nouvelles tentatives et le délai d'expiration sont
 * décidés à un seul endroit. Un écran ne fait plus que demander une donnée et
 * afficher les trois états que le client lui rend.
 */

/**
 * Borne toute requête serveur.
 *
 * Sans cela, un réseau « connecté mais mort » — wifi de gymnase, portail
 * captif — laisse la requête pendre : react-query resterait en `isPending` et
 * l'écran sur son indicateur de chargement, sans fin. Le dépassement de délai
 * est classé « temporaire », donc react-query le réessaiera comme une coupure.
 */
function bounded<T>(run: () => Promise<T>, label: string): () => Promise<T> {
  return () => withTimeout(run(), QUERY_TIMEOUT_MS, `${label} : le serveur met trop de temps à répondre.`);
}

/**
 * Le catalogue d'exercices est une donnée de référence : 331 lignes qui ne
 * changent qu'à l'ajout d'un exercice par un administrateur. Une fraîcheur
 * d'une heure évite de le recharger à chaque visite, et le cache le rend
 * consultable même sans réseau une fois la première lecture faite.
 */
export function useExercises(filters: ExerciseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.exercises.list(filters),
    queryFn: bounded(async () => {
      const data = await fetchExercises(filters);
      // Le catalogue complet est aussi écrit sur le disque : le cache de
      // react-query ne survit pas à la fermeture de l'application, celui-ci
      // oui. C'est ce qui rend la bibliothèque consultable dans un gymnase
      // sans réseau après un redémarrage.
      if (Object.keys(filters).length === 0) {
        void cacheExercisesForOffline(data).catch(() => undefined);
      }
      return data;
    }, "Bibliothèque d'exercices"),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exercises.detail(id ?? ""),
    queryFn: bounded(() => fetchExerciseById(id as string), "Exercice"),
    enabled: Boolean(id),
    staleTime: 60 * 60_000,
  });
}

export function useGoals(status?: GoalStatus) {
  return useQuery({
    queryKey: queryKeys.goals.list(status),
    queryFn: bounded(() => fetchGoals(status), "Objectifs"),
  });
}

/**
 * Les trois écritures sur les objectifs invalident la même racine : c'est la
 * raison d'être des clés centralisées. Aucune n'est mise en file hors-ligne —
 * créer ou supprimer un objectif est une action volontaire, que le joueur
 * refera s'il n'avait pas de réseau, contrairement à une séance terminée qu'il
 * ne peut pas rejouer.
 */
function useGoalMutation<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => withTimeout(run(args), QUERY_TIMEOUT_MS, "Objectifs : le serveur met trop de temps à répondre."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.root }),
  });
}

export function useCreateGoal() {
  return useGoalMutation(createGoal);
}

export function useDeleteGoal() {
  return useGoalMutation((id: string) => deleteGoal(id));
}

/**
 * Branché mais non encore appelé par un écran : la progression d'un objectif
 * est affichée (barre de `GoalCard`, objectif principal de l'accueil) et n'est
 * jamais mise à jour. Le manque est côté interface, pas côté service.
 */
export function useUpdateGoalProgress() {
  return useGoalMutation((args: { goalId: string; currentValue: number }) =>
    updateGoalProgress(args.goalId, args.currentValue)
  );
}

// ---------------------------------------------------------------------------
// Profil, séances, statistiques
// ---------------------------------------------------------------------------

export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: bounded(fetchMyProfile, "Profil"),
  });
}

export function useTodaySession() {
  return useQuery({
    queryKey: queryKeys.sessions.today(),
    queryFn: bounded(fetchTodaySession, "Séance du jour"),
  });
}

export function useSessionHistory(limit = 30) {
  return useQuery({
    queryKey: queryKeys.sessions.history(limit),
    queryFn: bounded(() => fetchSessionHistory(limit), "Historique des séances"),
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics.all(),
    queryFn: bounded(fetchStatistics, "Statistiques"),
  });
}

export function useSkillScores() {
  return useQuery({
    queryKey: queryKeys.skillScores.all(),
    queryFn: bounded(fetchSkillScores, "Scores de compétence"),
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: bounded(fetchConversations, "Conversations"),
  });
}

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

/**
 * L'appartenance d'équipe d'un joueur, quelle qu'en soit la forme : il peut
 * être coach d'une équipe qu'il a créée, ou membre d'une équipe rejointe. Les
 * deux lectures sont faites ensemble parce que l'écran a besoin des deux pour
 * savoir quoi afficher, et les séparer produirait deux états de chargement
 * successifs pour une seule information.
 */
export function useMyTeam() {
  return useQuery({
    queryKey: queryKeys.team.mine(),
    queryFn: bounded(async () => {
      const [coaching, membership] = await Promise.all([fetchMyCoachingTeam(), fetchMyTeamMembership()]);
      return { coaching, membership };
    }, "Équipe"),
  });
}

export function useTeamRoster(teamId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.team.roster(teamId ?? ""),
    queryFn: bounded(() => fetchTeamRoster(teamId as string), "Effectif"),
    enabled: Boolean(teamId),
  });
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export function useGlobalStats() {
  return useQuery({
    queryKey: queryKeys.admin.globalStats(),
    queryFn: bounded(fetchGlobalStats, "Statistiques globales"),
  });
}

export function useAllPlayers() {
  return useQuery({
    queryKey: queryKeys.admin.players(),
    queryFn: bounded(fetchAllPlayersAsAdmin, "Liste des joueurs"),
  });
}

/**
 * Séance recommandée pour un joueur.
 *
 * Le moteur est une fonction pure : tout le coût est dans la construction du
 * contexte, qui lit plusieurs tables. La mettre en cache évite de tout relire
 * à chaque retour sur l'écran, alors que la recommandation ne change qu'après
 * une séance terminée ou un ressenti enregistré.
 */
export function useRecommendedSession(profile: PlayerProfile | null) {
  return useQuery({
    // La clé porte aussi la date de dernière modification du profil : le
    // contexte d'entraînement est construit à partir du profil entier, donc
    // changer de poste ou d'objectif doit produire une nouvelle recommandation
    // et non ressortir celle mise en cache.
    queryKey: queryKeys.recommendation.forPlayer(profile?.id ?? "", profile?.updated_at ?? ""),
    queryFn: bounded(async () => recommendSession(await buildTrainingContext(profile as PlayerProfile)), "Séance recommandée"),
    enabled: Boolean(profile),
  });
}

/**
 * Marque comme périmé tout ce qu'une séance terminée change.
 *
 * Sans cela, le journal d'entraînement pouvait ne pas montrer la séance qu'on
 * venait de finir : il n'avait plus de rechargement systématique au montage,
 * et rien ne lui disait que sa donnée avait vieilli. Même chose pour les
 * statistiques, les récompenses du profil et la séance recommandée, qui est
 * calculée à partir de l'historique.
 *
 * Exportée comme fonction et non comme hook : elle est appelée depuis l'écran
 * de séance, après une écriture qui peut aussi venir de la file hors-ligne.
 */
export function invalidateAfterCompletedSession(): void {
  for (const key of [
    queryKeys.sessions.root,
    queryKeys.statistics.root,
    queryKeys.skillScores.root,
    queryKeys.profile.root,
    queryKeys.goals.root,
    queryKeys.recommendation.root,
  ]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}
