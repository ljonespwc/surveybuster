export interface FAQData {
  title: string
  source_url: string
  scraped_at: string
  last_updated: string
  metadata: {
    description: string
    language: string
  }
  categories: FAQCategory[]
  additional_resources: {
    contact: string
    popular_topics: string[]
    tools: {
      ask_huberman_lab: string
      search: string
    }
  }
}

export interface FAQCategory {
  name: string
  questions: FAQItem[]
}

export interface FAQItem {
  question: string
  answer: string
}

export interface ChatResponse {
  response: string
  type: 'faq' | 'ai' | 'error'
  confidence?: number
  resources?: string[]
}

export interface VoiceConfig {
  language?: string
  voice?: string
  pitch?: number
  rate?: number
}

export interface WidgetConfig {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  theme?: 'light' | 'dark' | 'auto'
  primaryColor?: string
  accentColor?: string
}