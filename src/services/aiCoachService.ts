import { supabase } from "@/lib/supabase";
import type { AiConversation, AiMessage } from "@/types/database";

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

  const { data, error } = await supabase.functions.invoke<{ reply: string }>("ai-coach", {
    body: { conversationId, message: content },
  });
  if (error) throw error;

  const reply = data?.reply ?? "Désolé, je n'ai pas pu générer de réponse pour le moment.";

  const { data: assistantMessage, error: insertAssistantError } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "assistant", content: reply })
    .select("*")
    .single();
  if (insertAssistantError) throw insertAssistantError;

  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return assistantMessage as AiMessage;
}
