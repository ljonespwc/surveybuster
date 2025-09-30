# Voice Feedback Collection Widget - Build Blueprint

## Executive Summary
Transform an existing FAQ-answering voice assistant into a proactive customer feedback collection system. This blueprint shows how to adapt 80% of an existing codebase (originally built for Huberman Lab FAQ assistance) into a voice-enabled widget that conducts structured customer interviews to gather product insights.

## Source Codebase Overview
The source project is a production-ready voice assistant with the following architecture:
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Voice**: Layercode WebRTC SDK with streaming TTS/STT
- **AI**: OpenAI GPT-4 / Gemini with provider abstraction
- **Database**: Supabase for session tracking and analytics
- **Deployment**: Vercel with one-line widget embedding
- **UI**: Tailwind CSS with Framer Motion animations

## What You're Building
A voice-enabled widget that website visitors can interact with to provide feedback about their experience with a company's product or service. Instead of answering questions, the AI proactively asks questions, guides the conversation, and collects structured feedback.

### Key Differences from Source
| Original (FAQ Assistant) | New (Feedback Collector) |
|-------------------------|------------------------|
| Answers user questions | Asks users questions |
| Matches against FAQ database | Follows question flow logic |
| Responds to any topic | Guides structured interviews |
| Tracks match rates | Tracks completion rates |
| Shows relevant URLs | Shows progress indicators |

## Technical Stack (100% Preserved)

### Dependencies to Install
```json
{
  "dependencies": {
    "@ai-sdk/google": "^2.0.16",
    "@ai-sdk/openai": "^2.0.35",
    "@google/generative-ai": "^0.24.1",
    "@layercode/node-server-sdk": "^1.2.1",
    "@layercode/react-sdk": "^2.1.3",
    "@supabase/supabase-js": "^2.45.1",
    "ai": "^5.0.52",
    "clsx": "^2.1.1",
    "framer-motion": "^11.3.0",
    "lucide-react": "^0.394.0",
    "next": "14.2.5",
    "openai": "^4.52.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.3.0",
    "zustand": "^4.5.4"
  }
}
```

### Environment Variables Required
```env
# Layercode (Voice)
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id
LAYERCODE_API_KEY=your_api_key
LAYERCODE_WEBHOOK_SECRET=your_webhook_secret

# AI Providers
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key  # Optional
AI_PROVIDER=openai  # or 'gemini'

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
USE_STREAMING=true  # Enable streaming responses
```

## Database Schema Changes

### Original Tables (Keep As-Is)
```sql
-- Keep these tables for session tracking
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_questions INTEGER DEFAULT 0,
  matched_questions INTEGER DEFAULT 0,  -- Rename to 'completed_questions'
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  question TEXT NOT NULL,  -- This becomes the AI's question
  matched BOOLEAN DEFAULT false,  -- Rename to 'answered'
  category TEXT,  -- Repurpose for question category
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Tables to Add
```sql
-- Store user responses to questions
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  user_response TEXT NOT NULL,
  sentiment_score FLOAT,  -- -1 to 1
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Define question flows
CREATE TABLE question_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_name TEXT NOT NULL,  -- e.g., "product_feedback", "onboarding_experience"
  questions JSONB NOT NULL,  -- Array of question objects
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track completion and metrics
CREATE TABLE feedback_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  completion_rate FLOAT,
  total_duration INTEGER,  -- seconds
  sentiment_average FLOAT,
  nps_score INTEGER,  -- if applicable
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## File-by-File Adaptation Guide

### 1. Core Webhook Handler
**Original**: `/src/app/api/layercode/webhook/route.ts`
**Purpose**: Main conversation logic

