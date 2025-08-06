import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Button } from '@react-navigation/elements'

export function AccountUiButtons() {
  const router = useRouter()
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      <Button onPressIn={() => router.navigate('../account/airdrop')}>Airdrop</Button>
      <Button onPressIn={() => router.navigate('../account/send')}>Send</Button>
      <Button onPressIn={() => router.navigate('../account/receive')}>Receive</Button>
    </View>
  )
}
