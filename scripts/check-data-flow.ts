// Contrôle du flux de données de l'application.
//
// Trois défauts déjà rencontrés dans ce projet ne se voient ni au typage ni au
// linter, et ne se manifestent qu'à l'exécution, parfois seulement chez un
// joueur précis :
//
//   - le cache partagé entre deux comptes, quand un second joueur se connecte
//     sur le même téléphone ;
//   - la boucle de rechargement, quand un effet dépend d'un objet recréé à
//     chaque rendu ;
//   - l'écriture en base cachée dans un chargement d'écran, qui crée une
//     ligne à chaque passage sur l'onglet.
//
// Ce script relit les sources et vérifie que les règles qui les évitent sont
// toujours respectées. Il ne remplace pas un essai sur téléphone : il empêche
// une régression silencieuse de revenir sans que personne ne la voie.
//
// Lancement : npm run dataflow:check

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`OK   ${label}`);
  } else {
    failures += 1;
    console.log(`ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

const read = (path: string) => readFileSync(path, "utf8");
const screens = walk("app");

// ---------------------------------------------------------------------------
// 1. Cache par utilisateur.
//
// Les clés de cache ne portent pas d'identifiant de compte : c'est la purge à
// la fin de session qui empêche un joueur de voir les données du précédent.
// Si elle disparaît, rien d'autre ne l'arrête.
// ---------------------------------------------------------------------------
{
  const authStore = read("src/store/authStore.ts");
  const layout = read("app/_layout.tsx");

  // `signOut:` apparaît deux fois : dans le type puis dans l'implémentation.
  // C'est la seconde qui nous intéresse.
  const signOutStart = authStore.lastIndexOf("signOut:");
  const onAuthChange = authStore.slice(authStore.indexOf("onAuthStateChange"), signOutStart);
  check("1. cache vidé quand la session disparaît", /if \(!session\) queryClient\.clear\(\)/.test(onAuthChange));

  const signOut = authStore.slice(signOutStart);
  check("1. cache vidé à la déconnexion explicite", signOut.includes("queryClient.clear()"));
  check("1. session locale effacée même si la révocation distante échoue", signOut.includes("set({ session: null })"));

  check("1. profil en mémoire remis à zéro sans session", /setProfile\(null\)/.test(layout));

  const queryClientSource = read("src/lib/queryClient.ts");
  check(
    "1. le cache n'est pas persisté sur le disque (rien à fuiter entre deux comptes)",
    !/persistQueryClient|createSyncStoragePersister|AsyncStorage/.test(queryClientSource)
  );
}

// ---------------------------------------------------------------------------
// 2. Absence de boucle de chargement.
//
// Un objet de requête react-query est recréé à chaque rendu. Le placer dans
// les dépendances d'un `useCallback` ou d'un `useEffect` relance l'effet, qui
// relance un rendu : l'écran recharge sans fin. Les fonctions `refetch`, elles,
// sont stables — c'est d'elles qu'il faut dépendre.
// ---------------------------------------------------------------------------
{
  const offenders: string[] = [];
  const focusWithoutStableDeps: string[] = [];

  for (const file of screens) {
    const source = read(file);

    // Tableaux de dépendances : `}, [ ... ]);`
    for (const match of source.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
      const deps = (match[1] ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      for (const dep of deps) {
        // On nomme `xxxQuery` les objets rendus par useQuery ; `data`,
        // `error` et consorts sont déstructurés et donc déjà stables ou
        // volontairement observés.
        if (/Query$/.test(dep) || /Mutation$/.test(dep)) offenders.push(`${file} → ${dep}`);
      }
    }

    // Un écran qui recharge au focus doit passer par des `refetch` ou par un
    // chargement manuel explicitement admis (voir 4).
    if (source.includes("useFocusEffect") && !/refetch/.test(source) && !/const load = useCallback\(async/.test(source)) {
      focusWithoutStableDeps.push(file);
    }
  }

  check("2. aucun objet de requête dans un tableau de dépendances", offenders.length === 0, offenders.join(" ; "));
  check("2. tout rechargement au focus passe par un `refetch` stable", focusWithoutStableDeps.length === 0, focusWithoutStableDeps.join(" ; "));

  // Les deux écrans repris dans ce lot, vérifiés nommément.
  for (const file of ["app/(tabs)/index.tsx", "app/(tabs)/profile/index.tsx"]) {
    const source = read(file);
    const reloadDeps = source.slice(source.indexOf("const reload = useCallback"));
    const deps = reloadDeps.slice(reloadDeps.indexOf("}, ["), reloadDeps.indexOf("]);") + 1);
    const onlyRefetch = deps
      .replace(/[},[\]]/g, "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .every((d) => d.startsWith("refetch"));
    check(`2. ${file} : le rechargement ne dépend que de fonctions \`refetch\``, onlyRefetch, deps);
  }
}

