#!/usr/bin/env tsx

import { config } from 'dotenv'
import { matchFAQWithAI, validateFAQData } from '../src/lib/faq-ai-matcher'

// Load environment variables
config({ path: '.env.local' })

async function testNewContent() {
  console.log('🚀 Testing New FAQ Content\n')

  // Check if FAQ data is valid
  const validation = validateFAQData()
  console.log('📊 FAQ Data:')
  console.log(`  Total questions: ${validation.totalQuestions}`)
  console.log(`  Categories: ${validation.categories}`)
  console.log(`  Valid: ${validation.isValid}\n`)

  // Test questions for the new book content
  const bookQuestions = [
    "When is Protocols coming out?",
    "When will the book be released?",
    "Can I get a signed copy?",
    "What languages will Protocols be in?",
    "What is the book about?",
    "Where can I buy Protocols?",
    "Tell me about Huberman's book"
  ]

  // Test biographical questions
  const bioQuestions = [
    "Who is Andrew Huberman?",
    "Where did Huberman study?",
    "What university is Huberman at?",
    "Tell me about Dr. Huberman's research",
    "What awards has Huberman won?",
    "What is Scicomm Media?",
    "What did Huberman get his PhD in?"
  ]

  console.log('📚 Testing Book-Related Questions...\n')
  for (const question of bookQuestions) {
    await testQuestion(question)
  }

  console.log('\n👤 Testing Biographical Questions...\n')
  for (const question of bioQuestions) {
    await testQuestion(question)
  }

  console.log('\n✨ Test complete!')
}

async function testQuestion(question: string) {
  console.log(`Q: "${question}"`)

  const start = Date.now()
  const result = await matchFAQWithAI(question)
  const time = Date.now() - start

  if (result) {
    if ('type' in result && result.type === 'no_match') {
      console.log(`❌ No match - Natural response:`)
      console.log(`   "${result.response.substring(0, 100)}..."`)
    } else if ('confidence' in result) {
      const confidence = result.confidence === 'high' ? '✅' : '⚠️'
      console.log(`${confidence} Matched (${result.confidence}): "${result.question.substring(0, 60)}..."`)
      console.log(`   Natural: "${result.naturalAnswer.substring(0, 100)}..."`)
      console.log(`   Category: ${result.category}`)
    }
  } else {
    console.log('❌ Matching failed')
  }
  console.log(`   Time: ${time}ms\n`)
}

// Run the test
testNewContent().catch(console.error)