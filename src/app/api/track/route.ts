import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create Supabase client with service key for fast inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sessionId = body.session_id || 'unknown'

    // First, ensure the session exists
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('id, total_questions, matched_questions, page_url')
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !session) {
      // Create new session first (required before we can insert messages due to foreign key constraint)
      const { error: createError } = await supabase
        .from('conversation_sessions')
        .insert({
          session_id: sessionId,
          total_questions: 1,
          matched_questions: body.matched ? 1 : 0,
          page_url: body.page_url || null
        })

      if (createError) {
        console.error('Create session error:', createError)
        return NextResponse.json({ success: false, error: 'Session creation failed' })
      }
    } else {
      // Update existing session counts and optionally set page URL if not set
      const updateData: any = {
        total_questions: (session.total_questions || 0) + 1,
        matched_questions: (session.matched_questions || 0) + (body.matched ? 1 : 0),
        ended_at: new Date().toISOString()
      }

      // Only set page_url if it's not already set in the session
      if (!session.page_url && body.page_url) {
        updateData.page_url = body.page_url
      }

      const { error: updateError } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('session_id', sessionId)

      if (updateError) {
        console.error('Update session error:', updateError)
        return NextResponse.json({ success: false, error: 'Session update failed' })
      }
    }

    // Now insert the message (session exists so foreign key constraint is satisfied)
    const { error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        session_id: sessionId,
        question: body.question || '',
        matched: body.matched || false,
        category: body.category || null
        // page_url removed - stored only in session table
      })

    if (messageError) {
      console.error('Track message error:', messageError)
      // Message insert failed but session was already updated - not ideal but better than nothing
      return NextResponse.json({ success: false, error: 'Message insert failed' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Don't let tracking errors affect the widget
    return NextResponse.json({ success: true })
  }
}

// Allow CORS for widget
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}