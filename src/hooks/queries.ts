import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { QUERY_TIMEOUT_MS, queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { localDayKey } from "@/utils/day";
import { withTimeout } from "@/utils/withTimeout";
import { fetchExerciseById, fetchExercises, type ExerciseFilters } from "@/services/exerciseService";
import { cacheExercisesForOffline } from "@/services/offlineQueue";
import { createGoal, deleteGoal, fetchGoals, goalStatusFor, updateGoalProgress, type UpdateGoalProgressInput } from "@/services/goalsService";
import { classifySupabaseFailure } from "@/services/offline/classifyFailure";
import { queueGoalProgress } from "@/services/offlineQueue";
import { notifyGoalProgress } from "@/services/notificationsService";
import { fetchMyProfile } from "@/services/profileService";
import {
  fetchSessionHistory,
  fetchTodayGeneratedWorkout,
  fetchTodaySession,
  generateWorkout,
  type GenerateWorkoutParams,
} from "@/services/workoutService";
import { fetchAllAchievements, fetchPlayerAchievements } from "@/services/gamificationService";
import { useProfileStore } from "@/store/profileStore";
import { fetchStatistics } from "@/services/statisticsService";
import { fetchSkillScores } from "@/services/skillScoreService";
import { fetchConversations } from "@/services/aiCoachService";
import { fetchMyCoachingTeam, fetchMyTeamMembership, fetchTeamRoster } from "@/services/teamService";
import { fetchAllPlayersAsAdmin, fetchGlobalStats } from "@/services/adminService";
import { buildTrainingContext } from "@/services/trainingContextService";
import { recommendSession } from "@/services/recommendationEngine";
import type { Goal, GoalStatus, PlayerProfile } from "@/types/database";

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
 * Recopie une progression dans toutes les listes d'objectifs en cache.
 *
 * Un objectif qui devient « atteint » reste momentanément visible dans la
 * liste « en cours » : la prochaine lecture réussie remettra les listes
 * d'aplomb, et afficher une valeur juste vaut mieux qu'un classement juste.
 */
function applyProgressToCachedGoals(client: QueryClient, input: UpdateGoalProgressInput): void {
  client.setQueriesData<Goal[]>({ queryKey: queryKeys.goals.root }, (goals) =>
    goals?.map((goal) =>
      goal.id === input.goalId
        ? { ...goal, current_value: input.currentValue, status: goalStatusFor(input.currentValue, input.targetValue) }
        : goal
    )
  );
}

/**
 * Variables de la mise à jour de progression.
 *
 * `goalName` et `previousStatus` ne sont pas écrits : ils servent uniquement à
 * décider de la notification locale. Ils sont volontairement séparés de
 * `UpdateGoalProgressInput`, qui est la charge utile persistée dans la file
 * hors-ligne — on ne stocke pas sur le disque ce qui ne sert pas au rejeu.
 */
export interface UpdateGoalProgressVariables extends UpdateGoalProgressInput {
  goalName: string;
  previousStatus: GoalStatus;
}

/**
 * Met à jour la progression d'un objectif.
 *
 * Contrairement à la création et à la suppression, cette écriture passe par la
 * file hors-ligne en cas de coupure : le joueur note souvent sa progression
 * juste après une séance, donc dans le gymnase, là où le réseau manque. Perdre
 * cette saisie serait exactement le défaut réparé en phase 2 pour les séances.
 *
 * Un refus définitif n'est pas mis en file — il ne passerait jamais — et
 * remonte à l'appelant pour être annoncé.
 *
 * La notification ne part qu'au franchissement de la cible, pas à chaque
 * saisie : annoncer « 40 % atteint » à quelqu'un qui vient de taper 40 n'a
 * aucune valeur. Elle est décidée localement, à partir de la même règle pure
 * que l'écriture, donc elle part aussi quand la saisie est mise en file — le
 * joueur a atteint sa cible, que le serveur soit joignable ou non.
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: UpdateGoalProgressVariables) => {
      const input: UpdateGoalProgressInput = {
        goalId: variables.goalId,
        currentValue: variables.currentValue,
        targetValue: variables.targetValue,
      };
      let queued = false;
      try {
        await withTimeout(updateGoalProgress(input), QUERY_TIMEOUT_MS, "Objectifs : le serveur met trop de temps à répondre.");
      } catch (error) {
        if (classifySupabaseFailure(error) === "permanent") throw error;
        await queueGoalProgress(input);
        queued = true;
        // Hors ligne, la relecture qui suit ne rapportera rien : sans cette
        // écriture dans le cache, la carte afficherait encore l'ancienne
        // valeur alors que la saisie est bien enregistrée et partira au
        // retour du réseau. La file garantit l'écriture, l'affichage peut donc
        // la refléter tout de suite.
        applyProgressToCachedGoals(queryClient, input);
      }

      const reached =
        variables.previousStatus !== "achieved" && goalStatusFor(variables.currentValue, variables.targetValue) === "achieved";
      // Une notification qui échoue ne doit pas faire échouer la saisie.
      if (reached) void notifyGoalProgress(variables.goalName, 100).catch(() => undefined);

      return { queued, reached };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.root }),
  });
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

/**
 * Le profil, lu par react-query et recopié dans le store.
 *
 * Le store reste la source unique consultée par le reste de l'application —
 * une douzaine d'écrans et le service de notifications en dépendent, et les
 * réécrire n'entre pas dans ce lot. Ce qui change, c'est qui va le chercher :
 * plus un `fetchMyProfile` par écran à chaque focus, mais une seule lecture
 * mise en cache et invalidée aux bons moments.
 *
 * La recopie est faite dans un effet et non pendant le rendu : écrire dans un
 * store externe pendant le rendu ferait boucler tous les écrans abonnés.
 */
export function useSyncedProfile() {
  const query = useMyProfile();
  const setProfile = useProfileStore((state) => state.setProfile);
  const fresh = query.data;

  useEffect(() => {
    // `undefined` = pas encore lu ; `null` = lu, aucun profil. Seul le
    // premier cas doit laisser le store intact.
    if (fresh !== undefined && fresh !== null) setProfile(fresh);
  }, [fresh, setProfile]);

  return query;
}

export function useTodaySession() {
  return useQuery({
    queryKey: queryKeys.sessions.today(localDayKey()),
    queryFn: bounded(fetchTodaySession, "Séance du jour"),
  });
}

export function useSessionHistory(limit = 30) {
  return useQuery({
    queryKey: queryKeys.sessions.history(limit),
    queryFn: bounded(() => fetchSessionHistory(limit), "Historique des séances"),
  });
}

/**
 * La séance proposée pour aujourd'hui, si elle a déjà été produite.
 *
 * Lecture pure : elle ne crée rien. C'est la contrepartie indispensable de
 * `useGenerateTodayWorkout` — tant que les deux étaient mêlées dans un même
 * chargement d'écran, revenir sur l'accueil écrivait en base.
 */
export function useTodayWorkoutProposal(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.workouts.todayProposal(localDayKey()),
    queryFn: bounded(fetchTodayGeneratedWorkout, "Séance du jour"),
    enabled,
  });
}

