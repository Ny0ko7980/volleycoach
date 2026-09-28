import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { SessionSuggestion } from "@/components/chat/SessionSuggestion";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMessages, recordCoachQuestion, requestCoachReply, type CoachDegradation } from "@/services/aiCoachService";
import { spacing } from "@/constants/theme";
import type { AiMessage } from "@/types/database";
import { errorMessage } from "@/utils/errors";

export default function ChatScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { conversationId, prefill } = useLocalSearchParams<{ conversationId: string; prefill?: string }>();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Question enregistrée mais restée sans réponse : elle peut être relancée
  // sans être reposée.
  const [unansweredQuestion, setUnansweredQuestion] = useState<string | null>(null);
  // Le serveur dit quand la réponse ne vient pas du modèle. Sans cela, une
  // panne était indiscernable d'une réponse normale.
  const [degraded, setDegraded] = useState<CoachDegradation | undefined>(undefined);
  const listRef = useRef<FlatList>(null);
  const prefillSent = useRef(false);
  // Le préremplissage ne doit partir que si l'historique a réellement été lu :
  // une liste vide parce que le chargement a échoué n'est pas une conversation
  // vide.
  const historyLoaded = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId)
      .then((loaded) => {
        setMessages(loaded);
        historyLoaded.current = true;
      })
      // Sans ce catch, un historique non chargé donnait une conversation
      // affichée vide sans le dire, et le préremplissage ci-dessous partait
      // une seconde fois — message dupliqué et appel au Coach IA facturé.
      .catch((e: unknown) => setError(errorMessage(e, "L'historique de la conversation n'a pas pu être chargé.")))
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    if (!loading && historyLoaded.current && prefill && !prefillSent.current && messages.length === 0) {
      prefillSent.current = true;
      handleSend(prefill);
    }
    // handleSend est recréée à chaque rendu; on ne veut déclencher l'envoi
    // du préremplissage qu'une seule fois, au chargement initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prefill, messages.length]);

  /**
   * Demande la réponse à une question déjà posée.
   *
   * Séparé de l'envoi pour que « Réessayer » ne repose pas la question : elle
   * est déjà enregistrée côté serveur. Depuis la migration du quota, un échec
   * technique ne débite rien, donc réessayer est aussi gratuit pour le joueur.
   */
  async function askForReply(question: string) {
    setSending(true);
    setError(null);
    setDegraded(undefined);
    try {
      const result = await requestCoachReply(conversationId, question);
      setMessages((prev) => [...prev, result.message]);
      setDegraded(result.degraded);
      setUnansweredQuestion(null);
    } catch (e) {
      // La question reste affichée et reste en base : on retient seulement
      // qu'elle n'a pas de réponse, pour pouvoir la relancer.
      setUnansweredQuestion(question);
      setError(errorMessage(e, "Le Coach IA n'a pas pu répondre. Réessaie."));
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || !conversationId || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, conversation_id: conversationId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    try {
      await recordCoachQuestion(conversationId, text);
    } catch (e) {
      setError(errorMessage(e, "Ta question n'a pas pu être envoyée. Réessaie."));
      return;
    }
    await askForReply(text);
  }

  if (loading) return <LoadingView label="Chargement de la conversation..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View>
              <ChatBubble role={item.role} content={item.content} />
              {item.suggested_skill ? (
                <SessionSuggestion
                  label={item.suggested_label ?? "ce point"}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/training/generate",
                      params: { skill: item.suggested_skill as string },
                    })
                  }
                />
              ) : null}
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {sending ? <Text style={[styles.typing, { color: theme.textMuted }]}>Le Coach IA réfléchit...</Text> : null}
        {/* Une réponse de repli doit se distinguer d'une vraie réponse :
            sinon le joueur croit que sa question a été traitée. */}
        {degraded ? (
          <Text style={{ color: theme.warning, paddingHorizontal: spacing.lg, fontSize: 12 }}>
            {degraded === "quota_atteint"
              ? "Tu as atteint ta limite de questions pour aujourd'hui. Voici une réponse du moteur de règles ; ta limite repart demain."
              : "Le Coach IA n'était pas joignable. Voici une réponse du moteur de règles — ta question ne t'a rien coûté."}
          </Text>
        ) : null}

        {error ? <Text style={{ color: theme.danger, paddingHorizontal: spacing.lg }}>{error}</Text> : null}

        {/* La question est enregistrée : la relancer ne la repose pas et, le
            quota n'étant débité qu'en cas de succès, ne coûte rien. */}
        {unansweredQuestion && !sending ? (
          <Pressable
            onPress={() => void askForReply(unansweredQuestion)}
            style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
          >
            <Text style={{ color: theme.primary, fontWeight: "700" }}>Réessayer cette question</Text>
          </Pressable>
        ) : null}

        <View style={[styles.inputRow, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Écris ta question..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
            multiline
          />
          <Pressable onPress={() => handleSend()} style={[styles.sendButton, { backgroundColor: theme.primary }]} disabled={sending}>
            <Send size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.md },
  typing: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, fontSize: 12, fontStyle: "italic" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: spacing.md, borderTopWidth: 1, gap: spacing.sm },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100, fontSize: 15 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
