'use client'

import { useState, useEffect } from 'react'
import { Mic, Volume2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayercodeVoice } from '@/hooks/useSimpleLayercodeVoice'

interface SimplifiedVoiceInterfaceProps {
  onClose: () => void
}

interface ProgressData {
  current: number
  total: number
}

export default function SimplifiedVoiceInterface({ onClose }: SimplifiedVoiceInterfaceProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [hasHadFirstInteraction, setHasHadFirstInteraction] = useState(false)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const {
    isConnected,
    isConnecting,
    connectionStatus,
    userAudioLevel,
    agentAudioLevel,
    startNewConversation
  } = useLayercodeVoice({
    metadata: {
      source: 'surveybuster-widget',
      timestamp: new Date().toISOString()
    },
    onDataMessage: (data) => {
      // Handle progress updates from webhook
      if (data?.type === 'progress') {
        setProgress({
          current: data.current,
          total: data.total
        })
      } else if (data?.type === 'complete') {
        setIsComplete(true)
        // Auto-close after completion message
        setTimeout(() => {
          onClose()
        }, 3000)
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

  // Get button color based on state
  const getButtonColor = () => {
    if (!isConnected) return 'bg-gray-400'
    if (isSpeaking) return 'bg-green-500'
    if (isListening) return 'bg-huberman-secondary'
    return 'bg-huberman-secondary hover:bg-huberman-accent'
  }

  // Get status text
  const getStatusText = () => {
    if (!isConnected) return 'Connecting...'
    if (!hasStarted) return 'Click to start'
    if (isComplete) return 'Thank you for your feedback!'

    // During conversation
    if (isSpeaking) return 'Listening to you...'
    if (isListening) return 'Speaking...'

    // Initial state
    if (!hasHadFirstInteraction) return 'Share your thoughts'

    // After interaction
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

        {/* Progress Display Area */}
        <div className="min-h-[40px] w-full max-w-xs flex items-center justify-center px-4">
          <AnimatePresence>
            {progress && !isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                  <motion.div
                    className="bg-huberman-secondary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(progress.current / progress.total) * 100}%`
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                {/* Progress Text */}
                <p className="text-xs text-gray-500 text-center">
                  Question {progress.current} of {progress.total}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}