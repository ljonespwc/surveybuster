import { extractURLsFromAnswer } from '../src/lib/url-extractor'

// Test with various FAQ answers
const testAnswers = [
  {
    question: "Do you have merchandise?",
    answer: "Yes. Merch is available at shop.hubermanlab.com."
  },
  {
    question: "Can I suggest guests?",
    answer: "We don't accept inbound pitches, but you're welcome to share guest suggestions using this form."
  },
  {
    question: "Can I view publications?",
    answer: "Yes. You can view Dr. Huberman's scientific publications on his Stanford lab website."
  },
  {
    question: "How do I change my password?",
    answer: "Navigate to www.supercast.com and click Log In."
  }
]

console.log('Testing URL extraction:\n')

testAnswers.forEach(({ question, answer }) => {
  console.log(`Q: ${question}`)
  console.log(`A: ${answer}`)
  const result = extractURLsFromAnswer(answer)
  console.log('Extracted:', result)
  console.log('---\n')
})