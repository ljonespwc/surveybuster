'use client'

import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

interface WidgetButtonProps {
  onClick: () => void
}

export default function WidgetButton({ onClick }: WidgetButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-huberman-secondary hover:bg-huberman-accent transition-colors rounded-full p-4 shadow-lg"
      aria-label="Open voice assistant"
    >
      <Mic className="w-6 h-6 text-white" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-huberman-accent rounded-full animate-pulse-slow" />
    </motion.button>
  )
}