/**
 * Produit la séance du jour. Écriture : elle insère une séance et ses
 * exercices.
 *
 * Le résultat est écrit directement dans le cache de la lecture ci-dessus
 * plutôt qu'invalidé : relire immédiatement ce qu'on vient d'écrire ne
 * servirait qu'à refaire un aller-retour, et surtout à rouvrir la fenêtre
 * pendant laquelle l'écran croit n'avoir aucune séance.
 */
export function useGenerateTodayWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: GenerateWorkoutParams) =>
      withTimeout(generateWorkout(params), QUERY_TIMEOUT_MS, "Séance du jour : le serveur met trop de temps à répondre."),
    onSuccess: (workout) => queryClient.setQueryData(queryKeys.workouts.todayProposal(localDayKey()), workout),
  });
}

/**
 * Badges : le catalogue et ceux débloqués par le joueur.
 *
 * Les deux lectures sont faites ensemble parce que l'écran affiche une grille
 * où chaque badge du catalogue est soit acquis soit verrouillé : les séparer
 * produirait un affichage intermédiaire où tous paraissent verrouillés.
 */
export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements.root,
    queryFn: bounded(async () => {
      const [mine, catalog] = await Promise.all([fetchPlayerAchievements(), fetchAllAchievements()]);
      return { mine, catalog };
    }, "Badges"),
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
 * Marque le profil comme périmé après une écriture.
 *
 * Nécessaire depuis que l'écran de profil lit par le cache : il reste monté
 * pendant qu'on édite sa fiche ou ses réglages dans un écran empilé au-dessus,
 * donc rien ne le ferait relire au retour. Sans cet appel, le joueur revenait
 * sur son ancien pseudo.
 */
export function invalidateProfile(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
}

/**
 * Marque comme périmée la séance du jour après un démarrage.
 *
 * Une séance peut être démarrée depuis trois écrans ; l'accueil doit afficher
 * « Séance en cours » quel que soit celui par lequel elle a commencé. Avant,
 * c'était le rechargement au focus de l'accueil qui s'en chargeait — il ne
 * rechargeait pas seulement ça, et il réécrivait en base.
 */
export function invalidateStartedSession(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.root });
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
    // La proposition du jour et les badges : une séance terminée consomme la
    // première et peut débloquer les seconds.
    queryKeys.workouts.root,
    queryKeys.achievements.root,
  ]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}
