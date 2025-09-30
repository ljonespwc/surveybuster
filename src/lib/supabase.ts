import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (to be generated from Supabase)
export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  keywords: string[]
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  session_id: string
  question: string
  answer: string
  confidence: number
  type: 'faq' | 'ai'
  created_at: string
}

// FAQ Database functions
export async function getFAQs() {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('category', { ascending: true })

  if (error) {
    console.error('Error fetching FAQs:', error)
    return []
  }

  return data
}

export async function searchFAQs(query: string) {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .textSearch('question', query)

  if (error) {
    console.error('Error searching FAQs:', error)
    return []
  }

  return data
}

// Analytics functions
export async function logChatSession(session: Omit<ChatSession, 'id' | 'created_at'>) {
  const { error } = await supabase
    .from('chat_sessions')
    .insert([session])

  if (error) {
    console.error('Error logging chat session:', error)
  }
}