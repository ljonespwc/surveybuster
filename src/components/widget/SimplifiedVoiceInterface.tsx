'use client'

import { useState, useEffect } from 'react'
import { Mic, Volume2, Loader2, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayercodeVoice } from '@/hooks/useSimpleLayercodeVoice'
import type { ExtractedLink, URLExtractionResult } from '@/lib/url-extractor'

interface SimplifiedVoiceInterfaceProps {
  onClose: () => void
}

export default function SimplifiedVoiceInterface({ onClose }: SimplifiedVoiceInterfaceProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [hasHadFirstInteraction, setHasHadFirstInteraction] = useState(false)
  const [currentURLs, setCurrentURLs] = useState<URLExtractionResult | null>(null)
  const [showURLs, setShowURLs] = useState(false)

  const {
    isConnected,
    isConnecting,
    connectionStatus,
    userAudioLevel,
    agentAudioLevel,
    startNewConversation
  } = useLayercodeVoice({
    metadata: {
      source: 'huberman-lab-widget',
      timestamp: new Date().toISOString()
    },
    onDataMessage: (data) => {
      // The data comes wrapped in {type: 'response.data', content: {...}}
      if (data?.type === 'response.data' && data.content?.urls) {
        const urlData = data.content.urls
        if (urlData?.hasLinks) {
          setCurrentURLs(urlData)
          setShowURLs(true)
        }
      } else if (data?.urls) {
        // Try direct access in case structure is different
        if (data.urls.hasLinks) {
          setCurrentURLs(data.urls)
          setShowURLs(true)
        }
      }
    }
  })

  // Auto-start conversation when connected
  useEffect(() => {
    if (isConnected && !hasStarted) {
      setHasStarted(true)
      // Conversation starts automatically - user can just speak
    }
  }, [isConnected, hasStarted])

  // Handle end conversation
  const handleEndConversation = () => {
    startNewConversation()
    onClose()
  }

  // Removed amplitude logging - was too noisy

  // Determine current state
  // Lower threshold for user speaking detection (was 0.1, now 0.01)
  const isSpeaking = userAudioLevel > 0.01
  const isListening = agentAudioLevel > 0.05  // Keep agent threshold slightly higher
  const isActive = hasStarted && isConnected

  // Track first interaction
  useEffect(() => {
    if ((isSpeaking || isListening) && !hasHadFirstInteraction) {
      setHasHadFirstInteraction(true)
    }
  }, [isSpeaking, isListening, hasHadFirstInteraction])

  // Hide URLs when agent stops speaking
  useEffect(() => {
    if (!isListening && showURLs) {
      // Keep URLs visible for a moment after speaking stops
      const timer = setTimeout(() => {
        setShowURLs(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isListening, showURLs])

  // Removed debug logging

  // Get button color based on state
  const getButtonColor = () => {
    if (!isConnected) return 'bg-gray-400'
    if (isSpeaking) return 'bg-green-500'
    if (isListening) return 'bg-huberman-secondary'
    return 'bg-huberman-secondary hover:bg-huberman-accent'
  }

  // Get status text - only three states, no bouncing
  const getStatusText = () => {
    if (!isConnected) return 'Connecting...'
    if (!hasStarted) return 'Click to start conversation'

    // During conversation - only show these two states
    if (isSpeaking) return 'Listening to you...'
    if (isListening) return 'Speaking...'

    // Initial state only (before first interaction)
    if (!hasHadFirstInteraction) return 'Ask me anything'

    // After interaction has happened, show nothing during silence
    return ' '  // Space to maintain layout
  }

  // Pass connection status to parent
  useEffect(() => {
    if (window && (window as any).updateConnectionStatus) {
      (window as any).updateConnectionStatus(isConnected)
    }
  }, [isConnected])

  return (
    <div className="relative p-6 space-y-4">

      {/* Main Interface */}
      <div className="flex flex-col items-center space-y-4">
        {/* Voice Button */}
        <motion.button
          onClick={() => {
            if (!hasStarted && isConnected) {
              setHasStarted(true)
            }
          }}
          disabled={!isConnected || (hasStarted && isActive)}
          className={`relative p-8 rounded-full transition-all ${getButtonColor()} ${
            !isConnected ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          whileTap={!hasStarted ? { scale: 0.95 } : {}}
        >
          {/* Icon */}
          {isConnecting ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isListening ? (
            <Volume2 className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}

          {/* Pulse effect when active */}
          <AnimatePresence>
            {(isSpeaking || isListening) && (
              <motion.span
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.5, 0.3, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className={`absolute inset-0 rounded-full ${
                  isSpeaking ? 'bg-green-400' : 'bg-huberman-secondary'
                }`}
              />
            )}
          </AnimatePresence>

        </motion.button>

        {/* Status Text - Fixed height container */}
        <div className="h-5 flex items-center justify-center">
          <motion.p
            className="text-sm text-gray-600 dark:text-gray-400 text-center"
            key={getStatusText()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {getStatusText()}
          </motion.p>
        </div>

        {/* URL Display Area */}
        <div className="min-h-[32px] flex items-center justify-center">
          <AnimatePresence>
            {showURLs && currentURLs?.hasLinks && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="space-y-1 text-center"
              >
                {currentURLs.links.map((link, index) => (
                  <div key={index} className="text-xs text-gray-500 dark:text-gray-400 max-w-full px-4">
                    {link.type === 'url' ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-huberman-secondary transition-colors underline break-all"
                      >
                        {link.text}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">
                        {link.text}
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}