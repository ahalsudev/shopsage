import { AppProviders } from '@/components/app-providers'
import { AppSplashController } from '@/components/app-splash-controller'
import { useAuth } from '@/components/auth/auth-provider'
import { PortalHost } from '@rn-primitives/portal'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { initializeApp } from '../utils/appInitializer'

export type RootStackParamList = {
  Welcome: undefined
  ConnectWallet: undefined
  ExpertRegistration: undefined
  Home: undefined
  ExpertList: undefined
  ExpertDetail: { expertId: string }
  VideoCall: { sessionId: string; expertId: string }
  Profile: undefined
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Initialize app configuration
  useEffect(() => {
    initializeApp().catch(console.error)
  }, [])

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    // Async font loading only occurs in development.
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppProviders>
        <AppSplashController />
        <RootNavigator />
        <StatusBar style="auto" />
      </AppProviders>
      <PortalHost />
    </GestureHandlerRootView>
  )
}

function RootNavigator() {
  const { isAuthenticated, isRegistered } = useAuth()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && isRegistered}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(expert)" options={{ headerShown: false }} />
        <Stack.Screen name="(shopper)" options={{ headerShown: false }} />
        <Stack.Screen name="(call)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated && !isRegistered}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !isRegistered}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
    </Stack>
  )
}
