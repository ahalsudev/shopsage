import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useIntegratedSession, useSessionMonitor } from '../../hooks/useIntegratedSession'
import { SessionState } from '../../services/sessionStateSyncService'

interface SessionManagementProps {
  sessionId: string
  userRole: 'expert' | 'shopper'
  onSessionComplete?: () => void
  onSessionCancel?: () => void
}

export function SessionManagement({
  sessionId,
  userRole,
  onSessionComplete,
  onSessionCancel
}: SessionManagementProps) {
  const [sessionDetails, setSessionDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Integrated session management
  const {
    isStarting,
    isEnding,
    isCancelling,
    actionError,
    videoCallReady,
    startSession,
    endSession,
    cancelSession,
    getSessionDetails,
    clearError
  } = useIntegratedSession()

  // Session state monitoring
  const { sessionState, isMonitoring } = useSessionMonitor(sessionId)

  // Load session details
  useEffect(() => {
    const loadDetails = async () => {
      setLoadingDetails(true)
      try {
        const details = await getSessionDetails(sessionId)
        setSessionDetails(details)
      } catch (error) {
        console.error('Failed to load session details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    loadDetails()
  }, [sessionId, getSessionDetails])

  // Handle start session (expert only)
  const handleStartSession = async () => {
    Alert.alert(
      'Start Session',
      'This will activate the session and allow the video call to begin. Are you ready?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Start Session',
          style: 'default',
          onPress: async () => {
            const success = await startSession(sessionId)
            if (success) {
              Alert.alert('Session Started! 🎉', 'The session is now active and ready for video call.')
            }
          }
        }
      ]
    )
  }

  // Handle end session (expert only)
  const handleEndSession = async () => {
    Alert.alert(
      'End Session',
      'This will complete the session and release payment to you. Are you sure?',
      [
        { text: 'Continue Session', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            const success = await endSession(sessionId)
            if (success) {
              Alert.alert(
                'Session Completed! ✅',
                'The session has been completed and payment has been processed.',
                [{ text: 'OK', onPress: onSessionComplete }]
              )
            }
          }
        }
      ]
    )
  }

  // Handle cancel session
  const handleCancelSession = async () => {
    const title = userRole === 'expert' ? 'Cancel Session' : 'Cancel Session'
    const message = userRole === 'expert' 
      ? 'This will cancel the session and refund the shopper. Continue?'
      : 'This will cancel the session and you will receive a refund. Continue?'

    Alert.alert(
      title,
      message,
      [
        { text: 'Keep Session', style: 'cancel' },
        {
          text: 'Cancel Session',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelSession(sessionId)
            if (success) {
              Alert.alert(
                'Session Cancelled',
                'The session has been cancelled and refund has been processed.',
                [{ text: 'OK', onPress: onSessionCancel }]
              )
            }
          }
        }
      ]
    )
  }

  // Show error alert
  React.useEffect(() => {
    if (actionError) {
      Alert.alert('Error', actionError)
      clearError()
    }
  }, [actionError, clearError])

  if (loadingDetails) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, fontSize: 16 }}>Loading session...</Text>
      </View>
    )
  }

  return (
    <View style={{ padding: 20, backgroundColor: 'white' }}>
      {/* Session Info */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Session Management
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 4 }}>
          ID: {sessionId}
        </Text>
        <Text style={{ fontSize: 16, color: '#666' }}>
          Role: {userRole === 'expert' ? 'Expert' : 'Shopper'}
        </Text>
      </View>

      {/* Session State */}
      {sessionState && (
        <View style={{ 
          backgroundColor: getStatusColor(sessionState.status), 
          padding: 16,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'white', marginBottom: 8 }}>
            Status: {sessionState.status.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: 'white', opacity: 0.9 }}>Blockchain:</Text>
            <Text style={{ color: 'white', fontWeight: '500' }}>
              {sessionState.blockchainConfirmed ? '✅ Confirmed' : '⏳ Pending'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: 'white', opacity: 0.9 }}>Backend:</Text>
            <Text style={{ color: 'white', fontWeight: '500' }}>
              {sessionState.backendSynced ? '✅ Synced' : '⏳ Syncing'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: 'white', opacity: 0.9 }}>Monitoring:</Text>
            <Text style={{ color: 'white', fontWeight: '500' }}>
              {isMonitoring ? '👁️ Active' : '❌ Inactive'}
            </Text>
          </View>
        </View>
      )}

      {/* Video Call Status */}
      <View style={{ 
        backgroundColor: videoCallReady ? '#e8f5e8' : '#f0f0f0',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Video Call Status
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: videoCallReady ? '#2d5a2d' : '#666'
        }}>
          {videoCallReady ? '📹 Ready for video call' : '⏳ Video call not ready'}
        </Text>
      </View>

      {/* Session Details */}
      {sessionDetails && (
        <View style={{ 
          backgroundColor: '#f8f8f8',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Session Details
          </Text>
          {sessionDetails.backendData && (
            <>
              <DetailRow 
                label="Expert" 
                value={sessionDetails.backendData.expertName || 'Unknown'} 
              />
              <DetailRow 
                label="Specialization" 
                value={sessionDetails.backendData.expertSpecialization || 'Unknown'} 
              />
              <DetailRow 
                label="Amount" 
                value={`${sessionDetails.backendData.amount} SOL`} 
              />
              <DetailRow 
                label="Start Time" 
                value={new Date(sessionDetails.backendData.startTime).toLocaleString()} 
              />
            </>
          )}
          {sessionDetails.conflicts.length > 0 && (
            <View style={{ marginTop: 12, padding: 8, backgroundColor: '#fff3cd', borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#856404' }}>
                ⚠️ Conflicts Detected:
              </Text>
              {sessionDetails.conflicts.map((conflict, index) => (
                <Text key={index} style={{ fontSize: 12, color: '#856404', marginTop: 4 }}>
                  • {conflict}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ gap: 12 }}>
        {/* Expert Actions */}
        {userRole === 'expert' && sessionState?.status === 'pending' && (
          <TouchableOpacity
            style={{
              backgroundColor: isStarting ? '#ccc' : '#28a745',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            onPress={handleStartSession}
            disabled={isStarting}
          >
            {isStarting && (
              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
            )}
            <Text style={{ 
              fontSize: 16, 
              color: 'white', 
              fontWeight: '600' 
            }}>
              {isStarting ? 'Starting Session...' : 'Start Session'}
            </Text>
          </TouchableOpacity>
        )}

        {userRole === 'expert' && sessionState?.status === 'active' && (
          <TouchableOpacity
            style={{
              backgroundColor: isEnding ? '#ccc' : '#dc3545',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            onPress={handleEndSession}
            disabled={isEnding}
          >
            {isEnding && (
              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
            )}
            <Text style={{ 
              fontSize: 16, 
              color: 'white', 
              fontWeight: '600' 
            }}>
              {isEnding ? 'Ending Session...' : 'End Session'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button (both roles, only if not completed) */}
        {sessionState?.status !== 'completed' && sessionState?.status !== 'cancelled' && (
          <TouchableOpacity
            style={{
              backgroundColor: isCancelling ? '#ccc' : '#6c757d',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            onPress={handleCancelSession}
            disabled={isCancelling}
          >
            {isCancelling && (
              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
            )}
            <Text style={{ 
              fontSize: 16, 
              color: 'white', 
              fontWeight: '600' 
            }}>
              {isCancelling ? 'Cancelling...' : 'Cancel Session'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// Helper components
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontSize: 14, color: '#666' }}>{label}:</Text>
      <Text style={{ fontSize: 14, fontWeight: '500' }}>{value}</Text>
    </View>
  )
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#ffc107'
    case 'active':
      return '#28a745'
    case 'completed':
      return '#007bff'
    case 'cancelled':
      return '#dc3545'
    default:
      return '#6c757d'
  }
}