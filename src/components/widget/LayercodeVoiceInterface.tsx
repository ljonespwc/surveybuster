'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, Loader2, AlertCircle, WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayercodeVoice } from '@/hooks/useLayercodeVoice'

export default function LayercodeVoiceInterface() {
  const {
    messages,
    isRecording,
    isProcessing,
    isConnected,
    isConnecting,
    connectionStatus,
    userAudioLevel,
    agentAudioLevel,
    startRecording,
    stopRecording,
    clearMessages,
    startNewConversation
  } = useLayercodeVoice({
    metadata: {
      source: 'huberman-lab-widget',
      timestamp: new Date().toISOString()
    },
    onDataMessage: (data) => {
      console.log('Widget received data:', data)
    }
  })

  // Get the latest message for display
  const latestUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]
  const latestAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0]

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Auto-connect status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection error'
      case 'initializing': return 'Initializing...'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className={`w-4 h-4 ${getConnectionStatusColor()}`} />
          ) : (
            <WifiOff className={`w-4 h-4 ${getConnectionStatusColor()}`} />
          )}
          <span className={`text-xs ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNewConversation}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            New conversation
          </button>
        )}
      </div>

      {/* Voice Recording Button */}
      <div className="flex flex-col items-center space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMicClick}
          disabled={!isConnected || isProcessing}
          className={`relative p-8 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-huberman-secondary hover:bg-huberman-accent'
          } ${(!isConnected || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}

          {/* Pulse animation when recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
          )}

          {/* Audio level indicator */}
          {isRecording && userAudioLevel > 0 && (
            <motion.span
              className="absolute inset-0 rounded-full bg-red-400 opacity-30"
              animate={{
                scale: 1 + userAudioLevel * 0.5
              }}
              transition={{ duration: 0.1 }}
            />
          )}
        </motion.button>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {!isConnected
            ? 'Connecting to voice service...'
            : isRecording
            ? 'Listening... Click to stop'
            : isProcessing
            ? 'Processing your question...'
            : 'Click to ask a question'}
        </p>
      </div>

      {/* User Message Display */}
      <AnimatePresence>
        {latestUserMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              You asked:
            </p>
            <p className="text-gray-900 dark:text-white">{latestUserMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Response Display */}
      <AnimatePresence>
        {latestAssistantMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-huberman-light dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <Volume2 className="w-5 h-5 text-huberman-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Answer:
                </p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {latestAssistantMessage.text}
                </p>
              </div>
            </div>

            {/* Audio level indicator for agent speech */}
            {agentAudioLevel > 0 && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs text-gray-500">Speaking</span>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-huberman-secondary"
                    animate={{ width: `${agentAudioLevel * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Wave Animation */}
      {(isRecording || agentAudioLevel > 0) && (
        <div className="flex justify-center items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scaleY: isRecording
                  ? [1, 1 + userAudioLevel * 2, 1]
                  : [1, 1 + agentAudioLevel * 2, 1],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.05,
              }}
              className={`w-1 h-8 ${
                isRecording ? 'bg-red-500' : 'bg-huberman-secondary'
              } rounded-full`}
            />
          ))}
        </div>
      )}

      {/* Conversation History (optional, collapsed by default) */}
      {messages.length > 2 && (
        <details className="text-xs text-gray-500 dark:text-gray-400">
          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
            Show conversation history ({messages.length} messages)
          </summary>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded text-xs ${
                  msg.role === 'user'
                    ? 'bg-gray-100 dark:bg-gray-800 ml-4'
                    : 'bg-blue-50 dark:bg-blue-900/20 mr-4'
                }`}
              >
                <span className="font-medium">
                  {msg.role === 'user' ? 'You: ' : 'Assistant: '}
                </span>
                {msg.text}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}