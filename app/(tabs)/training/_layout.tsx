import { Stack } from "expo-router";

export default function TrainingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="exercise/[id]" />
      <Stack.Screen name="recommended" />
      <Stack.Screen name="generate" />
      <Stack.Screen name="history" />
      <Stack.Screen name="session/[id]" />
    </Stack>
  );
}
