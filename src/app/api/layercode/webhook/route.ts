import { streamResponse } from '@layercode/node-server-sdk'
import {
  initializeConversation,
  getConversationState,
  storeResponse,
  getNextQuestion,
  getCurrentQuestion,
  getProgress,
  completeConversation,
  cleanupConversation,
  type ConversationState
} from '@/lib/question-flow-manager'
import {
  extractRating,
  detectSkipIntent
} from '@/lib/feedback-analyzer'
import {
  streamSentimentAndTransition
} from '@/lib/feedback-analyzer-streaming'
import {
  ensureSession,
  storeFeedbackResponse,
  updateSessionMetrics,
  calculateAndStoreMetrics,
  storeConversationMessage,
  storeFeedbackAndMessage
} from '@/lib/feedback-storage'

export const dynamic = 'force-dynamic'

// Webhook request type
type WebhookRequest = {
  conversation_id: string
  session_id?: string
  text?: string
  turn_id?: string
  interruption_context?: {
    previous_turn_interrupted: boolean
    words_heard: number
    text_heard: string
    assistant_turn_id?: string
  }
  type: 'message' | 'session.start' | 'session.update' | 'session.end' | 'user.transcript.interim_delta' | string
  content?: string
  delta_counter?: number
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json() as WebhookRequest

    // Verify webhook secret if configured
    const webhookSecret = process.env.LAYERCODE_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-layercode-signature')
      // TODO: Implement signature verification if needed
    }

    // Handle different webhook event types
    const { type, text, turn_id, session_id, conversation_id, interruption_context } = requestBody

    // Use conversation_id as the primary key for message storage
    const conversationKey = conversation_id || session_id || 'unknown'

    return streamResponse(requestBody, async ({ stream }) => {
      try {
        if (type === 'session.start') {
          // Initialize feedback collection conversation
          try {
            // Initialize conversation state with question flow
            const state = await initializeConversation(conversationKey)

            // Ensure session exists in database with total question count
            await ensureSession(conversationKey, 'widget', state.questionFlow.questions.length)

            // Get the first question
            const firstQuestion = getCurrentQuestion(conversationKey)

            if (!firstQuestion) {
              throw new Error('Failed to load question flow')
            }

            // Send welcome message + first question
            const welcomeMsg = state.questionFlow.welcomeMessage
            const fullMessage = `${welcomeMsg} ${firstQuestion.text}`

            stream.tts(fullMessage)

            // Store the first question as a conversation message
            await storeConversationMessage(conversationKey, firstQuestion.text, firstQuestion.type)

            // Send progress data
            const progress = getProgress(conversationKey)
            if (progress) {
              stream.data({
                type: 'progress',
                current: progress.current,
                total: progress.total
              })
            }

            console.log(`✅ Started feedback session ${conversationKey} with ${state.questionFlow.questions.length} questions`)
          } catch (error) {
            console.error('Error initializing feedback session:', error)
            stream.tts("I'm sorry, there was an error starting the feedback session. Please try again.")
          }

          stream.end()
          return
        }

        if (type === 'session.end') {
          // Clean up conversation state
          cleanupConversation(conversationKey)
          console.log(`🧹 Cleaned up feedback session ${conversationKey}`)
          stream.end()
          return
        }

        if (type === 'session.update') {
          // Just acknowledge session update events
          stream.end()
          return
        }

        if (type === 'user.transcript.interim_delta') {
          // Interim transcripts are for real-time display only, no action needed
          stream.end()
          return
        }

        if (type === 'message' && text) {
          try {
            // Get or initialize conversation state (handles serverless cold starts)
            let state = getConversationState(conversationKey)

            if (!state) {
              console.log(`⚠️  No state found for ${conversationKey}, reinitializing...`)
              state = await initializeConversation(conversationKey)
              // Update total_questions in database
              await ensureSession(conversationKey, undefined, state.questionFlow.questions.length)
            }

            // Check if user wants to skip
            if (detectSkipIntent(text)) {
              console.log('User wants to skip question')
              const nextQ = getNextQuestion(conversationKey)

              if (nextQ) {
                stream.tts(`No problem. ${nextQ.text}`)
                await storeConversationMessage(conversationKey, nextQ.text, nextQ.type)

                const progress = getProgress(conversationKey)
                if (progress) {
                  stream.data({
                    type: 'progress',
                    current: progress.current,
                    total: progress.total
                  })
                }
              } else {
                // That was the last question
                completeConversation(conversationKey)
                stream.tts(state.questionFlow.thankYouMessage)
                await updateSessionMetrics(conversationKey, state.responses.length)
                await calculateAndStoreMetrics(conversationKey, state.responses)
              }

              stream.end()
              return
            }

            // Get current question
            const currentQuestion = getCurrentQuestion(conversationKey)

            if (!currentQuestion) {
              console.error('No current question found')
              stream.tts("Thank you for your feedback!")
              stream.end()
              return
            }

            console.log(`💬 User response to "${currentQuestion.text}": "${text.substring(0, 50)}..."`)

            // Stream sentiment analysis and transition generation
            const streamResult = await streamSentimentAndTransition(text)

            // Get both values in parallel
            const [transition, sentiment] = await Promise.all([
              streamResult.transition,
              streamResult.sentiment
            ])

            console.log(`🔄 Transition: "${transition}"`)
            console.log(`📊 Sentiment: ${sentiment.toFixed(2)}`)

            // Store the response in conversation state (in-memory, instant)
            storeResponse(conversationKey, currentQuestion.id, currentQuestion.text, text, sentiment)

            // Get next question
            const nextQuestion = getNextQuestion(conversationKey, text, sentiment)

            if (nextQuestion) {
              // Combine transition with next question
              const fullResponse = `${transition} ${nextQuestion.text}`

              // OPTIMIZATION 2: Send TTS immediately (don't wait for DB)
              stream.tts(fullResponse)

              // OPTIMIZATION 1 & 4: Fire-and-forget database writes (parallel + batched)
              // Store current response + next question message
              Promise.all([
                // Store the user's response to the current question
                storeFeedbackResponse(
                  conversationKey,
                  currentQuestion.id,
                  currentQuestion.text,
                  text,
                  sentiment
                ),
                // Store the next question we're about to ask
                storeConversationMessage(conversationKey, nextQuestion.text, nextQuestion.type)
              ]).catch(err => {
                console.error('❌ DB write error:', err)
                console.error('Session:', conversationKey)
                console.error('Question:', currentQuestion.id)
              })

              // Send progress update
              const progress = getProgress(conversationKey)
              if (progress) {
                stream.data({
                  type: 'progress',
                  current: progress.current,
                  total: progress.total
                })
              }

              console.log(`➡️  Next question: "${nextQuestion.text}"`)
            } else {
              // No more questions - conversation complete!
              completeConversation(conversationKey)

              stream.tts(state.questionFlow.thankYouMessage)

              // Store the final response (fire-and-forget)
              storeFeedbackResponse(
                conversationKey,
                currentQuestion.id,
                currentQuestion.text,
                text,
                sentiment
              ).catch(err => console.error('❌ Final response DB error:', err))

              // Update session metrics
              await updateSessionMetrics(conversationKey, state.responses.length)

              // Calculate and store aggregate metrics
              await calculateAndStoreMetrics(conversationKey, state.responses)

              // Send completion signal
              stream.data({
                type: 'complete',
                totalQuestions: state.responses.length,
                averageSentiment: sentiment
              })

              console.log(`✅ Feedback session ${conversationKey} completed with ${state.responses.length} responses`)
            }
          } catch (error) {
            console.error('Error processing message:', error)
            stream.tts("I'm sorry, there was an error processing your response. Could you try again?")
          }
        }

        stream.end()
      } catch (error) {
        console.error('Error in webhook handler:', error)
        stream.tts("I apologize, but I encountered an error processing your request. Please try again.")
        stream.end()
      }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}