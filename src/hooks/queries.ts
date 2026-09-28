import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_TIMEOUT_MS } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { withTimeout } from "@/utils/withTimeout";
import { fetchExerciseById, fetchExercises, type ExerciseFilters } from "@/services/exerciseService";
import { cacheExercisesForOffline } from "@/services/offlineQueue";
import { createGoal, deleteGoal, fetchGoals, updateGoalProgress } from "@/services/goalsService";
import type { GoalStatus } from "@/types/database";

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
