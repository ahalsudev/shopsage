import { Stack } from 'expo-router';

export default function ShopperLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#6366f1',
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#1e293b',
        },
      }}
    >
      <Stack.Screen
        name="sessions"
        options={{ title: 'My Sessions' }}
      />
    </Stack>
  );
}