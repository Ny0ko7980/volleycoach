// Supabase Edge Function: Coach IA
// Reçoit { conversationId, message }, construit le contexte complet du
// joueur (profil, statistiques récentes, historique d'entraînement) côté
// serveur (jamais exposé au client), puis génère une réponse:
//  - via l'API Anthropic si ANTHROPIC_API_KEY est configurée (secret serveur)
//  - sinon via un moteur de règles volleyball (rulesEngine.ts), garantissant
//    que le Coach IA fonctionne réellement dès l'installation, sans clé payante.
//
// Déploiement: supabase functions deploy ai-coach
// Secret optionnel: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  generateRuleBasedReply,
  findExerciseTechniqueReply,
  findGestureDiagnosisReply,
  mentionsPain,
  SAFETY_NOTICE,
  type PlayerContext,
} from "./rulesEngine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authentification requise." }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Utilisateur non authentifié." }, 401);
  }

  let body: { conversationId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps de requête invalide." }, 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return jsonResponse({ error: "Message vide." }, 400);
  }

  const { data: profile } = await supabase
    .from("player_profiles")
    .select("username, position, level, goals")
    .eq("id", user.id)
    .maybeSingle();

  const ctx: PlayerContext = {
    username: profile?.username ?? "champion",
    position: profile?.position ?? "outside_hitter",
    level: profile?.level ?? "debutant",
    goals: profile?.goals ?? [],
  };

  const { data: recentStats } = await supabase
    .from("statistics")
    .select("category, metric, value, recorded_at")
    .eq("player_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(15);

  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("status, perceived_difficulty, performance_rating, created_at")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  let reply: string;

  // Deux familles de questions reçoivent une réponse adossée au contenu réel
  // de la bibliothèque, exacte et disponible même sans clé Anthropic :
  //   - « pourquoi je rate mes manchettes ? » → les causes du raté, puis les
  //     exercices qui les corrigent ;
  //   - « comment bien faire des squats sautés ? » → la fiche d'exécution.
  // L'ordre compte : une question de diagnostic mentionne forcément le geste,
  // et ne doit pas être détournée vers une fiche technique.
  const { data: exerciseCatalog } = mentionsPain(message)
    ? { data: null }
    : await supabase.from("exercises").select("name, objective, instructions, common_mistakes, tips");
  const diagnosisReply = exerciseCatalog
    ? findGestureDiagnosisReply(message, exerciseCatalog, ctx.username)
    : null;
  const techniqueReply =
    !diagnosisReply && exerciseCatalog ? findExerciseTechniqueReply(message, exerciseCatalog) : null;

  if (diagnosisReply) {
    reply = diagnosisReply;
  } else if (techniqueReply) {
    reply = techniqueReply;
  } else if (ANTHROPIC_API_KEY) {
    try {
      reply = await callAnthropic(message, ctx, recentStats ?? [], recentSessions ?? []);
    } catch (err) {
      console.error("Anthropic call failed, falling back to rules engine:", err);
      reply = generateRuleBasedReply(message, ctx);
    }
  } else {
    reply = generateRuleBasedReply(message, ctx);
  }

  return jsonResponse({ reply });
});

async function callAnthropic(
  message: string,
  ctx: PlayerContext,
  stats: Record<string, unknown>[],
  sessions: Record<string, unknown>[]
): Promise<string> {
  const systemPrompt =
    `Tu es le Coach IA de l'application Coach Volley, spécialisé en volley-ball uniquement. ` +
    `Profil du joueur: pseudo="${ctx.username}", poste="${ctx.position}", niveau="${ctx.level}", ` +
    `objectifs=${JSON.stringify(ctx.goals)}. ` +
    `Statistiques récentes: ${JSON.stringify(stats)}. ` +
    `Séances récentes: ${JSON.stringify(sessions)}. ` +
    `Réponds de façon concrète, actionnable et adaptée au poste et au niveau du joueur. ` +
    `Ne donne JAMAIS de conseil médical: si la question évoque une douleur ou une blessure, recommande ` +
    `explicitement de consulter un professionnel de santé avant toute chose. Reste toujours dans le domaine du volley-ball. ` +
    `Réponds en français, de façon concise (moins de 200 mots).`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text as string | undefined;
  if (!text) throw new Error("Réponse Anthropic vide.");

  const mentionsPain = /douleur|blessure|mal au|blessé/i.test(message);
  return mentionsPain && !text.includes("professionnel") ? `${text}\n\n${SAFETY_NOTICE}` : text;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
