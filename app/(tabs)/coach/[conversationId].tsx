import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMessages, sendMessageToCoach } from "@/services/aiCoachService";
import { spacing } from "@/constants/theme";
import type { AiMessage } from "@/types/database";

export default function ChatScreen() {
  const { theme } = useAppTheme();
  const { conversationId, prefill } = useLocalSearchParams<{ conversationId: string; prefill?: string }>();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const prefillSent = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    if (!loading && prefill && !prefillSent.current && messages.length === 0) {
      prefillSent.current = true;
      handleSend(prefill);
    }
  }, [loading, prefill, messages.length]);

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || !conversationId || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, conversation_id: conversationId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    setSending(true);
    try {
      const assistantMessage = await sendMessageToCoach(conversationId, text);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le Coach IA n'a pas pu répondre. Réessaie.");
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
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
          renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {sending ? <Text style={[styles.typing, { color: theme.textMuted }]}>Le Coach IA réfléchit...</Text> : null}
        {error ? <Text style={{ color: theme.danger, paddingHorizontal: spacing.lg }}>{error}</Text> : null}

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
            <Text style={styles.sendLabel}>➤</Text>
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
  sendLabel: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
});
