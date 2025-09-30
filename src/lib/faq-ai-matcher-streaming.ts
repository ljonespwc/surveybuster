import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import faqData from '../../docs/huberman_lab_faqs.json'

// Get the appropriate AI model based on environment configuration
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
 * Stream FAQ matching responses using Vercel AI SDK
 * Returns a text stream that can be consumed by Layercode's ttsTextStream
 * Also returns metadata about which FAQ was matched for URL extraction
 */
export async function streamFAQMatch(
  userQuestion: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<{
  textStream: any;
  text: Promise<string>;
  matchedFAQ?: { question: string; answer: string; category: string }
}> {
  // Prepare all FAQs in a numbered list
  const faqList: Array<{ num: number; question: string; answer: string; category: string }> = []
  let num = 1

  for (const category of faqData.categories) {
    for (const qa of category.questions) {
      faqList.push({
        num,
        question: qa.question,
        answer: qa.answer,
        category: category.name
      })
      num++
    }
  }

  // Add knowledge base context if available
  let knowledgeContext = ''
  if ('knowledge_base' in faqData && faqData.knowledge_base) {
    const kb = faqData.knowledge_base as Record<string, string>
    knowledgeContext = '\n\nAdditional Context about Dr. Huberman:\n'
    for (const [topic, content] of Object.entries(kb)) {
      knowledgeContext += `${topic}: ${content}\n\n`
    }
  }

  // Build context string if history is provided
  let contextString = ''
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory
      .filter(m => m.role !== 'system')
      .slice(-4) // Last 2 exchanges

    if (recentHistory.length > 0) {
      contextString = '\nRecent conversation:\n' +
        recentHistory.map(m => `${m.role}: ${m.content}`).join('\n') + '\n\n'
    }
  }

  // Create the system prompt
  const systemPrompt = `You are a helpful assistant for the Huberman Lab podcast website.
You have access to a comprehensive FAQ database and should provide natural, conversational responses.
When a user's question matches an FAQ, provide the answer in a natural, voice-friendly way.
If there's no match, start your response with [NO_MATCH] then provide a polite decline in one brief sentence.
Keep responses concise and suitable for voice output.
IMPORTANT: Only use [NO_MATCH] when the question doesn't match any FAQ or context.`

  // Create the user prompt with all FAQs
  const userPrompt = `Find the best matching FAQ for this user question.
${contextString}Current user asks: "${userQuestion}"

Available FAQs:
${faqList.map(faq =>
  `${faq.num}. Q: ${faq.question}
   A: ${faq.answer}`
).join('\n\n')}${knowledgeContext}

Instructions:
- If there's a good match, start your response with [FAQ:NUMBER] then provide a natural, conversational version of the answer (2-3 sentences max)
- IMPORTANT: When you see URLs in the answer, DO NOT read them out. Instead, replace them with natural phrases like "using the form", "through the link provided", "via the submission form", etc.
- If it's about Dr. Huberman's background and no FAQ matches, use the Additional Context
- If no relevant match exists, start with [NO_MATCH] then respond with a brief, polite decline (one sentence)
- Make the response sound friendly and natural for voice output
- Don't mention FAQ numbers in your spoken response
- Just provide the natural response directly after the marker`

  // Convert conversation history to Vercel AI SDK format
  const messages: CoreMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  // Get the appropriate model
  const model = getAIModel()

  // Stream the response
  const result = await streamText({
    model,
    messages,
    temperature: 0.3,
    maxRetries: 2,
  })

  // Create a wrapper that includes FAQ metadata
  return {
    textStream: result.textStream,
    text: result.text,
    // We'll extract the matched FAQ from the response text later
    matchedFAQ: undefined // Will be populated by extractStreamMetadata
  }
}

/**
 * Extract metadata from the streaming response
 * This is called after streaming completes to track analytics
 */
export async function extractStreamMetadata(
  userQuestion: string,
  response: string
): Promise<{
  matched: boolean;
  category?: string;
  cleanResponse?: string;
  faqNumber?: number;
  originalAnswer?: string;
}> {
  // Check for the NO_MATCH marker
  if (response.startsWith('[NO_MATCH]')) {
    return {
      matched: false,
      cleanResponse: response.replace('[NO_MATCH]', '').trim()
    }
  }

  // Check for FAQ number marker
  const faqMatch = response.match(/^\[FAQ:(\d+)\]/)
  if (faqMatch) {
    const faqNumber = parseInt(faqMatch[1])
    const cleanResponse = response.replace(faqMatch[0], '').trim()

    // Get the original FAQ data
    let matchedFAQ = null
    let num = 1
    for (const category of faqData.categories) {
      for (const qa of category.questions) {
        if (num === faqNumber) {
          matchedFAQ = {
            question: qa.question,
            answer: qa.answer,
            category: category.name
          }
          break
        }
        num++
      }
      if (matchedFAQ) break
    }

    if (matchedFAQ) {
      return {
        matched: true,
        category: matchedFAQ.category,
        cleanResponse,
        faqNumber,
        originalAnswer: matchedFAQ.answer
      }
    }
  }

  // Fallback: Check for common decline patterns (in case marker is missed)
  const declinePatterns = [
    "don't have information",
    "can't help with",
    "not able to answer",
    "outside what I can",
    "don't have details",
    "not something I can",
    "don't have more information",
    "specific detail isn't",
    "not equipped to",
    "unable to provide",
    "can't provide",
    "not in my knowledge",
    "beyond my scope",
    "outside my expertise",
    "that's not something",
    "I focus on",
    "I'm here to help with"
  ]

  const isDecline = declinePatterns.some(pattern =>
    response.toLowerCase().includes(pattern)
  )

  if (isDecline) {
    return { matched: false, cleanResponse: response }
  }

  // Try to determine category based on response content
  let category = 'General'

  // Simple keyword matching for categories
  if (response.toLowerCase().includes('podcast') || response.toLowerCase().includes('episode')) {
    category = 'Huberman Lab'
  } else if (response.toLowerCase().includes('premium') || response.toLowerCase().includes('subscriber')) {
    category = 'Huberman Lab Premium'
  } else if (response.toLowerCase().includes('newsletter') || response.toLowerCase().includes('neural network')) {
    category = 'Neural Network Newsletter'
  } else if (response.toLowerCase().includes('event') || response.toLowerCase().includes('live')) {
    category = 'Huberman Lab Live Events'
  } else if (response.toLowerCase().includes('sponsor') || response.toLowerCase().includes('partner')) {
    category = 'Sponsors & Partners'
  } else if (response.toLowerCase().includes('protocols') || response.toLowerCase().includes('book')) {
    category = 'Protocols Book'
  } else if (response.toLowerCase().includes('dr. huberman') || response.toLowerCase().includes('andrew')) {
    category = 'About Dr. Huberman'
  }

  return { matched: true, category, cleanResponse: response }
}