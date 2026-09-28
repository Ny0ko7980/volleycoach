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
export async function sendMessageToCoach(conversationId: string, content: string): Promise<AiMessage> {
  const { error: insertUserError } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "user", content });
  if (insertUserError) throw insertUserError;

  // Le Coach IA est l'appel le plus long de l'application : il peut traverser
  // un modèle de langage. Sans borne, un réseau qui pend laisse le joueur sur
  // un indicateur de chargement sans issue.
  //
  // Limite connue, à traiter séparément : le message du joueur est déjà
  // enregistré au-dessus, et la fonction distante a peut-être déjà débité une
  // unité de quota. Un dépassement de délai laisse donc une question sans
  // réponse dans la conversation, et un nouvel essai en crée une seconde. La
  // borne ci-dessous rend la main à l'interface, elle ne rend pas l'appel
  // rejouable.
  const { data, error } = await withTimeout(
    supabase.functions.invoke<{
      reply: string;
      suggestedSkill?: TrainingSkill;
      suggestedLabel?: string;
    }>("ai-coach", {
      body: { conversationId, message: content },
    }),
    COACH_TIMEOUT_MS,
    "Le Coach IA met trop de temps à répondre. Vérifie ta connexion et réessaie."
  );
  if (error) throw error;

  const reply = data?.reply ?? "Désolé, je n'ai pas pu générer de réponse pour le moment.";

  const { data: assistantMessage, error: insertAssistantError } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
      // Conservée avec le message pour que la proposition de séance survive à
      // la réouverture de la conversation.
      suggested_skill: data?.suggestedSkill ?? null,
      suggested_label: data?.suggestedLabel ?? null,
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

  return assistantMessage as AiMessage;
}
