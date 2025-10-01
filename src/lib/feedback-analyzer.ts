import { getAIProvider, type AIMessage } from './ai-provider'

/**
 * Analyze sentiment of user response
 * Returns a score from -1 (very negative) to 1 (very positive)
 */
export async function analyzeSentiment(text: string): Promise<number> {
  try {
    const aiProvider = getAIProvider()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Analyze the sentiment of the user response. Return ONLY a number between -1 (very negative) and 1 (very positive). No explanation, just the number.'
      },
      {
        role: 'user',
        content: text
      }
    ]

    const response = await aiProvider.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 10
    })

    const sentiment = parseFloat(response.trim())

    // Validate and clamp the result
    if (isNaN(sentiment)) {
      console.warn(`Invalid sentiment response: ${response}`)
      return 0 // Neutral fallback
    }

    return Math.max(-1, Math.min(1, sentiment))
  } catch (error) {
    console.error('Failed to analyze sentiment:', error)
    return 0 // Neutral fallback on error
  }
}

/**
 * Generate a natural transition between questions
 * Creates contextual phrases based on user response and next question
 */
export async function generateTransition(
  previousResponse: string,
  nextQuestionText: string
): Promise<string> {
  try {
    const aiProvider = getAIProvider()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You're conducting a voice survey. Create a brief (3-8 word) acknowledgment that directly references what the user just said. Be conversational and specific to their response. Do NOT explain response options or how to answer questions.`
      },
      {
        role: 'user',
        content: `User response: "${previousResponse}"
Next question text (for context only, don't repeat it): "${nextQuestionText}"

Acknowledgment:`
      }
    ]

    const response = await aiProvider.generateCompletion(messages, {
      temperature: 0.7,
      maxTokens: 20
    })

    return response.trim().replace(/["']/g, '')
  } catch (error) {
    console.error('Failed to generate transition:', error)
    return "Thanks for sharing."
  }
}

/**
 * Extract a numeric rating from text
 * Handles various formats like "8", "eight", "8 out of 10", etc.
 */
export function extractRating(text: string): number | null {
  const lowerText = text.toLowerCase()

  // Try to find a number directly
  const numberMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\b/)
  if (numberMatch) {
    const num = parseFloat(numberMatch[1])
    // Validate it's in a reasonable range (assuming 1-10 scale)
    if (num >= 0 && num <= 10) {
      return num
    }
  }

  // Try to match written numbers
  const wordToNumber: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  }

  for (const [word, num] of Object.entries(wordToNumber)) {
    if (lowerText.includes(word)) {
      return num
    }
  }

  return null
}

/**
 * Categorize response into predefined categories
 * Useful for open-ended questions to group similar responses
 */
export async function categorizeResponse(
  response: string,
  categories: string[]
): Promise<string> {
  try {
    const aiProvider = getAIProvider()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are categorizing user feedback.
Given a user response and a list of categories, return the SINGLE most appropriate category.
Return ONLY the category name, nothing else.`
      },
      {
        role: 'user',
        content: `Categories: ${categories.join(', ')}\n\nUser response: "${response}"\n\nBest category:`
      }
    ]

    const result = await aiProvider.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 20
    })

    const category = result.trim()

    // Validate it's one of the provided categories
    if (categories.includes(category)) {
      return category
    }

    // Return first category as fallback
    return categories[0] || 'Uncategorized'
  } catch (error) {
    console.error('Failed to categorize response:', error)
    return categories[0] || 'Uncategorized'
  }
}

/**
 * Detect if response indicates user wants to skip or end early
 */
export function detectSkipIntent(text: string): boolean {
  const lowerText = text.toLowerCase()
  const skipPhrases = [
    'skip',
    'pass',
    'next question',
    'move on',
    'don\'t know',
    'not sure',
    'rather not say',
    'prefer not to answer',
    'end',
    'stop',
    'quit',
    'done',
    'finish'
  ]

  return skipPhrases.some(phrase => lowerText.includes(phrase))
}

/**
 * Generate summary of all responses for session completion
 * Useful for storing in metrics or showing to user
 */
export async function generateSummary(
  responses: Array<{ questionText: string; userResponse: string; sentiment?: number }>
): Promise<string> {
  try {
    const aiProvider = getAIProvider()

    // Format responses for AI
    const formattedResponses = responses
      .map((r, i) => `Q${i + 1}: ${r.questionText}\nA: ${r.userResponse}`)
      .join('\n\n')

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are summarizing customer feedback.
Create a VERY brief (2-3 sentences) summary highlighting:
- Overall sentiment
- Key themes or concerns
- Most important takeaways

Keep it concise and actionable.`
      },
      {
        role: 'user',
        content: `Feedback responses:\n\n${formattedResponses}\n\nSummary:`
      }
    ]

    const summary = await aiProvider.generateCompletion(messages, {
      temperature: 0.5,
      maxTokens: 100
    })

    return summary.trim()
  } catch (error) {
    console.error('Failed to generate summary:', error)
    return 'Summary unavailable'
  }
}
