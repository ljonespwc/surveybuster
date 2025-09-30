'use client'

import { useLayercodeAgent } from '@layercode/react-sdk'
import { useState, useCallback, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

interface UseLayercodeVoiceOptions {
  onDataMessage?: (data: any) => void
  metadata?: Record<string, any>
}

export function useLayercodeVoice(options: UseLayercodeVoiceOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const conversationIdRef = useRef<string | null>(null)

  // Use Layercode agent hook
  const {
    status,
    userAudioAmplitude,
    agentAudioAmplitude,
    triggerUserTurnStarted,
    triggerUserTurnFinished
  } = useLayercodeAgent({
    agentId: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID!,
    authorizeSessionEndpoint: '/api/layercode/authorize',
    conversationId: conversationIdRef.current || undefined,
    metadata: options.metadata,
    onConnect: ({ conversationId }) => {
      console.log('Connected to Layercode agent:', conversationId)
      if (conversationId) {
        conversationIdRef.current = conversationId
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from Layercode agent')
    },
    onError: (error) => {
      console.error('Layercode error:', error)
      setIsProcessing(false)
    },
    onDataMessage: (data) => {
      console.log('Received data from agent:', data)

      // Handle different data types
      if (data.type === 'faq_match') {
        // Add FAQ match as assistant message
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          text: data.answer,
          timestamp: Date.now()
        }])
      } else if (data.type === 'ai_response') {
        // AI response metadata (logging only)
        console.log('AI response generated:', data)
      }

      // Call custom data handler if provided
      if (options.onDataMessage) {
        options.onDataMessage(data)
      }

      setIsProcessing(false)
    }
  })

  // Handle recording state
  const [isRecording, setIsRecording] = useState(false)

  const startRecording = useCallback(() => {
    if (status !== 'connected') {
      console.error('Not connected to Layercode agent')
      return
    }

    setIsRecording(true)
    setCurrentTranscript('')
    triggerUserTurnStarted()
  }, [status, triggerUserTurnStarted])

  const stopRecording = useCallback(() => {
    if (!isRecording) return

    setIsRecording(false)
    setIsProcessing(true)
    triggerUserTurnFinished()

    // Add a placeholder user message (will be updated when we get transcript)
    if (currentTranscript) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        text: currentTranscript,
        timestamp: Date.now()
      }])
    }
  }, [isRecording, currentTranscript, triggerUserTurnFinished])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [isRecording, stopRecording])

  return {
    // State
    messages,
    isRecording,
    isProcessing,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    connectionStatus: status,
    userAudioLevel: userAudioAmplitude,
    agentAudioLevel: agentAudioAmplitude,

    // Actions
    startRecording,
    stopRecording,
    clearMessages: () => setMessages([]),

    // Conversation management
    conversationId: conversationIdRef.current,
    startNewConversation: () => {
      conversationIdRef.current = null
      setMessages([])
      // Will create new conversation on next connection
    }
  }
}