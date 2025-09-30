import { createClient } from '@supabase/supabase-js'

/**
 * Database helper functions for storing feedback responses
 * Handles all Supabase interactions for the feedback collection system
 */

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

/**
 * Store a single feedback response in the database
 */
export async function storeFeedbackResponse(
  sessionId: string,
  questionId: string,
  questionText: string,
  userResponse: string,
  sentimentScore?: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('feedback_responses')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        question_text: questionText,
        user_response: userResponse,
        sentiment_score: sentimentScore
      })

    if (error) {
      console.error('Failed to store feedback response:', error)
      throw error
    }

    console.log(`✅ Stored feedback response for session ${sessionId}, question ${questionId}`)
  } catch (error) {
    console.error('Error storing feedback response:', error)
    // Don't throw - we don't want to break the conversation flow
  }
}

/**
 * Update conversation session with completion metrics
 */
export async function updateSessionMetrics(
  sessionId: string,
  completedQuestions: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        completed_questions: completedQuestions,
        ended_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Failed to update session metrics:', error)
      throw error
    }

    console.log(`✅ Updated session ${sessionId} with ${completedQuestions} completed questions`)
  } catch (error) {
    console.error('Error updating session metrics:', error)
  }
}

/**
 * Calculate and store aggregate feedback metrics
 */
export async function calculateAndStoreMetrics(
  sessionId: string,
  responses: Array<{
    questionId: string
    questionText: string
    userResponse: string
    sentiment?: number
  }>
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    // Calculate metrics
    const totalResponses = responses.length
    const sentimentScores = responses.filter(r => r.sentiment !== undefined).map(r => r.sentiment!)
    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
      : 0

    // Get session start time to calculate duration
    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('started_at')
      .eq('session_id', sessionId)
      .single()

    let totalDuration = 0
    if (session?.started_at) {
      const startTime = new Date(session.started_at).getTime()
      const endTime = Date.now()
      totalDuration = Math.floor((endTime - startTime) / 1000) // seconds
    }

    // Calculate completion rate (responses / total questions in flow)
    // For now, assuming completion rate is 100% if we reach this point
    const completionRate = 1.0

    // Extract NPS score if there was a rating question
    let npsScore = null
    for (const response of responses) {
      if (response.questionText.toLowerCase().includes('recommend')) {
        // Try to extract a yes/no or rating
        const lowerResponse = response.userResponse.toLowerCase()
        if (lowerResponse.includes('yes')) {
          npsScore = 10
        } else if (lowerResponse.includes('no')) {
          npsScore = 0
        }
      }
    }

    // Store metrics
    const { error } = await supabase
      .from('feedback_metrics')
      .insert({
        session_id: sessionId,
        completion_rate: completionRate,
        total_duration: totalDuration,
        sentiment_average: avgSentiment,
        nps_score: npsScore
      })

    if (error) {
      console.error('Failed to store feedback metrics:', error)
      throw error
    }

    console.log(`✅ Stored metrics for session ${sessionId}:`, {
      completionRate,
      totalDuration,
      avgSentiment: avgSentiment.toFixed(2),
      npsScore
    })
  } catch (error) {
    console.error('Error calculating/storing metrics:', error)
  }
}

/**
 * Create or update conversation session
 * Ensures session exists before storing messages
 */
export async function ensureSession(
  sessionId: string,
  pageUrl?: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    // Try to get existing session
    const { data: existing } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!existing) {
      // Create new session
      const { error } = await supabase
        .from('conversation_sessions')
        .insert({
          session_id: sessionId,
          page_url: pageUrl || '',
          started_at: new Date().toISOString(),
          total_questions: 0,
          completed_questions: 0
        })

      if (error) {
        console.error('Failed to create session:', error)
        throw error
      }

      console.log(`✅ Created new session: ${sessionId}`)
    }
  } catch (error) {
    console.error('Error ensuring session exists:', error)
  }
}

/**
 * Store a conversation message (for tracking)
 * This stores each question asked during the feedback collection
 */
export async function storeConversationMessage(
  sessionId: string,
  questionText: string,
  category?: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        session_id: sessionId,
        question: questionText,
        answered: true, // In feedback collection, we always get an answer
        category: category || 'feedback'
      })

    if (error) {
      console.error('Failed to store conversation message:', error)
      throw error
    }

    // Note: total_questions count would be updated by a trigger or in updateSessionMetrics

  } catch (error) {
    console.error('Error storing conversation message:', error)
  }
}
