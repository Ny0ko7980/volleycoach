import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="profile-info" />
      <Stack.Screen name="position" />
      <Stack.Screen name="level" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
