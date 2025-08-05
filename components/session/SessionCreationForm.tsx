import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useIntegratedSession } from '../../hooks/useIntegratedSession'
import { SessionCreationRequest } from '../../services/integratedSessionService'
import { PLATFORM_CONFIG } from '../../constants/programs'

interface SessionCreationFormProps {
  expertId: string
  expertName: string
  expertSpecialization: string
  expertWalletAddress: string
  defaultSessionRate: number
  onSessionCreated?: (result: any) => void
  onCancel?: () => void
}

export function SessionCreationForm({
  expertId,
  expertName,
  expertSpecialization,
  expertWalletAddress,
  defaultSessionRate,
  onSessionCreated,
  onCancel
}: SessionCreationFormProps) {
  // Form state
  const [sessionRate, setSessionRate] = useState(defaultSessionRate.toString())
  const [duration, setDuration] = useState('30')
  const [shopperNote, setShopperNote] = useState('')
  const [startTime, setStartTime] = useState(new Date().toISOString())

  // Integrated session hook
  const {
    isCreating,
    createError,
    actionError,
    currentSession,
    sessionState,
    videoCallReady,
    createSession,
    clearError
  } = useIntegratedSession()

  // Handle session creation
  const handleCreateSession = async () => {
    clearError()

    // Validate inputs
    const rate = parseFloat(sessionRate)
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Session Rate', 'Please enter a valid session rate in SOL')
      return
    }

    const durationMinutes = parseInt(duration)
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes')
      return
    }

    // Confirm session creation
    Alert.alert(
      'Create Session',
      `Create a ${durationMinutes}-minute consultation with ${expertName} for ${rate} SOL?\n\nThis will:\n• Connect your wallet\n• Create session on blockchain\n• Set up video call\n• Reserve payment in escrow\n\nNetwork: ${PLATFORM_CONFIG.NETWORK}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Session',
          style: 'default',
          onPress: async () => {
            const request: SessionCreationRequest = {
              expertId,
              expertWalletAddress,
              expertName,
              expertSpecialization,
              sessionRate: rate,
              startTime,
              duration: durationMinutes,
              shopperNote: shopperNote.trim() || undefined
            }

            const result = await createSession(request)
            
            if (result && result.success) {
              Alert.alert(
                'Session Created! 🎉',
                `Session ID: ${result.sessionId}\n\nTransaction: ${result.signature}\n\n${result.videoCallId ? 'Video call ready!' : 'Video call will be set up when session starts'}\n\n${result.errors.length > 0 ? `Warnings: ${result.errors.join(', ')}` : ''}`,
                [
                  {
                    text: 'OK',
                    onPress: () => onSessionCreated?.(result)
                  }
                ]
              )
            }
          }
        }
      ]
    )
  }

  // Show error alert
  React.useEffect(() => {
    if (createError || actionError) {
      Alert.alert('Error', createError || actionError || 'An error occurred')
    }
  }, [createError, actionError])

  return (
    <View style={{ padding: 20, backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Book Session with {expertName}
      </Text>
      
      <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
        {expertSpecialization}
      </Text>

      {/* Session Rate */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Session Rate (SOL)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16
          }}
          value={sessionRate}
          onChangeText={setSessionRate}
          keyboardType="decimal-pad"
          placeholder="0.1"
        />
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Expert rate: {defaultSessionRate} SOL
        </Text>
      </View>

      {/* Duration */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Duration (minutes)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16
          }}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="30"
        />
      </View>

      {/* Shopper Note */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Note for Expert (optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            height: 80,
            textAlignVertical: 'top'
          }}
          value={shopperNote}
          onChangeText={setShopperNote}
          multiline
          placeholder="What would you like help with?"
        />
      </View>

      {/* Network Info */}
      <View style={{ 
        backgroundColor: '#f0f0f0', 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 20 
      }}>
        <Text style={{ fontSize: 14, color: '#666' }}>
          Network: {PLATFORM_CONFIG.NETWORK.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          Expert Wallet: {expertWalletAddress.slice(0, 8)}...{expertWalletAddress.slice(-8)}
        </Text>
      </View>

      {/* Session State Display */}
      {currentSession && (
        <View style={{ 
          backgroundColor: '#e8f5e8', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d5a2d' }}>
            Session Created ✅
          </Text>
          <Text style={{ fontSize: 14, color: '#2d5a2d' }}>
            ID: {currentSession.sessionId}
          </Text>
          {sessionState && (
            <Text style={{ fontSize: 14, color: '#2d5a2d' }}>
              Status: {sessionState.status}
            </Text>
          )}
          {videoCallReady && (
            <Text style={{ fontSize: 14, color: '#2d5a2d' }}>
              Video Call Ready 📹
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {onCancel && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#f0f0f0',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={onCancel}
            disabled={isCreating}
          >
            <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            flex: 2,
            backgroundColor: isCreating ? '#ccc' : '#007AFF',
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center'
          }}
          onPress={handleCreateSession}
          disabled={isCreating || !!currentSession}
        >
          {isCreating && (
            <ActivityIndicator 
              size="small" 
              color="white" 
              style={{ marginRight: 8 }} 
            />
          )}
          <Text style={{ 
            fontSize: 16, 
            color: isCreating ? '#999' : 'white',
            fontWeight: '600'
          }}>
            {isCreating ? 'Creating Session...' : 
             currentSession ? 'Session Created' : 'Create Session'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cost Breakdown */}
      <View style={{ 
        marginTop: 20, 
        padding: 12, 
        backgroundColor: '#f8f8f8', 
        borderRadius: 8 
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
          Cost Breakdown
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14 }}>Session Fee:</Text>
          <Text style={{ fontSize: 14 }}>{sessionRate} SOL</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14 }}>Expert receives (80%):</Text>
          <Text style={{ fontSize: 14 }}>
            {(parseFloat(sessionRate || '0') * 0.8).toFixed(4)} SOL
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14 }}>Platform fee (20%):</Text>
          <Text style={{ fontSize: 14 }}>
            {(parseFloat(sessionRate || '0') * 0.2).toFixed(4)} SOL
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          Plus network transaction fees (~0.000005 SOL)
        </Text>
      </View>
    </View>
  )
}