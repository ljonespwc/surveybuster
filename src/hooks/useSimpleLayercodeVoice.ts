'use client'

import { useLayercodeAgent } from '@layercode/react-sdk'
import { useState, useRef, useEffect } from 'react'

interface UseSimpleLayercodeVoiceOptions {
  metadata?: Record<string, any>
  onDataMessage?: (data: any) => void
}

export function useLayercodeVoice(options: UseSimpleLayercodeVoiceOptions = {}) {
  const conversationIdRef = useRef<string | null>(null)
  const [conversationStarted, setConversationStarted] = useState(false)

  // Use Layercode agent hook with automatic VAD
  const {
    status,
    userAudioAmplitude,
    agentAudioAmplitude,
  } = useLayercodeAgent({
    agentId: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID!,
    authorizeSessionEndpoint: '/api/layercode/authorize',
    conversationId: conversationIdRef.current || undefined,
    metadata: options.metadata,
    onConnect: ({ conversationId }) => {
      console.log('Connected to Layercode agent:', conversationId)
      if (conversationId) {
        conversationIdRef.current = conversationId
        setConversationStarted(true)
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from Layercode agent')
      setConversationStarted(false)
    },
    onError: (error) => {
      console.error('Layercode error:', error)
    },
    onDataMessage: (data) => {
      // Pass through to parent component if handler provided
      if (options.onDataMessage) {
        options.onDataMessage(data)
      }
    }
  })

  return {
    // Connection state
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    connectionStatus: status,

    // Audio levels for visual feedback
    userAudioLevel: userAudioAmplitude,
    agentAudioLevel: agentAudioAmplitude,

    // Conversation state
    conversationStarted,
    conversationId: conversationIdRef.current,

    // Actions
    startNewConversation: () => {
      conversationIdRef.current = null
      setConversationStarted(false)
      // Will create new conversation on next connection
    }
  }
}