'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { X, Wifi, WifiOff } from 'lucide-react'

// Dynamically import to prevent SSR issues with Layercode SDK
const SimplifiedVoiceInterface = dynamic(
  () => import('./SimplifiedVoiceInterface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-huberman-secondary"></div>
      </div>
    )
  }
)

interface WidgetModalProps {
  onClose: () => void
}

export default function WidgetModal({ onClose }: WidgetModalProps) {
  const [isConnected, setIsConnected] = useState(false)

  // Listen for connection status updates
  useEffect(() => {
    (window as any).updateConnectionStatus = setIsConnected
    return () => {
      delete (window as any).updateConnectionStatus
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-huberman-dark rounded-2xl shadow-2xl w-full max-w-md min-w-[400px] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {/* WiFi indicator on the left */}
          <div className="w-8 flex items-center">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Title in center */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Huberman Lab Assistant
          </h2>

          {/* Close button on the right */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <SimplifiedVoiceInterface onClose={onClose} />
      </motion.div>
    </motion.div>
  )
}