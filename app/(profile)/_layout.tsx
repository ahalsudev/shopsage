import { Stack } from 'expo-router'

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="expert-onboarding" />
      <Stack.Screen name="shopper-onboarding" />
    </Stack>
  )
}
