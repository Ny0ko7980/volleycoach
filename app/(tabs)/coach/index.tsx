import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Bot, MessageCircle, ChevronRight } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchConversations, createConversation } from "@/services/aiCoachService";
import { spacing, typography } from "@/constants/theme";
import type { AiConversation } from "@/types/database";
import { errorMessage } from "@/utils/errors";

const SUGGESTED_QUESTIONS = [
  "Comment améliorer ma réception ?",
  "Pourquoi je rate mes manchettes ?",
  "Quels exercices puis-je faire chez moi ?",
  "Comment augmenter ma détente ?",
];

export default function CoachHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await fetchConversations());
    } catch (e) {
      setError(errorMessage(e, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleNewConversation(initialQuestion?: string) {
    setCreating(true);
    try {
      const conv = await createConversation(initialQuestion ? truncate(initialQuestion) : undefined);
      router.push({ pathname: "/(tabs)/coach/[conversationId]", params: { conversationId: conv.id, prefill: initialQuestion ?? "" } });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <View style={styles.header}>
        <View style={[styles.botIcon, { backgroundColor: theme.primaryMuted }]}>
          <Bot size={22} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Coach IA</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
            Ton coach personnel pour progresser au volley.
          </Text>
        </View>
      </View>

      <Button label="Nouvelle conversation" onPress={() => handleNewConversation()} loading={creating} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Questions fréquentes</Text>
      <View style={styles.suggestions}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            onPress={() => handleNewConversation(q)}
            style={[styles.suggestionChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{q}</Text>
            <ChevronRight size={16} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Historique</Text>
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={26} color={theme.textMuted} />}
          title="Aucune conversation"
          description="Démarre ta première conversation avec le Coach IA."
        />
      ) : (
        conversations.map((c) => (
          <Card key={c.id} style={undefined}>
            <Pressable
              style={styles.historyRow}
              onPress={() => router.push({ pathname: "/(tabs)/coach/[conversationId]", params: { conversationId: c.id } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{c.title}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
                  {new Date(c.updated_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </Pressable>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.md },
  botIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: typography.titleXL,
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: spacing.xl, marginBottom: spacing.sm },
  suggestions: { gap: spacing.sm },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyRow: { flexDirection: "row", alignItems: "center" },
});
