import { Redirect } from 'expo-router';

export default function Index() {
  // Since this is outside AuthProvider context, we can't check auth here
  // The Stack.Protected will handle the routing based on authentication
  return <Redirect href="/(profile)/home" />;
}