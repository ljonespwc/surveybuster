import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

/**
 * Get the appropriate AI model based on environment configuration
 */
function getAIModel() {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai'

  console.log(`🤖 Using streaming AI Provider: ${provider}`)

  if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY
    })
    return google('gemini-2.5-flash-lite')
  } else {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    return openai('gpt-4-1106-preview') // gpt-4.1-mini
  }
}

/**
 * Stream a natural transition phrase based on user response and sentiment
 * Returns streaming text that can be sent directly to TTS
 */
export async function streamTransition(
  previousResponse: string,
  sentiment: number
): Promise<{
  textStream: any
  text: Promise<string>
}> {
  const model = getAIModel()

  const result = await streamText({
    model,
    messages: [
      {
        role: 'system',
        content: `You are creating short transition phrases between survey questions.
Generate ONE very brief (2-4 words) natural transition that:
- Acknowledges what the user just said
- Feels conversational and warm
- Matches the sentiment of their response
- Doesn't repeat their words back

Examples:
- "Great to hear!"
- "I understand."
- "Thanks for sharing."
- "Got it."
- "That's helpful."

Return ONLY the transition phrase, nothing else.`
      },
      {
        role: 'user',
        content: `User's response (sentiment: ${sentiment.toFixed(2)}): "${previousResponse}"\n\nGenerate transition phrase:`
      }
    ],
    temperature: 0.7
  })

  return {
    textStream: result.textStream,
    text: result.text
  }
}

/**
 * Analyze sentiment and generate transition in one streaming call
 * This is more efficient than two separate calls
 */
export async function streamSentimentAndTransition(
  userResponse: string
): Promise<{
  textStream: any
  sentiment: Promise<number>
  transition: Promise<string>
}> {
  const model = getAIModel()

  const result = await streamText({
    model,
    messages: [
      {
        role: 'system',
        content: `You are analyzing user feedback and creating a transition.
First, analyze sentiment (-1 to 1).
Then create a brief 2-4 word transition phrase.

Format your response EXACTLY as:
SENTIMENT: [number]
TRANSITION: [phrase]

Example:
SENTIMENT: 0.8
TRANSITION: That's great!`
      },
      {
        role: 'user',
        content: `User's response: "${userResponse}"`
      }
    ],
    temperature: 0.5
  })

  // Parse the streamed result - await it once and parse from the resolved text
  const fullTextPromise = result.text

  // Create promises that share the same resolved text
  const parsedData = fullTextPromise.then(text => {
    const sentimentMatch = text.match(/SENTIMENT:\s*(-?\d+\.?\d*)/)
    const transitionMatch = text.match(/TRANSITION:\s*(.+)/)

    const sentiment = sentimentMatch
      ? Math.max(-1, Math.min(1, parseFloat(sentimentMatch[1])))
      : 0

    let transition = transitionMatch
      ? transitionMatch[1].trim().replace(/['"]/g, '')
      : null

    // Fallback transition based on sentiment
    if (!transition) {
      if (sentiment > 0.3) transition = "That's great!"
      else if (sentiment < -0.3) transition = "I understand."
      else transition = "Thanks for sharing."
    }

    return { sentiment, transition }
  })

  return {
    textStream: result.textStream,
    sentiment: parsedData.then(d => d.sentiment),
    transition: parsedData.then(d => d.transition)
  }
}

/**
 * Non-streaming sentiment analysis (for when we need the value immediately)
 * This is kept for backward compatibility
 */
export async function analyzeSentimentFast(text: string): Promise<number> {
  const model = getAIModel()

  const result = await streamText({
    model,
    messages: [
      {
        role: 'system',
        content: 'Analyze the sentiment of the user response. Return ONLY a number between -1 (very negative) and 1 (very positive). No explanation, just the number.'
      },
      {
        role: 'user',
        content: text
      }
    ],
    temperature: 0.3
  })

  const fullText = await result.text
  const sentiment = parseFloat(fullText.trim())

  if (isNaN(sentiment)) {
    console.warn(`Invalid sentiment response: ${fullText}`)
    return 0
  }

  return Math.max(-1, Math.min(1, sentiment))
}
