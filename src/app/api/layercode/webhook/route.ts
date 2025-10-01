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
  detectSkipIntent,
  analyzeSentiment
} from '@/lib/feedback-analyzer'
import { getAIProvider } from '@/lib/ai-provider'
import {
  ensureSession,
  storeFeedbackResponse,
  updateSentimentScore,
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

            // Get first question
            const firstQuestion = getCurrentQuestion(conversationKey)
            if (!firstQuestion) {
              throw new Error('No questions in flow')
            }

            // Generate natural greeting + first question using LLM
            const aiProvider = getAIProvider()
            const greeting = await aiProvider.generateCompletion([
              {
                role: 'system',
                content: `You're conducting a brief voice survey. Greet the user warmly, mention it'll take about 2 minutes, then ask the first question naturally. Be conversational.`
              },
              {
                role: 'user',
                content: `First question: ${firstQuestion.text}`
              }
            ], { temperature: 0.7, maxTokens: 100 })

            stream.tts(greeting.trim())

            // Send progress
            stream.data({
              type: 'progress',
              current: 1,
              total: state.questionFlow.questions.length
            })

            console.log(`✅ Started session ${conversationKey}`)
          } catch (error) {
            console.error('Error initializing session:', error)
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
            let state = getConversationState(conversationKey)
            if (!state) {
              state = await initializeConversation(conversationKey)
              await ensureSession(conversationKey, undefined, state.questionFlow.questions.length)
            }

            const currentQuestion = getCurrentQuestion(conversationKey)
            if (!currentQuestion) {
              stream.tts("Thank you so much for your feedback!")
              stream.end()
              return
            }

            console.log(`💬 Response to "${currentQuestion.text}": "${text.substring(0, 50)}..."`)

            // Store response in memory
            storeResponse(conversationKey, currentQuestion.id, currentQuestion.text, text)

            // Get next question
            const nextQuestion = getNextQuestion(conversationKey, text)

            if (nextQuestion) {
              // Generate natural transition using LLM
              const aiProvider = getAIProvider()
              const response = await aiProvider.generateCompletion([
                {
                  role: 'system',
                  content: `You're conducting a voice survey. The user just answered. Acknowledge their response naturally (reference what they said), then ask the next question conversationally. Be brief and warm.`
                },
                {
                  role: 'user',
                  content: `User's response: "${text}"
Next question: ${nextQuestion.text}

Your response:`
                }
              ], { temperature: 0.7, maxTokens: 100 })

              stream.tts(response.trim())

              // Progress + storage (fire-and-forget)
              const prog = getProgress(conversationKey)
              if (prog) {
                stream.data({ type: 'progress', current: prog.current, total: prog.total })
              }

              const seqNum = prog ? prog.current - 1 : 1
              storeFeedbackResponse(conversationKey, currentQuestion.id, currentQuestion.text, text, undefined, seqNum)
                .catch(err => console.error('Storage error:', err))
              analyzeSentiment(text)
                .then(s => updateSentimentScore(conversationKey, currentQuestion.id, s))
                .catch(err => console.error('Sentiment error:', err))

            } else {
              // Final question - thank them
              const aiProvider = getAIProvider()
              const thanks = await aiProvider.generateCompletion([
                {
                  role: 'system',
                  content: `The user just completed a voice survey. Thank them warmly for their time and feedback. Be brief.`
                },
                {
                  role: 'user',
                  content: `Their final response: "${text}"`
                }
              ], { temperature: 0.7, maxTokens: 80 })

              stream.tts(thanks.trim())

              // Cleanup
              completeConversation(conversationKey)
              const prog = getProgress(conversationKey)
              const seqNum = prog ? prog.current : state.responses.length

              storeFeedbackResponse(conversationKey, currentQuestion.id, currentQuestion.text, text, undefined, seqNum)
                .catch(err => console.error('Storage error:', err))
              analyzeSentiment(text)
                .then(s => updateSentimentScore(conversationKey, currentQuestion.id, s))
                .catch(err => console.error('Sentiment error:', err))

              await updateSessionMetrics(conversationKey, state.responses.length)
              await calculateAndStoreMetrics(conversationKey, state.responses)

              stream.data({ type: 'complete', totalQuestions: state.responses.length })
            }
          } catch (error) {
            console.error('Error processing message:', error)
            stream.tts("I'm sorry, there was an error. Could you try again?")
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