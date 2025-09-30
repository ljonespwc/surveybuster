import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateResponse(message: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for the Huberman Lab podcast.
          You help answer questions about the podcast, Dr. Andrew Huberman, and related topics.
          If you don't know something specific about Huberman Lab, suggest relevant resources or links.
          Keep responses concise and friendly.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const response = completion.choices[0].message.content || 'I couldn\'t generate a response.'

    // Extract any resources or links mentioned
    const resources = extractResources(response)

    return {
      response,
      resources,
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to generate response')
  }
}

function extractResources(text: string): string[] {
  const resources = []

  // Check for common Huberman Lab resources
  if (text.toLowerCase().includes('newsletter')) {
    resources.push('https://www.hubermanlab.com/newsletter')
  }
  if (text.toLowerCase().includes('premium')) {
    resources.push('https://www.hubermanlab.com/premium')
  }
  if (text.toLowerCase().includes('episodes') || text.toLowerCase().includes('podcast')) {
    resources.push('https://www.hubermanlab.com/all-episodes')
  }

  return resources
}