'use client'

import { useState, useCallback } from 'react'

interface UseChatOptions {
  onResponse?: (response: string) => void
  onError?: (error: string) => void
}

export default function useChat({ onResponse, onError }: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: message }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      onResponse?.(data.response)

      // If it's a FAQ match with high confidence, also play the audio
      if (data.type === 'faq' && data.confidence > 0.8) {
        // Use text-to-speech for the response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.response)
          window.speechSynthesis.speak(utterance)
        }
      }

      return data
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = 'Sorry, I couldn\'t process your question. Please try again.'
      onError?.(errorMessage)
      return { response: errorMessage, type: 'error' }
    } finally {
      setIsLoading(false)
    }
  }, [onResponse, onError])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  }
}