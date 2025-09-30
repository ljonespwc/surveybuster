'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import to prevent SSR issues
const VoiceWidget = dynamic(() => import('@/components/widget/VoiceWidget'), {
  ssr: false
})

export default function WidgetPage() {
  useEffect(() => {
    // Send resize message to parent when modal opens/closes
    const sendResize = (open: boolean) => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'resize',
          width: open ? 400 : 80,
          height: open ? 500 : 80
        }, '*')
      }
    }

    // Listen for widget state changes
    (window as any).onWidgetStateChange = sendResize

    return () => {
      delete (window as any).onWidgetStateChange
    }
  }, [])

  return (
    <div className="w-full h-screen bg-transparent">
      <VoiceWidget embedded={true} />
    </div>
  )
}