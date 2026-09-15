import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";
import type { MessageRole } from "@/types/database";

export function ChatBubble({ role, content }: { role: MessageRole; content: string }) {
  const { theme } = useAppTheme();
  const isUser = role === "user";
  return (
    <View style={[styles.row, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.primary : theme.surfaceAlt,
            borderTopRightRadius: isUser ? 4 : radius.lg,
            borderTopLeftRadius: isUser ? radius.lg : 4,
          },
        ]}
      >
        <Text style={{ color: isUser ? "#FFFFFF" : theme.text, fontSize: 15, lineHeight: 21 }}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: spacing.sm },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, padding: spacing.md },
});
