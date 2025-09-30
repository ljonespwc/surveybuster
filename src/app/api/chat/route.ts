import { NextRequest, NextResponse } from 'next/server'
import { matchFAQ } from '@/lib/faq-matcher'
import { generateResponse } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // First, try to match with FAQ data
    const faqMatch = await matchFAQ(message)

    if (faqMatch) {
      return NextResponse.json({
        response: faqMatch.answer,
        type: 'faq',
        confidence: faqMatch.confidence,
        resources: faqMatch.resources,
      })
    }

    // If no FAQ match, generate a response using OpenAI
    const aiResponse = await generateResponse(message)

    return NextResponse.json({
      response: aiResponse.response,
      type: 'ai',
      resources: aiResponse.resources,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}