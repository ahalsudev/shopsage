import { Stack } from 'expo-router'

export default function ExpertLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="list" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="registration" />
      <Stack.Screen name="profile-management" />
    </Stack>
  )
}