// ---------------------------------------------------------------------------
// 3. Séparation lecture / écriture.
//
// Une lecture react-query peut être relancée à tout moment : au focus, au
// retour du réseau, sur une invalidation. Y glisser une écriture, c'est écrire
// en base à chaque relance — le défaut corrigé sur l'accueil, qui créait une
// séance orpheline par passage sur l'onglet.
// ---------------------------------------------------------------------------
{
  const hooks = read("src/hooks/queries.ts");
  const writeServices = [
    "generateWorkout",
    "generateWorkoutFromRecommendation",
    "startWorkoutSession",
    "completeWorkoutSession",
    "updateSessionProgress",
    "saveExerciseFeedback",
    "createGoal",
    "deleteGoal",
    "updateGoalProgress",
    "updateMyProfile",
    "addStatistic",
    "createTeamAsCoach",
    "joinTeamByCode",
    "leaveTeam",
  ];

  // Chaque bloc `useQuery({ ... })` est isolé, puis fouillé.
  const queryBlocks: string[] = [];
  for (const match of hooks.matchAll(/useQuery\(\{/g)) {
    const start = match.index ?? 0;
    let depth = 0;
    let end = start;
    for (let i = start + "useQuery(".length; i < hooks.length; i += 1) {
      const char = hooks[i];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    queryBlocks.push(hooks.slice(start, end));
  }

  check("3. au moins une lecture est bien déclarée", queryBlocks.length > 0);
  const contaminated = queryBlocks.filter((block) =>
    writeServices.some((name) => new RegExp(`\\b${name}\\s*\\(`).test(block))
  );
  check("3. aucune lecture n'appelle un service d'écriture", contaminated.length === 0, `${contaminated.length} bloc(s)`);

  check(
    "3. la séance du jour est produite par une mutation, pas par une lecture",
    /export function useGenerateTodayWorkout\(\)[\s\S]{0,400}useMutation/.test(hooks)
  );
  check(
    "3. la proposition du jour est lue sans rien écrire",
    /export function useTodayWorkoutProposal\([\s\S]{0,300}queryFn: bounded\(fetchTodayGeneratedWorkout/.test(hooks)
  );

  // Les clés de cache restent centralisées : deux orthographes d'une même clé
  // font silencieusement rater une invalidation.
  const inlineKeys = screens.filter((file) => /queryKey:\s*\[/.test(read(file)));
  check("3. aucune clé de cache écrite en dur dans un écran", inlineKeys.length === 0, inlineKeys.join(" ; "));
}

// ---------------------------------------------------------------------------
// 4. Chargement manuel : liste fermée.
//
// Certains écrans lisent encore à la main, et c'est justifié : un chargement
// conditionnel en chaîne, une lecture unique au montage, un écran de garde
// avant même que le cache existe. Cette liste est figée pour qu'un sixième
// écran ne s'y ajoute pas par habitude.
// ---------------------------------------------------------------------------
{
  const allowed = new Set([
    // Écran de garde : lit le profil avant que l'application soit montée.
    "app/_layout.tsx",
    // Conversation : lecture unique au montage, puis état local des messages.
    "app/(tabs)/coach/[conversationId].tsx",
    // Séance en cours : état local piloté par le joueur, écriture en fin.
    "app/(tabs)/training/session/[id].tsx",
    // Formulaire d'administration : lecture unique pour préremplir.
    "app/(tabs)/profile/admin/exercise-form.tsx",
    // Équipe : chaîne conditionnelle (coach → effectif, sinon adhésion → équipe).
    "app/(tabs)/profile/team.tsx",
  ]);

  const manual = screens.filter((file) => {
    const source = read(file);
    for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/services\/[^"]+"/g)) {
      const names = (match[1] ?? "").split(",").map((n) => n.trim().replace(/^type\s+/, ""));
      if (names.some((n) => /^fetch[A-Z]/.test(n))) return true;
    }
    return false;
  });

  const unexpected = manual.filter((file) => !allowed.has(file));
  const disappeared = [...allowed].filter((file) => !manual.includes(file));
  check("4. aucun nouvel écran ne lit en direct", unexpected.length === 0, unexpected.join(" ; "));
  check("4. la liste des exceptions est à jour", disappeared.length === 0, disappeared.join(" ; "));
  check(
    "4. l'accueil et le profil ne lisent plus en direct",
    !manual.includes("app/(tabs)/index.tsx") && !manual.includes("app/(tabs)/profile/index.tsx")
  );
}

// ---------------------------------------------------------------------------
// 5. Invalidations : ce qu'une écriture change doit être relu.
// ---------------------------------------------------------------------------
{
  const hooks = read("src/hooks/queries.ts");
  check("5. une écriture de profil marque le profil comme périmé", /export function invalidateProfile/.test(hooks));
  check("5. un démarrage de séance marque la séance du jour comme périmée", /export function invalidateStartedSession/.test(hooks));

  for (const file of [
    "app/(tabs)/profile/edit.tsx",
    "app/(tabs)/profile/settings.tsx",
    "app/(tabs)/training/generate.tsx",
  ]) {
    check(`5. ${file} invalide le profil après enregistrement`, read(file).includes("invalidateProfile()"));
  }

  for (const file of [
    "app/(tabs)/index.tsx",
    "app/(tabs)/training/generate.tsx",
    "app/(tabs)/training/recommended.tsx",
  ]) {
    check(`5. ${file} invalide la séance du jour après démarrage`, read(file).includes("invalidateStartedSession()"));
  }

  const completed = hooks.slice(hooks.indexOf("export function invalidateAfterCompletedSession"));
  for (const key of ["sessions", "statistics", "skillScores", "profile", "goals", "recommendation", "workouts", "achievements"]) {
    check(`5. fin de séance : « ${key} » est marqué périmé`, completed.includes(`queryKeys.${key}.root`));
  }
}

// ---------------------------------------------------------------------------
// 6. Données « du jour » : la journée fait partie de la clé.
//
// Sans elle, une application laissée ouverte pendant la nuit ressort le
// lendemain le cache de la veille : plus de séance du jour, et un verrou de
// génération qui ne se rouvre jamais.
// ---------------------------------------------------------------------------
{
  const keys = read("src/lib/queryKeys.ts");
  check("6. la séance du jour est indexée par la journée", /today: \(day: string\)/.test(keys));
  check("6. la proposition du jour est indexée par la journée", /todayProposal: \(day: string\)/.test(keys));

  const hooks = read("src/hooks/queries.ts");
  check("6. les lectures du jour calculent bien la journée", (hooks.match(/localDayKey\(\)/g) ?? []).length >= 3);

  const dashboard = read("app/(tabs)/index.tsx");
  // Le verrou de génération retient l'horodatage de la lecture qui a conclu
  // « rien aujourd'hui ». Un simple booléen confondrait « le même rien relu »
  // et « un nouveau rien » — et priverait de séance le joueur qui vient d'en
  // terminer une le matin.
  check(
    "6. le verrou de génération retient la lecture, pas un simple booléen",
    /generatedForRead = useRef<number \| null>/.test(dashboard) && /proposalQuery\.dataUpdatedAt/.test(dashboard)
  );
}

console.log("");
if (failures === 0) {
  console.log("TOUS LES CONTRÔLES PASSENT");
} else {
  console.log(`${failures} CONTRÔLE(S) EN ÉCHEC`);
  process.exitCode = 1;
}
