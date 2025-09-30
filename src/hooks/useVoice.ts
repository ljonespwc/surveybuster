'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceOptions {
  onTranscript?: (transcript: string) => void
  onError?: (error: string) => void
}

export default function useVoice({ onTranscript, onError }: UseVoiceOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Use Web Speech API for now (will be replaced with Layercode)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript)
        onTranscript?.(fullTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        onError?.(`Speech recognition error: ${event.error}`)
      }
    }
  }, [onTranscript, onError])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start Web Speech Recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      // Also record audio for potential server processing
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      onError?.('Failed to access microphone. Please check your permissions.')
    }
  }, [onError])

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        // Stop Web Speech Recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

          // Stop all tracks
          const stream = mediaRecorderRef.current?.stream
          stream?.getTracks().forEach(track => track.stop())

          setIsRecording(false)
          resolve(transcript)
        }

        mediaRecorderRef.current.stop()
      } else {
        resolve('')
      }
    })
  }, [isRecording, transcript])

  const playAudio = useCallback(async (text: string) => {
    // Use Web Speech Synthesis API for now
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
    playAudio,
  }
}