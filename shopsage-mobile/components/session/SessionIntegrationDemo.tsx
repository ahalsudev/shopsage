import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SessionCreationForm } from './SessionCreationForm'
import { SessionManagement } from './SessionManagement'
import { PLATFORM_CONFIG } from '../../constants/programs'

interface DemoExpert {
  id: string
  name: string
  specialization: string
  walletAddress: string
  sessionRate: number
  isOnline: boolean
}

// Sample experts (replace with real data)
const DEMO_EXPERTS: DemoExpert[] = [
  {
    id: 'expert-1',
    name: 'Dr. Sarah Wilson',
    specialization: 'Fashion Consultant',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    sessionRate: 0.05,
    isOnline: true
  },
  {
    id: 'expert-2', 
    name: 'Mike Chen',
    specialization: 'Tech Gadgets Expert',
    walletAddress: 'B8cjZt9QXvU4Gn5XnNp6W2tKzFqYrE8MhDs7L3vC9xAp',
    sessionRate: 0.08,
    isOnline: true
  },
  {
    id: 'expert-3',
    name: 'Lisa Rodriguez',
    specialization: 'Home Decor Specialist',
    walletAddress: 'F4pLmK9qRvS3Hn7YoNu5X1wJzGtPqC6ViEs8M2aD4yBs',
    sessionRate: 0.06,
    isOnline: false
  }
]

type DemoStep = 'select-expert' | 'create-session' | 'manage-session'

export function SessionIntegrationDemo() {
  const [currentStep, setCurrentStep] = useState<DemoStep>('select-expert')
  const [selectedExpert, setSelectedExpert] = useState<DemoExpert | null>(null)
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'expert' | 'shopper'>('shopper')

  const handleExpertSelect = (expert: DemoExpert) => {
    if (!expert.isOnline) {
      Alert.alert('Expert Offline', `${expert.name} is currently offline. Please try another expert.`)
      return
    }

    setSelectedExpert(expert)
    setCurrentStep('create-session')
  }

  const handleSessionCreated = (result: any) => {
    setCreatedSessionId(result.sessionId)
    setCurrentStep('manage-session')
  }

  const handleSessionComplete = () => {
    Alert.alert(
      'Session Complete! 🎉',
      'Thank you for using ShopSage. Your session has been completed successfully.',
      [
        {
          text: 'OK',
          onPress: () => {
            setCurrentStep('select-expert')
            setSelectedExpert(null)
            setCreatedSessionId(null)
          }
        }
      ]
    )
  }

  const handleSessionCancel = () => {
    setCurrentStep('select-expert')
    setSelectedExpert(null)
    setCreatedSessionId(null)
  }

  const resetDemo = () => {
    setCurrentStep('select-expert')
    setSelectedExpert(null)
    setCreatedSessionId(null)
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: '#007AFF',
        padding: 20,
        paddingTop: 50
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: 'bold', 
          color: 'white',
          marginBottom: 8
        }}>
          ShopSage Session Demo
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: 'white',
          opacity: 0.9,
          marginBottom: 12
        }}>
          Mobile Wallet Adapter + Solana Integration
        </Text>
        
        {/* Network Status */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: 12,
          borderRadius: 8
        }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            Network: {PLATFORM_CONFIG.NETWORK.toUpperCase()}
          </Text>
          <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>
            RPC: {PLATFORM_CONFIG.RPC_ENDPOINT}
          </Text>
        </View>
      </View>

      {/* Role Switcher */}
      <View style={{ 
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
          Demo as:
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: userRole === 'shopper' ? '#007AFF' : '#f0f0f0',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={() => setUserRole('shopper')}
          >
            <Text style={{ 
              color: userRole === 'shopper' ? 'white' : '#666',
              fontWeight: '600'
            }}>
              🛍️ Shopper
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: userRole === 'expert' ? '#007AFF' : '#f0f0f0',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={() => setUserRole('expert')}
          >
            <Text style={{ 
              color: userRole === 'expert' ? 'white' : '#666',
              fontWeight: '600'
            }}>
              👨‍💼 Expert
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step Indicator */}
      <View style={{ 
        flexDirection: 'row', 
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
      }}>
        {[
          { key: 'select-expert', label: '1. Select Expert', icon: '👤' },
          { key: 'create-session', label: '2. Create Session', icon: '📅' },
          { key: 'manage-session', label: '3. Manage Session', icon: '⚡' }
        ].map((step, index) => (
          <View key={step.key} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentStep === step.key ? '#007AFF' : 
                              ['select-expert', 'create-session', 'manage-session'].indexOf(currentStep) > index ? '#28a745' : '#ddd',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8
            }}>
              <Text style={{ 
                fontSize: 18,
                color: currentStep === step.key || ['select-expert', 'create-session', 'manage-session'].indexOf(currentStep) > index ? 'white' : '#666'
              }}>
                {step.icon}
              </Text>
            </View>
            <Text style={{ 
              fontSize: 12, 
              textAlign: 'center',
              color: currentStep === step.key ? '#007AFF' : '#666',
              fontWeight: currentStep === step.key ? '600' : 'normal'
            }}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Content */}
      <View style={{ backgroundColor: 'white' }}>
        {currentStep === 'select-expert' && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
              Choose an Expert
            </Text>
            {DEMO_EXPERTS.map((expert) => (
              <TouchableOpacity
                key={expert.id}
                style={{
                  borderWidth: 1,
                  borderColor: expert.isOnline ? '#ddd' : '#ccc',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  backgroundColor: expert.isOnline ? 'white' : '#f8f8f8',
                  opacity: expert.isOnline ? 1 : 0.6
                }}
                onPress={() => handleExpertSelect(expert)}
                disabled={!expert.isOnline}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
                      {expert.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                      {expert.specialization}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#007AFF' }}>
                      {expert.sessionRate} SOL
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: expert.isOnline ? '#28a745' : '#dc3545',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                        {expert.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentStep === 'create-session' && selectedExpert && (
          <SessionCreationForm
            expertId={selectedExpert.id}
            expertName={selectedExpert.name}
            expertSpecialization={selectedExpert.specialization}
            expertWalletAddress={selectedExpert.walletAddress}
            defaultSessionRate={selectedExpert.sessionRate}
            onSessionCreated={handleSessionCreated}
            onCancel={() => setCurrentStep('select-expert')}
          />
        )}

        {currentStep === 'manage-session' && createdSessionId && (
          <SessionManagement
            sessionId={createdSessionId}
            userRole={userRole}
            onSessionComplete={handleSessionComplete}
            onSessionCancel={handleSessionCancel}
          />
        )}
      </View>

      {/* Reset Button */}
      <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#6c757d',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center'
          }}
          onPress={resetDemo}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            🔄 Reset Demo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Footer */}
      <View style={{ 
        padding: 20,
        backgroundColor: '#f8f9fa',
        margin: 20,
        borderRadius: 12
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
          🎯 What This Demo Shows:
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          • Complete Mobile Wallet Adapter integration
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          • Session creation with payment escrow on Solana
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          • Real-time blockchain state synchronization
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          • Platform fee distribution (80/20 split)
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          • Video call integration ready
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20 }}>
          • Hybrid blockchain + backend architecture
        </Text>
      </View>
    </ScrollView>
  )
}