**Key Changes**:
```typescript
// REPLACE FAQ matching logic with question flow:

// Instead of:
const result = await streamFAQMatch(text, conversationHistory)

// Use:
const nextQuestion = await getNextQuestion(sessionId, userResponse)
const response = await processUserFeedback(userResponse, currentQuestion)

// NEW: Implement conversation state machine
interface ConversationState {
  currentQuestionIndex: number
  questionFlow: QuestionFlow
  responses: FeedbackResponse[]
  isComplete: boolean
}

// Session start changes:
if (type === 'session.start') {
  const welcomeMsg = "Hi! I'd love to hear about your experience with our product. Do you have 2 minutes for a few quick questions?"

  // Initialize question flow
  const flow = await getActiveQuestionFlow()
  conversationStates[sessionId] = {
    currentQuestionIndex: 0,
    questionFlow: flow,
    responses: [],
    isComplete: false
  }
}

// Message handling changes:
if (type === 'message' && text) {
  const state = conversationStates[sessionId]

  // Store user's response
  await storeFeedbackResponse(sessionId, state.currentQuestion, text)

  // Analyze sentiment
  const sentiment = await analyzeSentiment(text)

  // Get next question or complete
  if (state.currentQuestionIndex < state.questionFlow.questions.length - 1) {
    state.currentQuestionIndex++
    const nextQuestion = state.questionFlow.questions[state.currentQuestionIndex]

    // Add contextual transitions
    const transition = getTransitionPhrase(sentiment, text)
    const response = `${transition} ${nextQuestion.text}`

    stream.tts(response)
  } else {
    // Complete the feedback session
    const closingMsg = "Thank you so much for your feedback! Your insights are really valuable to us."
    stream.tts(closingMsg)
    state.isComplete = true

    // Calculate and store metrics
    await calculateAndStoreMetrics(sessionId, state.responses)
  }
}
```

### 2. Question Flow System
**New File**: `/src/lib/question-flow-manager.ts`

```typescript
interface Question {
  id: string
  text: string
  type: 'open' | 'rating' | 'yes_no' | 'multiple_choice'
  options?: string[]
  followUp?: {
    condition: 'negative' | 'positive' | 'specific_answer'
    question: Question
  }
}

interface QuestionFlow {
  id: string
  name: string
  questions: Question[]
  welcomeMessage: string
  thankYouMessage: string
}

// Example flow for product feedback
const productFeedbackFlow: QuestionFlow = {
  id: 'product_feedback_v1',
  name: 'Product Feedback',
  welcomeMessage: "Hi! I'd love to hear about your experience with our product. This will just take 2 minutes.",
  questions: [
    {
      id: 'q1',
      text: "How long have you been using our product?",
      type: 'open'
    },
    {
      id: 'q2',
      text: "On a scale of 1 to 10, how satisfied are you with the product?",
      type: 'rating',
      followUp: {
        condition: 'negative', // If rating < 5
        question: {
          id: 'q2_followup',
          text: "I'm sorry to hear that. What's the main issue you're facing?",
          type: 'open'
        }
      }
    },
    {
      id: 'q3',
      text: "What feature do you use the most?",
      type: 'open'
    },
    {
      id: 'q4',
      text: "Is there anything you wish the product could do that it doesn't currently?",
      type: 'open'
    },
    {
      id: 'q5',
      text: "Would you recommend our product to a colleague?",
      type: 'yes_no',
      followUp: {
        condition: 'specific_answer',
        question: {
          id: 'q5_followup',
          text: "What would need to change for you to recommend it?",
          type: 'open'
        }
      }
    }
  ],
  thankYouMessage: "Thank you so much for your feedback! Your insights help us improve the product for everyone."
}

export async function getNextQuestion(
  sessionId: string,
  previousResponse?: string
): Promise<Question | null> {
  const state = conversationStates[sessionId]

  // Check for follow-up conditions
  if (previousResponse && state.currentQuestion.followUp) {
    if (shouldTriggerFollowUp(previousResponse, state.currentQuestion.followUp.condition)) {
      return state.currentQuestion.followUp.question
    }
  }

  // Move to next question in flow
  if (state.currentQuestionIndex < state.questionFlow.questions.length - 1) {
    state.currentQuestionIndex++
    return state.questionFlow.questions[state.currentQuestionIndex]
  }

  return null // Flow complete
}
```

