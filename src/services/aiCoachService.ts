import { supabase } from "@/lib/supabase";
import type { AiConversation, AiMessage, TrainingSkill } from "@/types/database";
import { withTimeout } from "@/utils/withTimeout";

/** Au-delà, on rend la main au joueur plutôt que de le laisser attendre. */
const COACH_TIMEOUT_MS = 30_000;

export async function fetchConversations(): Promise<AiConversation[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("player_id", auth.user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiConversation[];
}

export async function createConversation(title = "Nouvelle conversation"): Promise<AiConversation> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ player_id: auth.user.id, title })
    .select("*")
    .single();
  if (error) throw error;
  return data as AiConversation;
}

export async function fetchMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiMessage[];
}

/**
 * Envoie un message utilisateur et récupère la réponse du Coach IA.
 * Persiste les deux messages, puis appelle l'Edge Function `ai-coach` qui
 * a accès au contexte complet du joueur (profil, stats, historique) côté
 * serveur pour construire une réponse pertinente et sûre (voir
 * supabase/functions/ai-coach).
 */
/** Ce que le serveur dit d'une réponse qui ne vient pas du modèle. */
export type CoachDegradation = "ia_indisponible" | "quota_atteint";

export interface CoachReplyResult {
  message: AiMessage;
  /** Absent quand la réponse est normale. */
  degraded?: CoachDegradation;
}

/**
 * Enregistre la question du joueur.
 *
 * Séparée de la demande de réponse pour que réessayer ne réenregistre pas la
 * question : une seule question posée doit rester une seule ligne dans la
 * conversation, même après trois tentatives.
 */
export async function recordCoachQuestion(conversationId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "user", content });
  if (error) throw error;
}

/**
 * Demande une réponse au Coach IA et l'enregistre.
 *
 * La question doit déjà avoir été enregistrée par `recordCoachQuestion`. Cette
 * fonction est donc rejouable telle quelle : c'est ce qui permet à l'écran de
 * proposer « Réessayer » sur une question restée sans réponse, sans la poser
 * une seconde fois.
 *
 * Le quota n'est plus en jeu ici : depuis la migration
 * 20260928141928, le serveur ne débite une unité qu'après avoir réellement
 * obtenu une réponse du modèle. Un échec technique ne coûte donc rien au
 * joueur, et réessayer est sans conséquence sur son plafond quotidien.
 */
export async function requestCoachReply(conversationId: string, question: string): Promise<CoachReplyResult> {
  // Le Coach IA est l'appel le plus long de l'application : il peut traverser
  // un modèle de langage. Sans borne, un réseau qui pend laisse le joueur sur
  // un indicateur de chargement sans issue. Le serveur abandonne de son côté
  // au bout de 20 s ; on lui laisse une marge avant de rendre la main.
  const { data, error } = await withTimeout(
    supabase.functions.invoke<{
      reply: string;
      suggestedSkill?: TrainingSkill;
      suggestedLabel?: string;
      degraded?: CoachDegradation;
    }>("ai-coach", {
      body: { conversationId, message: question },
    }),
    COACH_TIMEOUT_MS,
    "Le Coach IA met trop de temps à répondre. Vérifie ta connexion et réessaie."
  );
  if (error) throw error;
  if (!data?.reply) throw new Error("Le Coach IA n'a pas renvoyé de réponse.");

  const { data: assistantMessage, error: insertAssistantError } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: data.reply,
      // Conservée avec le message pour que la proposition de séance survive à
      // la réouverture de la conversation.
      suggested_skill: data.suggestedSkill ?? null,
      suggested_label: data.suggestedLabel ?? null,
    })
    .select("*")
    .single();
  if (insertAssistantError) throw insertAssistantError;

  // Sert uniquement au tri de la liste des conversations : un échec ne doit pas
  // faire disparaître la réponse que le joueur vient de recevoir. On le
  // signale au lieu de l'ignorer sans trace.
  const { error: touchError } = await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (touchError) console.warn("Date de conversation non mise à jour :", touchError);

  return { message: assistantMessage as AiMessage, degraded: data.degraded };
}

/**
 * Pose une question et attend la réponse.
 *
 * Conservée : c'est le chemin nominal, et le découpage ci-dessus n'a d'intérêt
 * que pour l'écran qui veut pouvoir réessayer.
 */
export async function sendMessageToCoach(conversationId: string, content: string): Promise<CoachReplyResult> {
  await recordCoachQuestion(conversationId, content);
  return requestCoachReply(conversationId, content);
}
