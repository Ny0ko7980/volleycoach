import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Variables manquantes, dans l'ordre où on veut les annoncer.
 *
 * Ce module ne lève volontairement plus d'exception au chargement. Dans un
 * build EAS, `process.env.EXPO_PUBLIC_*` est figé à la compilation : si les
 * variables n'étaient pas définies au moment du build, un `throw` ici se
 * produisait avant même le premier rendu. L'app se fermait instantanément, sans
 * message — un testeur TestFlight n'aurait vu qu'un crash au lancement, et
 * aucun log exploitable.
 *
 * On expose donc le diagnostic, et `app/_layout.tsx` affiche un écran
 * explicite. L'app démarre, dit ce qui manque, et reste déboguable.
 */
export const missingSupabaseEnvVars: string[] = [
  supabaseUrl ? null : "EXPO_PUBLIC_SUPABASE_URL",
  supabaseAnonKey ? null : "EXPO_PUBLIC_SUPABASE_ANON_KEY",
].filter((name): name is string => name !== null);

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

// Domaine réservé (RFC 2606) : jamais résolu, donc aucune requête ne peut
// partir vers un hôte réel tant que la configuration est absente. Sert
// uniquement à ce que `createClient` réussisse et que l'app atteigne l'écran
// d'erreur au lieu de planter à l'import.
const PLACEHOLDER_URL = "https://supabase-non-configure.invalid";

// Pas de générique `Database` typé ici volontairement: les types métier
// (src/types/database.ts) sont appliqués explicitement dans chaque service
// via des casts ciblés, ce qui évite les faux-négatifs `never` du client
// Supabase générique tant que `supabase gen types` n'est pas lié au projet.
export const supabase = createClient(
  supabaseUrl ?? PLACEHOLDER_URL,
  supabaseAnonKey ?? "cle-anon-absente",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
