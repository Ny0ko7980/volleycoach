import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="team" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
