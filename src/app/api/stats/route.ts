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

    // Get match rate from messages
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('matched')

    const matchedCount = messages?.filter(m => m.matched).length || 0
    const totalMessages = messages?.length || 1
    const matchRate = Math.round((matchedCount / totalMessages) * 100)

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

    // Get messages for these sessions
    const sessionIds = recentSessions?.map(s => s.session_id) || []
    const { data: allMessages } = await supabase
      .from('conversation_messages')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })

    // Group messages by session_id
    const messagesBySession = (allMessages || []).reduce((acc, msg) => {
      if (!acc[msg.session_id]) {
        acc[msg.session_id] = []
      }
      acc[msg.session_id].push(msg)
      return acc
    }, {} as Record<string, any[]>)

    // Combine sessions with their messages
    const formattedSessions = recentSessions?.map(session => ({
      ...session,
      messages: messagesBySession[session.session_id] || []
    })) || []

    return NextResponse.json({
      total: total || 0,
      today: todayCount || 0,
      matchRate,
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
      matchRate: 0,
      activeNow: 0,
      recentSessions: []
    })
  }
}