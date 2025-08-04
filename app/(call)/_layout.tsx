import { Stack } from 'expo-router'

export default function CallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="video-call" />
    </Stack>
  )
}