### 3. AI Provider Modifications
**File**: `/src/lib/ai-provider.ts` (Minimal changes)

Add methods for:
- Sentiment analysis
- Response categorization
- Contextual transition generation

```typescript
// Add to AIProvider interface:
analyzeSentiment(text: string): Promise<number>  // -1 to 1
generateTransition(previousResponse: string, sentiment: number): Promise<string>
categorizeResponse(response: string, categories: string[]): Promise<string>

// Implementation example:
async analyzeSentiment(text: string): Promise<number> {
  const response = await this.generateCompletion([
    {
      role: 'system',
      content: 'Analyze the sentiment of the user response. Return only a number between -1 (very negative) and 1 (very positive).'
    },
    {
      role: 'user',
      content: text
    }
  ], { temperature: 0.3, maxTokens: 10 })

  return parseFloat(response)
}
```

### 4. Voice Interface Component
**File**: `/src/components/widget/SimplifiedVoiceInterface.tsx`

**Changes**:
- Add progress indicator
- Remove URL display logic
- Add question number display

```typescript
// Add progress bar
const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
    <div
      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
      style={{ width: `${(current / total) * 100}%` }}
    />
    <p className="text-xs text-gray-500 mt-1">
      Question {current} of {total}
    </p>
  </div>
)

// Replace URL display with progress
<AnimatePresence>
  {showProgress && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <ProgressBar
        current={currentQuestionIndex + 1}
        total={totalQuestions}
      />
    </motion.div>
  )}
</AnimatePresence>
```

### 5. Admin Dashboard Modifications
**File**: `/src/app/admin/page.tsx`

**Enhancements**:
- Show feedback responses instead of matched questions
- Add sentiment visualization
- Export functionality for responses
- Filter by date range and sentiment

```typescript
// New stats interface
interface FeedbackStats {
  totalSessions: number
  completedSessions: number
  avgCompletionRate: number
  avgSentiment: number
  npsScore: number
  topIssues: string[]
  responses: FeedbackResponse[]
}

// Add export functionality
const exportToCSV = (responses: FeedbackResponse[]) => {
  const csv = responses.map(r =>
    `"${r.session_id}","${r.question}","${r.response}","${r.sentiment}","${r.created_at}"`
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `feedback_${new Date().toISOString()}.csv`
  a.click()
}

// Add sentiment color coding
const getSentimentColor = (sentiment: number) => {
  if (sentiment > 0.5) return 'text-green-600'
  if (sentiment > 0) return 'text-green-400'
  if (sentiment > -0.5) return 'text-yellow-500'
  return 'text-red-500'
}
```

### 6. Widget Embed Script
**File**: `/public/widget.js` (Minimal changes)

Only update:
- Change button color/icon if desired
- Update iframe title for accessibility
- Adjust default size if needed

### 7. Tracking API
**File**: `/src/app/api/track/route.ts`

**Modifications**:
```typescript
// Track feedback-specific metrics
export async function POST(request: Request) {
  const body = await request.json()

  if (body.type === 'feedback_response') {
    // Store individual feedback
    await supabase.from('feedback_responses').insert({
      session_id: body.session_id,
      question_id: body.question_id,
      question_text: body.question_text,
      user_response: body.response,
      sentiment_score: body.sentiment
    })
  }

  if (body.type === 'session_complete') {
    // Calculate and store metrics
    const metrics = await calculateMetrics(body.session_id)
    await supabase.from('feedback_metrics').insert(metrics)
  }

  // Continue with original session tracking...
}
```

## Configuration & Deployment

### 1. Layercode Setup
1. Create account at layercode.com
2. Create new pipeline with "Webhook SSE API" type
3. Configure webhook URL: `https://your-domain.com/api/layercode/webhook`
4. Copy Pipeline ID and API keys to `.env.local`

