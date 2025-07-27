import { log } from '@/config/environment';
import { chatService, ChatMessage as PersistentChatMessage } from '@/services/chatService';
import { sessionService } from '@/services/sessionService';
import {
  Call,
  ParticipantView,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-native-sdk';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RTCView } from '@stream-io/react-native-webrtc';


const { width, height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  text: string;
  user: { name: string };
  timestamp: Date;
}

interface VideoCallScreenProps {}

const VideoCallContent: React.FC = () => {
  const call = useCall();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  
  const {
    useCallCallingState,
    useParticipantCount,
    useLocalParticipant,
    useRemoteParticipants,
    useCameraState,
    useMicrophoneState,
  } = useCallStateHooks();
  
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { camera, mediaStream } = useCameraState();
  const { microphone } = useMicrophoneState();
  
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  // Sync audio-only state with camera state
  useEffect(() => {
    if (camera) {
      setIsAudioOnly(!camera.enabled);
      log.info('Camera status:', camera.enabled ? 'enabled' : 'disabled', 'Audio-only:', !camera.enabled);
    }
  }, [camera]);

  // Debug participant information
  useEffect(() => {
    log.info('Participants debug:', {
      localParticipant: localParticipant ? {
        id: localParticipant.userId,
        name: localParticipant.name,
        hasVideo: localParticipant.videoStream?.active,
        hasAudio: localParticipant.audioStream?.active,
        isLocalParticipant: localParticipant.isLocalParticipant,
        videoTrack: !!localParticipant.videoStream,
        audioTrack: !!localParticipant.audioStream,
      } : null,
      remoteParticipants: remoteParticipants.map(p => ({
        id: p.userId,
        name: p.name,
        hasVideo: p.videoStream?.active,
        hasAudio: p.audioStream?.active,
        isLocalParticipant: p.isLocalParticipant,
        videoTrack: !!p.videoStream,
        audioTrack: !!p.audioStream,
      })),
      totalParticipants: participantCount,
    });
  }, [localParticipant, remoteParticipants, participantCount]);

  // Monitor video track changes and camera state
  useEffect(() => {
    if (localParticipant) {
      log.info('Local participant video status:', {
        hasVideo: localParticipant.videoStream?.active,
        hasVideoStream: !!localParticipant.videoStream,
        isLocalParticipant: localParticipant.isLocalParticipant,
        userId: localParticipant.userId,
        cameraStatus: camera?.enabled ? 'enabled' : 'disabled',
      });
    }
    
    // Enhanced camera state debugging
    if (camera) {
      const streamURL = mediaStream ? (() => {
        try {
          return mediaStream.toURL();
        } catch (e) {
          return `toURL() error: ${e.message}`;
        }
      })() : 'No stream';
      
      log.info('Camera state debug:', {
        enabled: camera.enabled,
        hasMediaStream: !!mediaStream,
        streamId: mediaStream?.id || 'No stream ID',
        streamURL: streamURL,
        videoTracks: mediaStream?.getVideoTracks()?.length || 0,
        audioTracks: mediaStream?.getAudioTracks()?.length || 0,
        videoTracksActive: mediaStream?.getVideoTracks()?.map(track => ({
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          kind: track.kind,
          label: track.label
        })) || [],
      });
    }
    
    if (remoteParticipants.length > 0) {
      log.info('Remote participant video status:', {
        hasVideo: remoteParticipants[0].videoStream?.active,
        hasVideoStream: !!remoteParticipants[0].videoStream,
        isLocalParticipant: remoteParticipants[0].isLocalParticipant,
        userId: remoteParticipants[0].userId,
        participantCount: remoteParticipants.length,
      });
      
      // Log all remote participants if there are multiple
      if (remoteParticipants.length > 1) {
        log.info('All remote participants:', remoteParticipants.map(p => ({
          userId: p.userId,
          hasVideo: p.videoStream?.active,
          isLocal: p.isLocalParticipant,
        })));
      }
    } else {
      log.info('No remote participants found');
    }
  }, [localParticipant?.videoStream, localParticipant?.videoStream?.active, remoteParticipants[0]?.videoStream, mediaStream]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    if (!call) return;

    // Join the call and initialize media
    const initializeCall = async () => {
      try {
        await call.join({ create: true });
        log.info('Successfully joined call');
        
        // Enable camera and microphone after joining - with better error handling
        try {
          log.info('Attempting to enable camera...');
          await call.camera.enable();
          log.info('Camera enabled successfully');
          
          log.info('Attempting to enable microphone...');
          await call.microphone.enable();
          log.info('Microphone enabled successfully');
          
          // Wait a bit for streams to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          log.info('Media initialization complete');
        } catch (mediaError) {
          log.warn('Failed to enable camera/microphone:', {
            error: mediaError.message || mediaError,
            name: mediaError.name,
            code: mediaError.code
          });
          // If camera fails, try audio-only mode
          try {
            await call.microphone.enable();
            setIsAudioOnly(true);
            log.info('Fallback to audio-only mode');
          } catch (audioError) {
            log.error('Failed to enable audio:', {
              error: audioError.message || audioError,
              name: audioError.name,
              code: audioError.code
            });
          }
        }
      } catch (error) {
        log.error('Failed to join call:', error);
        Alert.alert('Call Error', 'Failed to join the call');
      }
    };
    
    initializeCall();

    // Load existing chat messages for this session
    const loadExistingMessages = async () => {
      if (sessionId) {
        try {
          const existingMessages = await chatService.getMessages(sessionId);
          // Convert persistent messages to display format
          const displayMessages: ChatMessage[] = existingMessages.map(msg => ({
            id: msg.id,
            text: msg.text,
            user: msg.user,
            timestamp: msg.timestamp,
          }));
          setChatMessages(displayMessages);
        } catch (error) {
          log.error('Failed to load existing chat messages:', error);
        }
      }
    };

    loadExistingMessages();

    // Set up chat message listener
    const unsubscribe = call.on('call.reaction_new', (event) => {
      if (event.reaction?.type === 'chat_message') {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: event.reaction.custom?.message || '',
          user: event.user,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, newMessage]);

        // Save message to persistent storage
        if (sessionId && call) {
          const persistentMessage: PersistentChatMessage = {
            id: newMessage.id,
            text: newMessage.text,
            user: {
              id: event.user?.id || 'unknown',
              name: event.user?.name || 'Unknown User',
            },
            timestamp: newMessage.timestamp,
            sessionId: sessionId,
            callId: call.id,
          };
          
          chatService.saveMessage(persistentMessage).catch(error => {
            log.error('Failed to save chat message:', error);
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call, sessionId]);

  const handleEndCall = async () => {
    try {
      await call?.leave();
      
      // Update session status
      if (sessionId) {
        await sessionService.completeSession(sessionId);
      }
      
      router.back();
    } catch (error) {
      log.error('Failed to end call:', error);
      router.back();
    }
  };

  const toggleAudio = async () => {
    try {
      await call?.microphone.toggle();
    } catch (error) {
      log.error('Failed to toggle audio:', error);
    }
  };

  const toggleVideo = async () => {
    try {
      if (isAudioOnly) {
        await call?.camera.enable();
        setIsAudioOnly(false);
        log.info('Video enabled');
      } else {
        await call?.camera.disable();
        setIsAudioOnly(true);
        log.info('Video disabled');
      }
    } catch (error) {
      log.error('Failed to toggle video:', error);
    }
  };

  // Monitor for video track conflicts but don't auto-refresh
  useEffect(() => {
    if (remoteParticipants.length > 0 && localParticipant) {
      const hasRemoteVideo = remoteParticipants[0].videoStream?.active;
      const hasLocalVideo = localParticipant.videoStream?.active;
      
      if (hasRemoteVideo && hasLocalVideo) {
        log.info('Both participants have video enabled - monitoring for conflicts');
      }
    }
  }, [remoteParticipants.length, remoteParticipants[0]?.videoStream?.active]);

  const sendChatMessage = async () => {
    if (!messageText.trim() || !call) return;

    try {
      await call.sendReaction({
        type: 'chat_message',
        custom: { message: messageText.trim() },
      });
      
      setMessageText('');
    } catch (error) {
      log.error('Failed to send chat message:', error);
    }
  };

  const renderVideoFeeds = () => {
    if (isAudioOnly) {
      return (
        <View style={styles.audioOnlyContainer}>
          <View style={styles.audioParticipant}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {localParticipant?.name?.charAt(0) || 'L'}
              </Text>
            </View>
            <Text style={styles.participantName}>You</Text>
          </View>
          
          {remoteParticipants.map((participant) => (
            <View key={participant.sessionId} style={styles.audioParticipant}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {participant.name?.charAt(0) || 'R'}
                </Text>
              </View>
              <Text style={styles.participantName}>{participant.name}</Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.videoContainer}>
        {/* Remote participant video - Simplified approach */}
        {remoteParticipants.length > 0 ? (
          <View style={styles.remoteVideo}>
            <ParticipantView participant={remoteParticipants[0]} />
            <Text style={styles.debugText}>
              Remote: {remoteParticipants[0].userId?.slice(-4)} - {remoteParticipants[0].videoStream ? '✓' : '✗'}
            </Text>
          </View>
        ) : (
          <View style={[styles.remoteVideo, styles.waitingContainer]}>
            <Text style={styles.waitingText}>Waiting for other participant...</Text>
          </View>
        )}
        
        {/* Local participant video - Simplified approach */}
        {localParticipant && (
          <View style={styles.localVideo}>
            <ParticipantView participant={localParticipant} />
            <Text style={styles.debugText}>
              Local: {localParticipant.userId?.slice(-4)} - {localParticipant.videoStream ? '✓' : '✗'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (callingState !== 'joined') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {callingState === 'joining' ? 'Joining call...' : 'Connecting...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Feeds - Top Half */}
      <View style={styles.videoSection}>
        {renderVideoFeeds()}
        
        {/* Call Controls Overlay */}
        <View style={styles.controlsOverlay}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
            <Text style={styles.controlButtonText}>
              {microphone?.enabled ? '🎤' : '🔇'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
            <Text style={styles.controlButtonText}>
              {camera?.enabled ? '📷' : '📹'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, styles.chatToggleButton]} 
            onPress={() => setShowChat(!showChat)}
          >
            <Text style={styles.controlButtonText}>💬</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, styles.endCallButton]} 
            onPress={handleEndCall}
          >
            <Text style={styles.controlButtonText}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Section - Bottom Half */}
      {showChat && (
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Live Chat</Text>
            <Text style={styles.participantCount}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <ScrollView style={styles.chatMessages}>
            {chatMessages.map((message) => (
              <View key={message.id} style={styles.messageContainer}>
                <Text style={styles.messageSender}>{message.user?.name || 'Unknown'}</Text>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString()}
                </Text>
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
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const VideoCallScreen: React.FC<VideoCallScreenProps> = () => {
  const { sessionId, callId, userId, userToken } = useLocalSearchParams<{
    sessionId: string;
    callId: string;
    userId: string;
    userToken: string;
  }>();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  useEffect(() => {
    if (!userId || !userToken || !callId) {
      Alert.alert('Error', 'Missing call parameters');
      return;
    }

    const initializeCall = async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_GETSTREAM_API_KEY;
        log.info('Initializing Stream Video client:', {
          apiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'MISSING',
          userId,
          hasToken: !!userToken
        });
        
        if (!apiKey) {
          throw new Error('EXPO_PUBLIC_GETSTREAM_API_KEY is not configured');
        }
        
        // Initialize Stream Video client
        const videoClient = new StreamVideoClient({
          apiKey,
          user: { id: userId },
          token: userToken,
        });

        setClient(videoClient);

        // Create/join call
        const videoCall = videoClient.call('default', callId);
        setCall(videoCall);

      } catch (error) {
        log.error('Failed to initialize video call:', error);
        Alert.alert('Call Error', 'Failed to initialize video call');
      }
    };

    initializeCall();

    return () => {
      // Cleanup
      call?.leave();
      client?.disconnectUser();
    };
  }, [userId, userToken, callId]);

  if (!client || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <VideoCallContent />
      </StreamCall>
    </StreamVideo>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  videoSection: {
    flex: 1,
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  videoView: {
    flex: 1,
  },
  waitingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  audioOnlyContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 40,
  },
  audioParticipant: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  participantName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 20,
  },
  chatToggleButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
  },
  endCallButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  chatSection: {
    height: height * 0.4,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
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
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInput: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  debugText: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    fontSize: 10,
    padding: 2,
    borderRadius: 2,
  },
});

export default VideoCallScreen;
