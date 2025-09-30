import faqData from '../../docs/huberman_lab_faqs.json'

interface FAQMatch {
  question: string
  answer: string
  confidence: number
  category: string
  resources?: string[]
}

export async function matchFAQ(userQuestion: string): Promise<FAQMatch | null> {
  const normalizedQuestion = userQuestion.toLowerCase().trim()

  let bestMatch: FAQMatch | null = null
  let highestScore = 0

  // Iterate through all categories and questions
  for (const category of faqData.categories) {
    for (const qa of category.questions) {
      const score = calculateSimilarity(normalizedQuestion, qa.question.toLowerCase())

      if (score > highestScore && score > 0.6) {
        highestScore = score
        bestMatch = {
          question: qa.question,
          answer: qa.answer,
          confidence: score,
          category: category.name,
          resources: extractResourcesFromAnswer(qa.answer),
        }
      }
    }
  }

  // If we found a good match, return it
  if (bestMatch) {
    return bestMatch
  }

  // Try keyword-based matching as a fallback
  return keywordMatch(normalizedQuestion)
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/)
  const words2 = str2.split(/\s+/)

  const set1 = new Set(words1)
  const set2 = new Set(words2)

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  if (union.size === 0) return 0

  // Jaccard similarity with bonus for exact phrase matches
  let similarity = intersection.size / union.size

  // Check for exact phrase matches
  if (str1.includes(str2) || str2.includes(str1)) {
    similarity += 0.3
  }

  return Math.min(similarity, 1)
}

function keywordMatch(question: string): FAQMatch | null {
  const keywordMap: Record<string, string[]> = {
    'premium': ['premium', 'subscription', 'member', 'cost', 'price'],
    'newsletter': ['newsletter', 'email', 'subscribe'],
    'episodes': ['episode', 'podcast', 'listen', 'watch', 'schedule'],
    'huberman': ['andrew', 'huberman', 'credentials', 'who is'],
    'sponsors': ['sponsor', 'advertising', 'partnership'],
    'events': ['event', 'speaking', 'live', 'conference'],
    'merchandise': ['merch', 'shop', 'merchandise', 'store'],
  }

  for (const [key, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (question.includes(keyword)) {
        // Find the first FAQ in the relevant category
        const category = faqData.categories.find(
          cat => cat.name.toLowerCase().includes(key)
        )

        if (category && category.questions.length > 0) {
          const qa = category.questions[0]
          return {
            question: qa.question,
            answer: qa.answer,
            confidence: 0.5,
            category: category.name,
            resources: extractResourcesFromAnswer(qa.answer),
          }
        }
      }
    }
  }

  return null
}

function extractResourcesFromAnswer(answer: string): string[] {
  const resources = []

  // Extract URLs from the answer
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = answer.match(urlRegex)

  if (urls) {
    resources.push(...urls)
  }

  // Add common resources based on content
  if (answer.toLowerCase().includes('hubermanlab.com')) {
    resources.push('https://www.hubermanlab.com')
  }

  return [...new Set(resources)] // Remove duplicates
}