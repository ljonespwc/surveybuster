#!/usr/bin/env tsx

/**
 * Test script for AI-based FAQ matching
 * Run with: npx tsx scripts/test-ai-matcher.ts
 */

import dotenv from 'dotenv'
import { matchFAQWithAI, validateFAQData } from '../src/lib/faq-ai-matcher'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testAIMatcher() {
  console.log('🚀 AI FAQ Matcher Test\n')

  // Validate FAQ data first
  const validation = validateFAQData()
  console.log('📊 FAQ Data:')
  console.log(`  Total questions: ${validation.totalQuestions}`)
  console.log(`  Categories: ${validation.categories}`)
  console.log(`  Valid: ${validation.isValid}\n`)

  if (!validation.isValid) {
    console.error('❌ FAQ data is invalid!')
    return
  }

  // Test questions with various phrasings
  const testQuestions = [
    // Direct matches
    'What is Huberman Lab?',
    'How much does premium cost?',

    // Rephrased versions
    'Tell me about the Huberman podcast',
    "What's the price for subscription?",
    'How expensive is premium?',
    'When do episodes drop?',
    'Where can I watch the show?',

    // Typos and casual language
    'wat is hubermen lab?',
    'how do i get prenium?',
    'when r new eps?',

    // Intent-based
    'I want to subscribe to the newsletter',
    'How do I contact Andrew?',
    'Can I suggest a guest?',

    // Should not match
    'What is the meaning of life?',
    'How do I cook pasta?',
    'Tell me about quantum physics'
  ]

  console.log('🧪 Testing AI matching...\n')

  for (const question of testQuestions) {
    console.log(`Q: "${question}"`)
    const startTime = Date.now()

    const result = await matchFAQWithAI(question)
    const elapsed = Date.now() - startTime

    if (result) {
      if ('type' in result && result.type === 'no_match') {
        console.log(`❌ No match - Natural response:`)
        console.log(`   "${result.response}"`)
        console.log(`   Time: ${elapsed}ms\n`)
      } else {
        // Type guard - we know it's a FAQMatch here
        const match = result as any // FAQMatch type
        console.log(`✅ Matched (${match.confidence}): "${match.question.substring(0, 60)}..."`)
        console.log(`   Natural: "${match.naturalAnswer?.substring(0, 100)}..."`)
        console.log(`   Category: ${match.category}`)
        console.log(`   Time: ${elapsed}ms\n`)
      }
    } else {
      console.log(`⚠️ Error: No response from AI`)
      console.log(`   Time: ${elapsed}ms\n`)
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('✨ Test complete!')
}

// Run the test
testAIMatcher().catch(console.error)