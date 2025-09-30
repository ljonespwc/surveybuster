#!/usr/bin/env npx tsx
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { getAIProvider, getCurrentProviderName } from '../src/lib/ai-provider'
import { matchFAQWithAI } from '../src/lib/faq-ai-matcher'

const testQuestions = [
  "What is the Huberman Lab podcast about?",
  "When are new episodes released?",
  "Can I suggest a guest?",
  "What's the weather like?", // Should not match
  "Tell me about Dr. Huberman's background" // Should use knowledge base
]

async function testProvider(providerName: string) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Testing with ${providerName}`)
  console.log('='.repeat(50))

  // Set the provider
  process.env.AI_PROVIDER = providerName

  // Verify provider is set correctly
  const provider = getAIProvider()
  console.log(`✅ Active Provider: ${provider.getName()}\n`)

  for (const question of testQuestions) {
    console.log(`\n📝 Question: "${question}"`)

    const startTime = Date.now()

    try {
      const result = await matchFAQWithAI(question)
      const elapsed = Date.now() - startTime

      if (result) {
        if ('type' in result && result.type === 'no_match') {
          console.log(`   ❌ No match (${elapsed}ms)`)
          console.log(`   Response: ${result.response}`)
        } else {
          const match = result as any // Type assertion for the matched result
          console.log(`   ✅ Matched! (${elapsed}ms)`)
          console.log(`   Category: ${match.category}`)
          console.log(`   Confidence: ${match.confidence}`)
          console.log(`   Response: ${match.naturalAnswer.substring(0, 100)}...`)
        }
      } else {
        console.log(`   ⚠️  No result returned (${elapsed}ms)`)
      }
    } catch (error: any) {
      console.log(`   🔥 Error: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🚀 Testing AI Provider Switching\n')

  // Test OpenAI
  await testProvider('openai')

  // Test Gemini (only if API key is set)
  if (process.env.GEMINI_API_KEY) {
    await testProvider('gemini')

    console.log(`\n${'='.repeat(50)}`)
    console.log('COMPARISON COMPLETE')
    console.log('='.repeat(50))
    console.log('\nTo switch providers in production:')
    console.log('1. Set AI_PROVIDER=gemini in .env.local (or Vercel)')
    console.log('2. Restart the app')
    console.log('3. The app will automatically use Gemini instead of OpenAI')
  } else {
    console.log('\n⚠️  Skipping Gemini test - GEMINI_API_KEY not set in .env.local')
    console.log('Add your Gemini API key to test both providers')
  }
}

main().catch(console.error)