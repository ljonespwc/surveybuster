import { createClient } from '@supabase/supabase-js'

// Question types
export interface Question {
  id: string
  text: string
  type: 'open' | 'rating' | 'yes_no' | 'multiple_choice'
  options?: string[]
  followUp?: {
    condition: 'negative' | 'positive' | 'specific_answer'
    question: Question
  }
}

// Question flow structure
export interface QuestionFlow {
  id: string
  name: string
  questions: Question[]
  welcomeMessage: string
  thankYouMessage: string
}

// Conversation state for tracking progress
export interface ConversationState {
  sessionId: string
  currentQuestionIndex: number
  questionFlow: QuestionFlow
  responses: Array<{
    questionId: string
    questionText: string
    userResponse: string
    sentiment?: number
  }>
  isComplete: boolean
  pendingFollowUp?: Question
}

// In-memory store for conversation states
const conversationStates: Record<string, ConversationState> = {}

// Cache for active question flow
let cachedQuestionFlow: QuestionFlow | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get the active question flow from Supabase
 * Uses caching to reduce database calls
 */
export async function getActiveQuestionFlow(): Promise<QuestionFlow> {
  const now = Date.now()

  // Return cached flow if still valid
  if (cachedQuestionFlow && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedQuestionFlow
  }

  // Fetch from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase
    .from('question_flows')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Failed to fetch question flow:', error)
    // Return fallback flow
    return getFallbackQuestionFlow()
  }

  // Parse and cache the flow
  const flow: QuestionFlow = {
    id: data.id,
    name: data.flow_name,
    questions: data.questions as Question[],
    welcomeMessage: "Hi! I'd love to hear about your experience with our product. This will just take 2 minutes.",
    thankYouMessage: "Thank you so much for your feedback! Your insights help us improve the product for everyone."
  }

  cachedQuestionFlow = flow
  cacheTimestamp = now

  return flow
}

/**
 * Fallback question flow if database fetch fails
 */
function getFallbackQuestionFlow(): QuestionFlow {
  return {
    id: 'fallback',
    name: 'Product Feedback',
    welcomeMessage: "Hi! I'd love to hear about your experience. This will just take 2 minutes.",
    questions: [
      {
        id: 'q1',
        text: "How long have you been using our product?",
        type: 'open'
      },
      {
        id: 'q2',
        text: "On a scale of 1 to 10, how satisfied are you?",
        type: 'rating'
      },
      {
        id: 'q3',
        text: "What feature do you use the most?",
        type: 'open'
      },
      {
        id: 'q4',
        text: "What could we improve?",
        type: 'open'
      }
    ],
    thankYouMessage: "Thank you so much for your feedback! Your insights are really valuable to us."
  }
}

/**
 * Initialize conversation state for a new session
 */
export async function initializeConversation(sessionId: string): Promise<ConversationState> {
  const flow = await getActiveQuestionFlow()

  const state: ConversationState = {
    sessionId,
    currentQuestionIndex: 0,
    questionFlow: flow,
    responses: [],
    isComplete: false
  }

  conversationStates[sessionId] = state
  return state
}

/**
 * Get conversation state for a session
 */
export function getConversationState(sessionId: string): ConversationState | null {
  return conversationStates[sessionId] || null
}

/**
 * Store a user's response
 */
export function storeResponse(
  sessionId: string,
  questionId: string,
  questionText: string,
  userResponse: string,
  sentiment?: number
): void {
  const state = conversationStates[sessionId]
  if (!state) {
    console.error(`No conversation state found for session: ${sessionId}`)
    return
  }

  state.responses.push({
    questionId,
    questionText,
    userResponse,
    sentiment
  })
}

/**
 * Get the next question in the flow
 * Handles follow-up logic based on previous response
 */
export function getNextQuestion(
  sessionId: string,
  previousResponse?: string,
  sentiment?: number
): Question | null {
  const state = conversationStates[sessionId]
  if (!state) {
    console.error(`No conversation state found for session: ${sessionId}`)
    return null
  }

  // If we have a pending follow-up, return it
  if (state.pendingFollowUp) {
    const followUp = state.pendingFollowUp
    state.pendingFollowUp = undefined
    return followUp
  }

  // Check if current question has a follow-up that should trigger
  const currentQuestion = state.questionFlow.questions[state.currentQuestionIndex]
  if (currentQuestion?.followUp && previousResponse) {
    const shouldFollow = shouldTriggerFollowUp(
      previousResponse,
      sentiment,
      currentQuestion.followUp.condition
    )

    if (shouldFollow) {
      // Set follow-up as pending but don't increment index yet
      state.pendingFollowUp = currentQuestion.followUp.question
      return currentQuestion.followUp.question
    }
  }

  // Move to next question in flow
  state.currentQuestionIndex++

  // Check if we've reached the end
  if (state.currentQuestionIndex >= state.questionFlow.questions.length) {
    state.isComplete = true
    return null
  }

  return state.questionFlow.questions[state.currentQuestionIndex]
}

/**
 * Determine if a follow-up question should be asked based on the response
 */
function shouldTriggerFollowUp(
  response: string,
  sentiment: number | undefined,
  condition: 'negative' | 'positive' | 'specific_answer'
): boolean {
  const lowerResponse = response.toLowerCase()

  switch (condition) {
    case 'negative':
      // Trigger on negative sentiment or rating below 5
      if (sentiment !== undefined && sentiment < -0.2) {
        return true
      }
      // Check for negative keywords
      const negativeKeywords = ['no', 'not', 'never', 'bad', 'poor', 'disappointed', 'unhappy']
      return negativeKeywords.some(keyword => lowerResponse.includes(keyword))

    case 'positive':
      // Trigger on positive sentiment or rating above 7
      if (sentiment !== undefined && sentiment > 0.3) {
        return true
      }
      // Check for positive keywords
      const positiveKeywords = ['yes', 'great', 'excellent', 'love', 'happy', 'amazing']
      return positiveKeywords.some(keyword => lowerResponse.includes(keyword))

    case 'specific_answer':
      // This would need custom logic based on the question
      // For now, trigger on "no" responses
      return lowerResponse.includes('no') || lowerResponse.includes('not')

    default:
      return false
  }
}

/**
 * Mark conversation as complete
 */
export function completeConversation(sessionId: string): void {
  const state = conversationStates[sessionId]
  if (state) {
    state.isComplete = true
  }
}

/**
 * Clean up conversation state
 */
export function cleanupConversation(sessionId: string): void {
  delete conversationStates[sessionId]
}

/**
 * Get current progress (for UI display)
 */
export function getProgress(sessionId: string): { current: number; total: number } | null {
  const state = conversationStates[sessionId]
  if (!state) return null

  return {
    current: state.currentQuestionIndex + 1,
    total: state.questionFlow.questions.length
  }
}

/**
 * Get the current question without advancing
 */
export function getCurrentQuestion(sessionId: string): Question | null {
  const state = conversationStates[sessionId]
  if (!state || state.isComplete) return null

  return state.questionFlow.questions[state.currentQuestionIndex]
}
