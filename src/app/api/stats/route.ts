import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get total sessions
    const { count: total } = await supabase
      .from('conversation_sessions')
      .select('*', { count: 'exact', head: true })

    // Get today's sessions
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('conversation_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // Get completion rate from sessions
    const { data: sessions } = await supabase
      .from('conversation_sessions')
      .select('total_questions, completed_questions')

    let totalQuestions = 0
    let completedQuestions = 0

    sessions?.forEach(s => {
      totalQuestions += s.total_questions || 0
      completedQuestions += s.completed_questions || 0
    })

    const completionRate = totalQuestions > 0
      ? Math.round((completedQuestions / totalQuestions) * 100)
      : 0

    // Get active sessions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const { count: activeNow } = await supabase
      .from('conversation_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('ended_at', fiveMinutesAgo.toISOString())

    // Get recent sessions (last 10 sessions)
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Log any errors for debugging
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
    }

    // Get feedback responses for these sessions
    const sessionIds = recentSessions?.map(s => s.session_id) || []
    const { data: allResponses } = await supabase
      .from('feedback_responses')
      .select('*')
      .in('session_id', sessionIds)
      .order('sequence_number', { ascending: true })
      .order('created_at', { ascending: true })

    // Group responses by session_id
    const responsesBySession = (allResponses || []).reduce((acc, resp) => {
      if (!acc[resp.session_id]) {
        acc[resp.session_id] = []
      }
      acc[resp.session_id].push(resp)
      return acc
    }, {} as Record<string, any[]>)

    // Combine sessions with their responses
    const formattedSessions = recentSessions?.map(session => ({
      ...session,
      responses: responsesBySession[session.session_id] || []
    })) || []

    return NextResponse.json({
      total: total || 0,
      today: todayCount || 0,
      completionRate,
      activeNow: activeNow || 0,
      recentSessions: formattedSessions
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({
      total: 0,
      today: 0,
      completionRate: 0,
      activeNow: 0,
      recentSessions: []
    })
  }
}