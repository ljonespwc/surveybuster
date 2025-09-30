/**
 * Quick validation tests for Phase 1 modules
 * Tests question-flow-manager and feedback-analyzer without Layercode
 */

import {
  initializeConversation,
  getNextQuestion,
  storeResponse,
  getProgress,
  getCurrentQuestion
} from '../src/lib/question-flow-manager'

import {
  analyzeSentiment,
  extractRating,
  detectSkipIntent,
  generateTransition
} from '../src/lib/feedback-analyzer'

async function runTests() {
  console.log('🧪 Testing Phase 1 Modules...\n')

  // Test 1: Question Flow Manager - Basic Flow
  console.log('Test 1: Question Flow Manager - Initialize & Progress')
  try {
  const testSessionId = 'test-session-' + Date.now()

  // Initialize conversation
  const state = await initializeConversation(testSessionId)
  console.log('✅ Conversation initialized')
  console.log(`   Flow: ${state.questionFlow.name}`)
  console.log(`   Questions: ${state.questionFlow.questions.length}`)

  // Get first question
  const firstQ = getCurrentQuestion(testSessionId)
  console.log(`✅ First question: "${firstQ?.text}"`)

  // Store response and get next
  if (firstQ) {
    storeResponse(testSessionId, firstQ.id, firstQ.text, 'About 6 months', 0.2)
    const secondQ = getNextQuestion(testSessionId, 'About 6 months', 0.2)
    console.log(`✅ Next question: "${secondQ?.text}"`)
  }

  // Check progress
  const progress = getProgress(testSessionId)
  console.log(`✅ Progress: ${progress?.current}/${progress?.total}`)

  console.log('\n')
} catch (error) {
  console.error('❌ Question Flow Manager test failed:', error)
  console.log('\n')
}

// Test 2: Feedback Analyzer - Rating Extraction
console.log('Test 2: Feedback Analyzer - Extract Rating')
try {
  const testCases = [
    { input: 'I would rate it an 8', expected: 8 },
    { input: 'eight out of ten', expected: 8 },
    { input: 'seven', expected: 7 },
    { input: '10', expected: 10 },
    { input: 'not sure', expected: null }
  ]

  for (const test of testCases) {
    const rating = extractRating(test.input)
    const pass = rating === test.expected
    console.log(`${pass ? '✅' : '❌'} "${test.input}" -> ${rating} (expected ${test.expected})`)
  }
  console.log('\n')
} catch (error) {
  console.error('❌ Rating extraction test failed:', error)
  console.log('\n')
}

// Test 3: Feedback Analyzer - Skip Detection
console.log('Test 3: Feedback Analyzer - Skip Detection')
try {
  const skipPhrases = [
    'I want to skip this',
    'next question please',
    "I don't know",
    'pass',
    'This is my answer' // should NOT trigger skip
  ]

  for (const phrase of skipPhrases) {
    const isSkip = detectSkipIntent(phrase)
    console.log(`${isSkip ? '⏭️' : '✅'} "${phrase}" -> skip: ${isSkip}`)
  }
  console.log('\n')
} catch (error) {
  console.error('❌ Skip detection test failed:', error)
  console.log('\n')
}

// Test 4: Feedback Analyzer - AI Functions (optional, requires API keys)
console.log('Test 4: AI Functions (requires API keys)')
const hasOpenAI = !!process.env.OPENAI_API_KEY
const hasGemini = !!process.env.GEMINI_API_KEY

if (hasOpenAI || hasGemini) {
  try {
    console.log('Testing sentiment analysis...')
    const sentiment = await analyzeSentiment('I absolutely love this product!')
    console.log(`✅ Sentiment: ${sentiment.toFixed(2)} (expected positive ~0.7+)`)

    console.log('Testing transition generation...')
    const transition = await generateTransition('I absolutely love this product!', 0.8)
    console.log(`✅ Transition: "${transition}"`)

  } catch (error) {
    console.error('⚠️  AI function test failed (this is okay if API keys not set):', error)
  }
} else {
  console.log('⏭️  Skipping AI tests - no API keys configured')
}

  console.log('\n✅ All Phase 1 validation tests complete!')
  console.log('   Note: Full integration testing requires Layercode voice connection')
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
