import { Stack } from 'expo-router';

export default function AuthLayout() {
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
        name="connect-wallet" 
        options={{ title: 'Connect Wallet' }} 
      />
    </Stack>
  );
}