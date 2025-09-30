import { streamResponse } from '@layercode/node-server-sdk'
import { matchFAQWithAI, type FAQMatch, type NoMatchResponse } from '@/lib/faq-ai-matcher'
import { streamFAQMatch, extractStreamMetadata } from '@/lib/faq-ai-matcher-streaming'
import { extractURLsFromAnswer } from '@/lib/url-extractor'

export const dynamic = 'force-dynamic'

// Message type with turn_id tracking
type MessageWithTurnId = {
  role: 'system' | 'user' | 'assistant'
  content: string
  turn_id?: string
}

// Store conversation messages in memory (consider Redis for production)
const conversationMessages: Record<string, MessageWithTurnId[]> = {}

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
          // Initialize conversation history with system prompt
          const systemPrompt = "You are a helpful assistant for the Huberman Lab podcast website. You have access to frequently asked questions about the podcast, Dr. Huberman, his book Protocols, premium membership, newsletter, events, and sponsors. Maintain context from previous messages in the conversation."

          conversationMessages[conversationKey] = [
            { role: 'system', content: systemPrompt }
          ]

          // Send welcome message and store it in history
          const welcomeMsg = "Hello! I'm your Huberman Lab assistant. How can I help you today?"
          stream.tts(welcomeMsg)

          conversationMessages[conversationKey].push({
            role: 'assistant',
            content: welcomeMsg,
            turn_id
          })

          stream.end()
          return
        }

        if (type === 'session.end') {
          // Clean up conversation history after session ends
          delete conversationMessages[conversationKey]
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
          // Initialize conversation if not exists (in case session.start was missed)
          if (!conversationMessages[conversationKey]) {
            conversationMessages[conversationKey] = [
              { role: 'system', content: "You are a helpful assistant for the Huberman Lab podcast website." }
            ]
          }

          // Handle interruption context (skip for welcome message interruptions)
          if (interruption_context?.previous_turn_interrupted) {
            console.log('Handling interruption:', interruption_context)

            // Find and update the interrupted assistant message by turn_id
            const interruptedMsg = conversationMessages[conversationKey].findLast(
              m => m.role === 'assistant' && m.turn_id === interruption_context.assistant_turn_id
            )

            if (interruptedMsg) {
              // Update with what was actually heard
              interruptedMsg.content = interruption_context.text_heard || ''
              console.log(`Updated interrupted message: "${interruption_context.text_heard?.substring(0, 50)}..."`)
            }
            // Skip handling if we can't find the message (likely the welcome message)
          }

          // Store user message after handling interruption
          conversationMessages[conversationKey].push({
            role: 'user',
            content: text,
            turn_id
          })

          // Debug: Log conversation history
          console.log(`Conversation ${conversationKey} history:`,
            conversationMessages[conversationKey].map(m => `${m.role}: ${m.content.substring(0, 50)}...`)
          )

          // Create placeholder for assistant response
          const assistantPlaceholderIndex = conversationMessages[conversationKey].length
          conversationMessages[conversationKey].push({
            role: 'assistant',
            content: '',
            turn_id
          })

          // Check if streaming is enabled (can be controlled via env var)
          const useStreaming = process.env.USE_STREAMING !== 'false' // Default to true

          if (useStreaming) {
            // STREAMING VERSION - Faster perceived response time
            console.log('🚀 Using streaming response')

            // Stream the FAQ match response
            const streamResult = await streamFAQMatch(text, conversationMessages[conversationKey])

            // Get the full response text first to check for markers
            const fullResponse = await streamResult.text

            // Extract metadata and check for NO_MATCH/FAQ markers
            const metadata = await extractStreamMetadata(text, fullResponse)

            // Use the clean response (with markers removed) for TTS
            const responseForTTS = metadata.cleanResponse || fullResponse

            // Send the clean response via TTS
            stream.tts(responseForTTS)

            // Extract URLs from the original FAQ answer if we have it
            let urlData: any = { hasLinks: false, links: [] }
            if (metadata.originalAnswer) {
              urlData = extractURLsFromAnswer(metadata.originalAnswer)
            }

            // Track conversation
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hubermanchat.vercel.app'
            fetch(`${appUrl}/api/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: session_id || conversation_id || 'unknown',
                question: text,
                matched: metadata.matched,
                category: metadata.category || null,
                page_url: `${appUrl}/widget`
              })
            }).catch(() => {})

            // Update conversation history with the clean response (no markers)
            conversationMessages[conversationKey][assistantPlaceholderIndex] = {
              role: 'assistant',
              content: responseForTTS,
              turn_id
            }

            // Send metadata with extracted URLs
            stream.data({
              type: metadata.matched ? 'faq_match' : 'no_match',
              question: text,
              response: responseForTTS,
              category: metadata.category,
              urls: urlData // Now includes actual extracted URLs!
            })

          } else {
            // NON-STREAMING VERSION (fallback)
            console.log('📦 Using non-streaming response')

            // Use AI to match with FAQ, passing conversation history for context
            const result = await matchFAQWithAI(text, conversationMessages[conversationKey])

            // Track conversation (fire and forget for speed)
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hubermanchat.vercel.app'
            fetch(`${appUrl}/api/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: session_id || conversation_id || 'unknown',
                question: text,
                matched: result ? !('type' in result && result.type === 'no_match') : false,
                category: result && 'category' in result ? result.category : null,
                page_url: `${appUrl}/widget`
              })
            }).catch(() => {})

            let finalResponse = ''

            if (result) {
              if ('type' in result && result.type === 'no_match') {
                // AI generated a natural decline message
                finalResponse = result.response
                stream.tts(finalResponse)

                // Send metadata about no match
                stream.data({
                  type: 'no_match',
                  question: text,
                  response: finalResponse,
                  urls: { hasLinks: false, links: [] }
                })
              } else {
                // We have a FAQ match - stream the natural answer
                const faqMatch = result as FAQMatch
                finalResponse = faqMatch.naturalAnswer

                // If it's a medium confidence match, add a follow-up
                if (faqMatch.confidence === 'medium') {
                  finalResponse += " Was that what you were looking for?"
                }

                stream.tts(finalResponse)

                // Extract URLs from the original answer
                const urlData = extractURLsFromAnswer(faqMatch.answer)

                // Send metadata about the FAQ match with URL data
                stream.data({
                  type: 'faq_match',
                  question: faqMatch.question,
                  answer: finalResponse,
                  originalAnswer: faqMatch.answer,
                  confidence: faqMatch.confidence,
                  category: faqMatch.category,
                  urls: urlData
                })
              }
            } else {
              // Fallback if something went wrong
              finalResponse = "I'm sorry, I don't have specific information about that. Is there something else about Huberman Lab I can help you with?"
              stream.tts(finalResponse)

              stream.data({
                type: 'no_match',
                question: text,
                response: finalResponse,
                urls: { hasLinks: false, links: [] }
              })
            }

            // Update the assistant placeholder with the actual response
            conversationMessages[conversationKey][assistantPlaceholderIndex] = {
              role: 'assistant',
              content: finalResponse,
              turn_id
            }
          }

          // Clean up old conversations to prevent memory leak (keep last 50 active conversations)
          const conversationKeys = Object.keys(conversationMessages)
          if (conversationKeys.length > 50) {
            const oldestKey = conversationKeys[0]
            delete conversationMessages[oldestKey]
            console.log(`Cleaned up old conversation: ${oldestKey}`)
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