import { OpenAI } from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIProvider {
  generateCompletion(
    messages: AIMessage[],
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string>
  getName(): string
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generateCompletion(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-1106-preview', // gpt-4.1-mini
      messages: messages as any,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 200
    })

    return completion.choices[0].message.content?.trim() || ''
  }

  getName(): string {
    return 'OpenAI (GPT-4.1-mini)'
  }
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI
  private model: any

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite'
    })
  }

  async generateCompletion(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    // Convert OpenAI format to Gemini format
    // Gemini doesn't have system messages, so we prepend them to the first user message
    const geminiMessages: any[] = []
    let systemContext = ''

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemContext += msg.content + '\n\n'
      } else if (msg.role === 'user') {
        const content = systemContext ? systemContext + msg.content : msg.content
        geminiMessages.push({
          role: 'user',
          parts: [{ text: content }]
        })
        systemContext = '' // Reset after using
      } else if (msg.role === 'assistant') {
        geminiMessages.push({
          role: 'model',
          parts: [{ text: msg.content }]
        })
      }
    }

    // If we only have system context and no user messages, create one
    if (systemContext && geminiMessages.length === 0) {
      geminiMessages.push({
        role: 'user',
        parts: [{ text: systemContext }]
      })
    }

    const chat = this.model.startChat({
      history: geminiMessages.slice(0, -1), // All but the last message
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 200,
      }
    })

    // Send the last message
    const lastMessage = geminiMessages[geminiMessages.length - 1]
    const result = await chat.sendMessage(lastMessage.parts[0].text)
    const response = await result.response

    return response.text().trim()
  }

  getName(): string {
    return 'Gemini (2.5-flash-lite)'
  }
}

// Singleton instances
let openaiProvider: OpenAIProvider | null = null
let geminiProvider: GeminiProvider | null = null

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai'

  console.log(`🤖 Using AI Provider: ${provider}`)

  switch(provider) {
    case 'gemini':
      if (!geminiProvider) {
        geminiProvider = new GeminiProvider()
      }
      return geminiProvider

    case 'openai':
    default:
      if (!openaiProvider) {
        openaiProvider = new OpenAIProvider()
      }
      return openaiProvider
  }
}

// Helper to get provider name for logging
export function getCurrentProviderName(): string {
  return getAIProvider().getName()
}