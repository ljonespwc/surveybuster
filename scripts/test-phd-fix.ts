import { extractURLsFromAnswer } from '../src/lib/url-extractor'

// Test with answers containing Ph.D and other abbreviations
const testAnswers = [
  {
    question: "Who is Andrew Huberman?",
    answer: "Andrew Huberman, Ph.D., is a neuroscientist and tenured professor in the department of neurobiology, and by courtesy, psychiatry and behavioral sciences at Stanford School of Medicine."
  },
  {
    question: "Credentials",
    answer: "He received his Bachelor's degree from the University of California, Santa Barbara, his Master's degree from the University of California, Berkeley, and his PhD from the University of California, Davis."
  },
  {
    question: "Merchandise",
    answer: "Yes. Merch is available at shop.hubermanlab.com."
  },
  {
    question: "Company",
    answer: "The company, Huberman Lab Inc., is based in California."
  }
]

console.log('Testing URL extraction with Ph.D fix:\n')

testAnswers.forEach(({ question, answer }) => {
  console.log(`Q: ${question}`)
  console.log(`A: ${answer.substring(0, 100)}...`)
  const result = extractURLsFromAnswer(answer)
  console.log('Extracted URLs:', result.links.length > 0 ? result.links : 'None')
  console.log('---\n')
})