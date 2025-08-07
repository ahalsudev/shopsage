import { log } from '@/config/environment'
import { chatService, ChatMessage as PersistentChatMessage } from '@/services/chatService'
import { sessionService } from '@/services/sessionService'
import { localSessionStorage } from '@/services/localSessionStorage'
import { useAuth } from '@/components/auth/auth-provider'
import {
  Call,
  CallContent,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-native-sdk'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

interface ChatMessage {
  id: string
  text: string
  user: { name: string }
  timestamp: Date
}

interface VideoCallScreenProps {}

const VideoCallContent: React.FC = () => {
  const call = useCall()
  const router = useRouter()
  const { user } = useAuth()
  const { sessionId, expertId } = useLocalSearchParams<{ sessionId: string; expertId?: string }>()

  const { useCallCallingState, useParticipantCount } = useCallStateHooks()

  const callingState = useCallCallingState()
  const participantCount = useParticipantCount()

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [showChat, setShowChat] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes in seconds
  const [showExtensionDialog, setShowExtensionDialog] = useState(false)
  const [callExtended, setCallExtended] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [participantReady, setParticipantReady] = useState<{[key: string]: boolean}>({})
  const [callParticipants, setCallParticipants] = useState<{[key: string]: string}>({}) // id -> name mapping

  useEffect(() => {
    if (!call) return

    // Join the call and initialize media
    const initializeCall = async () => {
      try {
        await call.join({ create: true })
        log.info('Successfully joined call')

        // Record session start if sessionId is provided
        if (sessionId && user?.user?.id) {
          try {
            // Try to start session via API first
            await sessionService.startSession(sessionId)
            log.info('Session started and recorded:', sessionId)
          } catch (sessionError) {
            log.warn('Failed to record session via API, using local storage:', sessionError)
          }

          // Always save to local storage as backup
          try {
            await localSessionStorage.createSessionFromCall(sessionId, expertId || 'unknown', user.user.id)
            log.info('Session saved to local storage:', sessionId)
          } catch (localError) {
            log.warn('Failed to save session locally:', localError)
          }
        }

        // Enable camera and microphone
        try {
          await call.camera.enable()
          await call.microphone.enable()
          log.info('Media devices enabled successfully')
        } catch (error) {
          log.warn('Failed to enable media devices:', error)
        }
      } catch (error) {
        log.error('Failed to join call:', error)
        Alert.alert('Call Error', 'Failed to join the call')
      }
    }

    initializeCall()

    // Load existing chat messages for this session
    const loadExistingMessages = async () => {
      if (sessionId) {
        try {
          const existingMessages = await chatService.getMessages(sessionId)
          // Convert persistent messages to display format
          const displayMessages: ChatMessage[] = existingMessages.map((msg) => ({
            id: msg.id,
            text: msg.text,
            user: msg.user,
            timestamp: msg.timestamp,
          }))
          setChatMessages(displayMessages)
        } catch (error) {
          log.error('Failed to load existing chat messages:', error)
        }
      }
    }

    loadExistingMessages()

    // Set up participant tracking
    const updateParticipants = () => {
      if (call?.state?.participants) {
        const participantMap: {[key: string]: string} = {}
        call.state.participants.forEach(participant => {
          if (participant.userId && participant.name) {
            participantMap[participant.userId] = participant.name
          }
        })
        setCallParticipants(participantMap)
        log.info('Updated call participants:', participantMap)
      }
    }

    // Update participants on join
    updateParticipants()

    // Listen for participant changes
    const participantUnsubscribe = call.on('call.updated', () => {
      updateParticipants()
    })

    // Set up chat message listener
    const messageUnsubscribe = call.on('call.reaction_new', (event) => {
      if (event.reaction?.type === 'chat_message') {
        // Get sender name from participants mapping or event data
        const senderId = event.user?.id || event.reaction?.custom?.senderId || 'unknown'
        const senderName = callParticipants[senderId] || event.user?.name || event.reaction?.custom?.senderName || 'Unknown User'
        
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: event.reaction.custom?.message || '',
          user: { name: senderName },
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, newMessage])

        // Save message to persistent storage
        if (sessionId && call) {
          const persistentMessage: PersistentChatMessage = {
            id: newMessage.id,
            text: newMessage.text,
            user: {
              id: senderId,
              name: senderName,
            },
            timestamp: newMessage.timestamp,
            sessionId: sessionId,
            callId: call.id,
          }

          chatService.saveMessage(persistentMessage).catch((error) => {
            log.error('Failed to save chat message:', error)
          })
        }
      }
      
      // Handle session start confirmation
      if (event.reaction?.type === 'session_ready') {
        const userId = event.user?.id || event.reaction?.custom?.userId
        if (userId) {
          setParticipantReady(prev => ({...prev, [userId]: true}))
        }
      }
    })

    return () => {
      participantUnsubscribe()
      messageUnsubscribe()
    }
  }, [call, sessionId])

  // Check if session should start automatically when both participants are ready
  useEffect(() => {
    if (!sessionStarted && Object.keys(callParticipants).length >= 2) {
      const readyParticipants = Object.values(participantReady).filter(Boolean).length
      const totalParticipants = Object.keys(callParticipants).length
      
      if (readyParticipants >= totalParticipants) {
        // All participants are ready, start session
        setSessionStarted(true)
        setSessionStartTime(new Date())
        log.info('Session started automatically - all participants ready')
      }
    }
  }, [participantReady, callParticipants, sessionStarted])

  // Timer effect for 5-minute limit - only start when session begins
  useEffect(() => {
    if (!sessionStarted || !sessionStartTime) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - end call
          handleEndCall()
          return 0
        }

        // Show extension dialog at 30 seconds remaining
        if (prev === 30 && !callExtended && !showExtensionDialog) {
          setShowExtensionDialog(true)
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionStarted, sessionStartTime, callExtended, showExtensionDialog])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleExtendCall = () => {
    Alert.alert(
      'Extend Call',
      'Would you like to extend this call for another 5 minutes? Both participants must agree.',
      [
        {
          text: 'No, End Call',
          onPress: () => {
            setShowExtensionDialog(false)
            handleEndCall()
          },
        },
        {
          text: 'Yes, Extend',
          onPress: () => {
            setTimeRemaining(300) // Reset to 5 minutes
            setCallExtended(true)
            setShowExtensionDialog(false)
            // In real implementation, this would notify the other participant
            Alert.alert('Call Extended', 'Call has been extended for another 5 minutes.')
          },
        },
      ],
    )
  }

  // Show extension dialog
  useEffect(() => {
    if (showExtensionDialog) {
      handleExtendCall()
    }
  }, [showExtensionDialog])

  const handleEndCall = async () => {
    try {
      log.info('VideoCall: Ending call...', { sessionId, hasCall: !!call })
      
      if (call) {
        await call.leave()
        log.info('VideoCall: Successfully left the call')
      }

      // Update session status
      if (sessionId) {
        try {
          log.info('VideoCall: Completing session via API...', { sessionId })
          await sessionService.completeSession(sessionId)
          log.info('VideoCall: Session completed via API successfully')
        } catch (error) {
          log.warn('Failed to complete session via API:', error)
        }

        // Always update local storage
        try {
          await localSessionStorage.completeSession(sessionId)
          log.info('Session completed in local storage:', sessionId)
        } catch (localError) {
          log.warn('Failed to complete session locally:', localError)
        }
      }

      log.info('VideoCall: Navigating back after call end')
      // Use replace to go to sessions page instead of back navigation
      // This prevents any potential navigation stack issues
      router.replace('/(shopper)/sessions')
    } catch (error) {
      log.error('Failed to end call properly:', error)
      // Even if ending fails, we should still navigate away
      log.info('VideoCall: Navigating to sessions despite error')
      router.replace('/(shopper)/sessions')
    }
  }

  const handleStartSession = async () => {
    if (!call || !user?.user?.id) return

    try {
      // Mark current user as ready
      setParticipantReady(prev => ({...prev, [user.user.id]: true}))
      
      // Send ready signal to other participants
      await call.sendReaction({
        type: 'session_ready',
        custom: { 
          userId: user.user.id,
          userName: user.user.name 
        },
      })

      log.info('User marked as ready for session start')
    } catch (error) {
      log.error('Failed to send session ready signal:', error)
    }
  }

  const sendChatMessage = async () => {
    if (!messageText.trim() || !call || !user?.user?.id) return

    try {
      await call.sendReaction({
        type: 'chat_message',
        custom: { 
          message: messageText.trim(),
          senderId: user.user.id,
          senderName: user.user.name 
        },
      })

      setMessageText('')
    } catch (error) {
      log.error('Failed to send chat message:', error)
    }
  }

  if (callingState !== 'joined') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{callingState === 'joining' ? 'Joining call...' : 'Connecting...'}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container}>
        {/* Video Call Content */}
        <View style={showChat ? styles.videoSectionWithChat : styles.videoSectionFullscreen}>
          <View style={{ flex: 1 }} key={`call-content-${participantCount}`}>
            <CallContent onHangupCallHandler={handleEndCall} />
          </View>

          {/* Timer Display - only show when session started */}
          {sessionStarted ? (
            <View style={styles.timerOverlay}>
              <View style={[styles.timerContainer, timeRemaining <= 30 && styles.timerWarning]}>
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.sessionStatusOverlay}>
              <View style={styles.sessionStatusContainer}>
                <Text style={styles.sessionStatusTitle}>Consultation Session</Text>
                <Text style={styles.sessionStatusText}>
                  {Object.keys(callParticipants).length < 2 
                    ? 'Waiting for other participant...'
                    : participantReady[user?.user?.id || ''] 
                      ? 'Waiting for other participant to be ready...'
                      : 'Ready to start consultation?'
                  }
                </Text>
                {Object.keys(callParticipants).length >= 2 && !participantReady[user?.user?.id || ''] && (
                  <TouchableOpacity style={styles.startSessionButton} onPress={handleStartSession}>
                    <Text style={styles.startSessionButtonText}>I&apos;m Ready</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Chat Toggle Button Overlay */}
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={[styles.controlButton, styles.chatToggleButton]}
              onPress={() => setShowChat(!showChat)}
            >
              <Text style={styles.controlButtonText}>{showChat ? '✕' : '💬'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Section */}
        {showChat && (
          <View style={styles.chatSection}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Live Chat</Text>
              <Text style={styles.participantCount}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <ScrollView
              style={styles.chatMessages}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {chatMessages.map((message) => (
                <View key={message.id} style={styles.messageContainer}>
                  <Text style={styles.messageSender}>
                    {message.user?.name || 'Unknown User'}
                  </Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>{message.timestamp.toLocaleTimeString()}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInput}>
              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendChatMessage}
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = () => {
  const { sessionId, callId, userId, userToken } = useLocalSearchParams<{
    sessionId: string
    callId: string
    userId: string
    userToken: string
  }>()

  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [call, setCall] = useState<Call | null>(null)

  useEffect(() => {
    if (!userId || !userToken || !callId) {
      Alert.alert('Error', 'Missing call parameters')
      return
    }

    const initializeCall = async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_GETSTREAM_API_KEY
        log.info('Initializing Stream Video client:', {
          apiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'MISSING',
          userId,
          hasToken: !!userToken,
        })

        if (!apiKey) {
          throw new Error('EXPO_PUBLIC_GETSTREAM_API_KEY is not configured')
        }

        // Initialize Stream Video client
        const videoClient = new StreamVideoClient({
          apiKey,
          user: { id: userId },
          token: userToken,
        })

        setClient(videoClient)

        // Create/join call
        const videoCall = videoClient.call('default', callId)
        setCall(videoCall)
      } catch (error) {
        log.error('Failed to initialize video call:', error)
        Alert.alert('Call Error', 'Failed to initialize video call')
      }
    }

    initializeCall()

    return () => {
      // Cleanup
      call?.leave()
      client?.disconnectUser()
    }
  }, [userId, userToken, callId])

  if (!client || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing call...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <VideoCallContent />
      </StreamCall>
    </StreamVideo>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '500',
  },
  videoSectionFullscreen: {
    flex: 1,
    position: 'relative',
  },
  videoSectionWithChat: {
    flex: 0.6,
    position: 'relative',
    minHeight: 250,
  },
  timerOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionStatusOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  sessionStatusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: 280,
  },
  sessionStatusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sessionStatusText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  startSessionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startSessionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButtonText: {
    fontSize: 20,
  },
  chatToggleButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  chatSection: {
    flex: 0.4,
    backgroundColor: '#fefefe',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    minHeight: 200,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  participantCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: '#60a5fa',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInput: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
    backgroundColor: '#fefefe',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})

export default VideoCallScreen
