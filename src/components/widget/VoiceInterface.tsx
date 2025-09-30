'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useVoice from '@/hooks/useVoice'
import useChat from '@/hooks/useChat'

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { startRecording, stopRecording, isRecording } = useVoice({
    onTranscript: setTranscript,
    onError: setError,
  })

  const { sendMessage } = useChat({
    onResponse: setResponse,
    onError: setError,
  })

  const handleMicClick = async () => {
    if (isRecording) {
      const finalTranscript = await stopRecording()
      if (finalTranscript) {
        setIsProcessing(true)
        await sendMessage(finalTranscript)
        setIsProcessing(false)
      }
    } else {
      setError(null)
      setResponse('')
      startRecording()
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Voice Recording Button */}
      <div className="flex flex-col items-center space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleMicClick}
          disabled={isProcessing}
          className={`relative p-8 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-huberman-secondary hover:bg-huberman-accent'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}

          {isRecording && (
            <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
          )}
        </motion.button>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {isRecording
            ? 'Listening... Click to stop'
            : isProcessing
            ? 'Processing your question...'
            : 'Click to ask a question'}
        </p>
      </div>

      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              You asked:
            </p>
            <p className="text-gray-900 dark:text-white">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response Display */}
      <AnimatePresence>
        {response && (
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
                  {response}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                  Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Wave Animation */}
      {isRecording && (
        <div className="flex justify-center items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scaleY: [1, 1.5, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-1 h-8 bg-huberman-secondary rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  )
}