### 2. Supabase Setup
```bash
# Create tables using Supabase SQL editor
# Run all CREATE TABLE statements from Database Schema section
# Enable RLS policies if needed
```

### 3. Question Flow Configuration
Create initial question flows in Supabase:
```sql
INSERT INTO question_flows (flow_name, questions, is_active) VALUES (
  'product_feedback',
  '[
    {"id": "q1", "text": "How long have you been using our product?", "type": "open"},
    {"id": "q2", "text": "What do you like most about it?", "type": "open"},
    {"id": "q3", "text": "What could we improve?", "type": "open"}
  ]'::jsonb,
  true
);
```

### 4. Deploy to Vercel
```bash
# Push to GitHub
git init
git add .
git commit -m "Initial feedback widget"
git push origin main

# Connect to Vercel
vercel

# Add environment variables in Vercel dashboard
# Deploy
vercel --prod
```

## Testing Checklist

- [ ] Voice connection establishes properly
- [ ] Questions flow in correct order
- [ ] User responses are captured and stored
- [ ] Sentiment analysis works
- [ ] Follow-up questions trigger correctly
- [ ] Session completes and metrics calculate
- [ ] Admin dashboard shows responses
- [ ] Export functionality works
- [ ] Widget embeds on external sites
- [ ] Mobile responsive

## Advanced Features to Add Later

### 1. Dynamic Question Flows
- A/B test different question sets
- Personalize based on user segment
- Conditional branching based on responses

### 2. Multi-language Support
```typescript
const translations = {
  en: { welcome: "Hi! Let's talk about your experience..." },
  es: { welcome: "¡Hola! Hablemos de tu experiencia..." },
  fr: { welcome: "Bonjour! Parlons de votre expérience..." }
}
```

### 3. Integration Webhooks
Send feedback data to:
- Slack (instant notifications)
- CRM systems (Salesforce, HubSpot)
- Analytics platforms (Segment, Amplitude)

### 4. Advanced Analytics
- Sentiment trends over time
- Word cloud from open responses
- Cohort analysis
- Predictive churn scoring

## Common Pitfalls to Avoid

1. **Don't Skip Conversation State Management**: The original uses simple message arrays. You need proper state machine for question flows.

2. **Handle Interruptions Gracefully**: Users might ask "Why do you need this?" or "Skip this question". Build handlers for these.

3. **Respect User Time**: Keep flows under 3 minutes. Show progress. Allow skipping.

4. **Test Voice Recognition**: Different accents, background noise, etc. Layercode handles most, but test edge cases.

5. **Privacy Considerations**: Add clear privacy notice. Don't collect PII without consent.

## Example Implementation Timeline

**Week 1**: Core adaptation
- Set up project from template
- Implement question flow system
- Modify webhook handler
- Test basic flow

**Week 2**: Data & Analytics
- Set up Supabase tables
- Implement response storage
- Add sentiment analysis
- Build metrics calculation

**Week 3**: UI & Polish
- Enhance voice interface
- Update admin dashboard
- Add progress indicators
- Test embed script

**Week 4**: Production Ready
- Add error handling
- Implement retries
- Set up monitoring
- Deploy and test in production

## Support Resources

- **Layercode Docs**: https://docs.layercode.com/
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js 14 Docs**: https://nextjs.org/docs

## Summary

This blueprint provides everything needed to transform the Huberman Lab FAQ assistant into a powerful voice-enabled feedback collection system. The core architecture remains 80% the same - you're primarily changing the conversation flow from reactive (answering) to proactive (asking), and replacing FAQ matching with question flow management.

Key success factors:
1. Reuse all the voice/streaming infrastructure as-is
2. Focus modifications on the webhook handler and conversation logic
3. Keep the same component structure and styling
4. Enhance rather than rebuild the admin dashboard
5. Maintain the simple one-line embed deployment

The result will be a production-ready feedback widget that can be embedded on any website with a single line of code, providing valuable voice-of-customer insights through natural conversation.