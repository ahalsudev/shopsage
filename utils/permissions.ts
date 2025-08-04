import { Alert, Platform, PermissionsAndroid } from 'react-native'
import { log } from '@/config/environment'

export interface PermissionStatus {
  camera: boolean
  microphone: boolean
}

/**
 * Request camera and microphone permissions for video calling (Android)
 */
const requestAndroidPermissions = async (): Promise<PermissionStatus> => {
  try {
    const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]

    const results = await PermissionsAndroid.requestMultiple(permissions)

    const cameraGranted = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
    const microphoneGranted =
      results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED

    return {
      camera: cameraGranted,
      microphone: microphoneGranted,
    }
  } catch (error) {
    log.error('Failed to request Android permissions:', error)
    return {
      camera: false,
      microphone: false,
    }
  }
}

/**
 * Check current permission status without requesting (Android)
 */
const checkAndroidPermissions = async (): Promise<PermissionStatus> => {
  try {
    const cameraStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)
    const microphoneStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)

    return {
      camera: cameraStatus,
      microphone: microphoneStatus,
    }
  } catch (error) {
    log.error('Failed to check Android permissions:', error)
    return {
      camera: false,
      microphone: false,
    }
  }
}

/**
 * Request camera and microphone permissions for video calling
 */
export const requestVideoCallPermissions = async (): Promise<PermissionStatus> => {
  try {
    log.info('Requesting video call permissions...')

    if (Platform.OS === 'android') {
      const status = await requestAndroidPermissions()
      log.info('Android permission request results:', status)
      return status
    } else {
      // For iOS or other platforms, assume permissions are granted
      // In a real app, you'd use react-native-permissions for iOS
      log.info('Non-Android platform - assuming permissions granted')
      return {
        camera: true,
        microphone: true,
      }
    }
  } catch (error) {
    log.error('Failed to request permissions:', error)
    return {
      camera: false,
      microphone: false,
    }
  }
}

/**
 * Check current permission status without requesting
 */
export const checkVideoCallPermissions = async (): Promise<PermissionStatus> => {
  try {
    if (Platform.OS === 'android') {
      return await checkAndroidPermissions()
    } else {
      // For iOS or other platforms, assume permissions are granted
      return {
        camera: true,
        microphone: true,
      }
    }
  } catch (error) {
    log.error('Failed to check permissions:', error)
    return {
      camera: false,
      microphone: false,
    }
  }
}

/**
 * Show permission explanation dialog and request permissions
 */
export const requestPermissionsWithExplanation = async (): Promise<PermissionStatus> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Permissions Required',
      'ShopSage needs camera and microphone access for video calls. Please grant these permissions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve({ camera: false, microphone: false }),
        },
        {
          text: 'Grant Permissions',
          onPress: async () => {
            const status = await requestVideoCallPermissions()
            resolve(status)
          },
        },
      ],
    )
  })
}

/**
 * Handle permission denials with helpful messaging
 */
export const handlePermissionDenied = (status: PermissionStatus): void => {
  if (!status.camera && !status.microphone) {
    Alert.alert(
      'Permissions Required',
      'Camera and microphone access are required for video calls. Please enable them in your device settings.',
      [{ text: 'OK' }],
    )
  } else if (!status.camera) {
    Alert.alert(
      'Camera Permission Required',
      'Camera access is required for video calls. You can continue with audio-only if preferred.',
      [{ text: 'OK' }],
    )
  } else if (!status.microphone) {
    Alert.alert(
      'Microphone Permission Required',
      'Microphone access is required for voice communication during calls.',
      [{ text: 'OK' }],
    )
  }
}
