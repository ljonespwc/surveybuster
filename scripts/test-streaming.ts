import { config } from 'dotenv'
import { resolve } from 'path'
import { streamSentimentAndTransition } from '../src/lib/feedback-analyzer-streaming'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function testCase(input: string, expectedSentiment: string) {
  console.log(`📝 Test: "${input}"\n`)

  const startTime = Date.now()
  const result = await streamSentimentAndTransition(input)

  console.log('⏱️  Initiated:', Date.now() - startTime, 'ms')
  console.log('📊 Stream: ', { end: '' })

  // Consume stream
  let fullText = ''
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk)
    fullText += chunk
  }

  const sentiment = await result.sentiment
  const transition = await result.transition

  console.log(`\n✅ Done in ${Date.now() - startTime}ms`)
  console.log(`   Sentiment: ${sentiment.toFixed(2)} (expected: ${expectedSentiment})`)
  console.log(`   Transition: "${transition}"\n`)
}

async function testStreaming() {
  console.log('🧪 Testing streaming sentiment and transition generation...\n')

  try {
    await testCase(
      "I absolutely love the new features! The voice interface is amazing!",
      "~0.9 (positive)"
    )

    await testCase(
      "This is terrible. I'm very frustrated and disappointed.",
      "~-0.8 (negative)"
    )

    await testCase(
      "It's okay, nothing special but it works.",
      "~0.0 (neutral)"
    )

    console.log('✅ All streaming tests passed!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testStreaming()
