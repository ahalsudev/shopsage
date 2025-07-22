import { useCustomAlert } from '@/components/CustomAlert';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const VideoCallScreen: React.FC = () => {
  const { sessionId, expertId } = useLocalSearchParams();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [isConnected, setIsConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isConnected && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isConnected, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    showAlert(
      'End Call',
      'Are you sure you want to end this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Area */}
      <View style={styles.videoContainer}>
        {!isConnected ? (
          <View style={styles.connectingContainer}>
            <Text style={styles.connectingText}>Connecting...</Text>
            <Text style={styles.connectingSubtext}>Please wait while we connect you to the expert</Text>
          </View>
        ) : (
          <>
            {/* Main Video (Expert) */}
            <View style={styles.mainVideo}>
              <Text style={styles.videoPlaceholder}>Expert Video</Text>
            </View>

            {/* Self Video (Small) */}
            <View style={styles.selfVideo}>
              <Text style={styles.videoPlaceholder}>You</Text>
            </View>
          </>
        )}
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.expertName}>Dr. Sarah Johnson</Text>
        <Text style={styles.callStatus}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </Text>
        {isConnected && (
          <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>
            {isMuted ? '🔇' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Text style={styles.controlIcon}>
            {isVideoOn ? '📹' : '📷'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Text style={styles.controlIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionText}>
          Session ID: {sessionId}
        </Text>
        <Text style={styles.sessionText}>
          Expert ID: {expertId}
        </Text>
      </View>
      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  connectingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  connectingSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  mainVideo: {
    flex: 1,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#4b5563',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  expertName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  callStatus: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 4,
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
  controlIcon: {
    fontSize: 24,
  },
  sessionInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  sessionText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default VideoCallScreen; 