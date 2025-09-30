# Survey Buster - Project Status

## Project Overview
AI-powered voice feedback collection widget for gathering customer insights through natural conversation. The widget appears as a floating button that opens a modal with voice interaction capabilities powered by Layercode's real-time voice AI.

## Supabase Configuration
**Project ID**: `lrjpiddnxnzabjejqfpd`
Always use this project_id when interacting with Supabase MCP tools.

## Current Status: ✅ Feedback Collection System Complete
**Date**: September 30, 2025

### What's Working
- **Voice Feedback Flow**: AI proactively asks questions in a structured interview format
- **Question Progression**: 5-question product feedback flow with conditional follow-ups
- **Sentiment Analysis**: Real-time analysis of user responses (-1 to 1 scale)
- **Progress Tracking**: Visual progress bar showing "Question X of Y"
- **Database Storage**: All responses stored in Supabase with sentiment scores
- **Admin Dashboard**: View feedback sessions with expandable Q&A transcripts
- **One-Line Embed**: `<script src="https://surveybuster.vercel.app/widget.js"></script>`

### Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Voice**: Layercode WebRTC SDK (real-time STT/TTS streaming)
- **AI**: OpenAI GPT-4.1-mini & Google Gemini (switchable via `AI_PROVIDER` env var)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with Framer Motion animations
- **Deployment**: Vercel
- **Icons**: Lucide React

## Architecture

### Core Components (`/src/components/widget/`)
- **VoiceWidget.tsx**: Main widget controller
- **WidgetButton.tsx**: Floating button to open widget
- **WidgetModal.tsx**: Modal container with animations
- **SimplifiedVoiceInterface.tsx**: Voice UI with automatic VAD, progress bar

### API Routes (`/src/app/api/`)
- **`/layercode/authorize`**: Secure session authorization for Layercode
- **`/layercode/webhook`**: SSE webhook handler - core feedback collection logic
- **`/stats`**: Dashboard analytics data
- **`/track`**: Fast atomic session/message tracking
- **`/voice`**: Legacy Web Speech API (unused)

### Business Logic (`/src/lib/`)
- **question-flow-manager.ts**: Question flow state machine with follow-up logic
- **feedback-analyzer.ts**: Sentiment analysis, transition generation, rating extraction
- **feedback-storage.ts**: Database operations for feedback responses and metrics
- **ai-provider.ts**: Abstraction layer for OpenAI/Gemini
- **openai.ts**: GPT-4 integration utilities
- **supabase.ts**: Database client configuration

### Custom Hooks (`/src/hooks/`)
- **useSimpleLayercodeVoice.ts**: Layercode integration with automatic VAD
- **useLayercodeVoice.ts**: Full Layercode integration (with transcription display)
- **useVoice.ts**: Legacy Web Speech API (unused)

## Database Schema

### Core Tables
```sql
-- Session tracking
conversation_sessions (
  session_id TEXT PRIMARY KEY,
  started_at, ended_at,
  total_questions INTEGER,
  completed_questions INTEGER,
  page_url TEXT
)

-- Individual feedback responses
feedback_responses (
  session_id TEXT,
  question_id TEXT,
  question_text TEXT,
  user_response TEXT,
  sentiment_score FLOAT  -- -1 to 1
)

-- Aggregate metrics
feedback_metrics (
  session_id TEXT,
  completion_rate FLOAT,
  total_duration INTEGER,  -- seconds
  sentiment_average FLOAT,
  nps_score INTEGER
)

-- Question flow definitions
question_flows (
  flow_name TEXT,
  questions JSONB,
  is_active BOOLEAN
)

-- Legacy table (minimal usage)
conversation_messages (
  session_id TEXT,
  question TEXT,
  answered BOOLEAN,
  category TEXT
)
```

## User Experience Flow

1. User clicks floating widget button
2. Modal opens with voice interface
3. Layercode automatically connects (shows WiFi icon when ready)
4. AI greets user and asks first question
5. User responds naturally - Layercode detects when they stop (VAD)
6. AI analyzes sentiment, generates natural transition
7. Progress bar updates: "Question X of 5"
8. AI asks next question
9. Repeat until all questions answered
10. Thank you message plays, widget auto-closes after 3 seconds
11. Admin can view responses in dashboard with sentiment scores

## Question Flow System

### Current Active Flow: Product Feedback
```typescript
{
  welcomeMessage: "Hi! I'd love to hear about your experience...",
  questions: [
    { id: 'q1', text: 'How long have you been using our product?', type: 'open' },
    {
      id: 'q2',
      text: 'On a scale of 1 to 10, how satisfied are you?',
      type: 'rating',
      followUp: { /* triggers if rating < 5 */ }
    },
    { id: 'q3', text: 'What feature do you use the most?', type: 'open' },
    { id: 'q4', text: 'What could we improve?', type: 'open' },
    { id: 'q5', text: 'Would you recommend us?', type: 'yes_no' }
  ],
  thankYouMessage: "Thank you for your feedback!"
}
```

Question flows are stored in `/src/lib/question-flow-manager.ts` and can be stored in the `question_flows` Supabase table for dynamic loading.

## Environment Variables

```env
# Layercode (Voice)
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=your_pipeline_id
LAYERCODE_API_KEY=your_api_key
LAYERCODE_WEBHOOK_SECRET=your_webhook_secret

# AI Providers (choose one or both)
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
AI_PROVIDER=openai  # or 'gemini'

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# App
NEXT_PUBLIC_APP_URL=https://surveybuster.vercel.app
USE_STREAMING=true
```

## Widget Installation

Add this single line to any webpage:
```html
<script src="https://surveybuster.vercel.app/widget.js"></script>
```

The widget will appear as a voice button in the bottom-right corner.

## Admin Dashboard

Visit `/admin` to:
- View total feedback sessions (all time & today)
- See completion rates
- Browse recent sessions with expandable Q&A transcripts
- View sentiment analysis (Positive/Neutral/Negative)
- Copy embed code

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server

# Testing
npx tsx scripts/test-phase1.ts  # Test question flow and analyzer modules
```

## Key Features

### AI-Powered Analysis
- **Sentiment Analysis**: Every response scored from -1 (very negative) to 1 (very positive)
- **Natural Transitions**: AI generates contextual phrases like "Great to hear!" or "I understand"
- **Rating Extraction**: Parses numbers from various formats ("8", "eight", "8 out of 10")
- **Skip Detection**: Recognizes when users want to skip questions

### Voice UX
- **Automatic VAD**: No manual controls - just speak naturally
- **Visual Feedback**:
  - Green animation when user is speaking
  - Blue pulse when AI is speaking
  - WiFi icon shows connection status
- **Progress Bar**: Animated bar showing "Question X of Y"
- **Auto-Close**: Widget closes 3 seconds after completion

### Data & Analytics
- **Session Tracking**: Groups responses by user session
- **Completion Metrics**: Tracks which questions were completed
- **Duration Tracking**: Measures time from start to finish
- **Page URL Tracking**: Records which page user was on
- **Export Ready**: Data structured for CSV export (not yet implemented)

## Project Structure

```
surveybuster/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage
│   │   ├── widget/page.tsx       # Widget embed page
│   │   ├── admin/page.tsx        # Admin dashboard
│   │   └── api/
│   │       ├── layercode/
│   │       │   ├── authorize/    # Layercode auth
│   │       │   └── webhook/      # Main feedback logic
│   │       ├── stats/            # Dashboard data
│   │       └── track/            # Fast tracking endpoint
│   ├── components/
│   │   ├── admin/                # Dashboard components
│   │   └── widget/               # Voice widget components
│   ├── lib/
│   │   ├── question-flow-manager.ts  # Question flow system
│   │   ├── feedback-analyzer.ts      # Sentiment & transitions
│   │   ├── feedback-storage.ts       # Database operations
│   │   ├── ai-provider.ts            # OpenAI/Gemini abstraction
│   │   └── supabase.ts               # Supabase client
│   └── hooks/
│       └── useSimpleLayercodeVoice.ts  # Main voice hook
├── public/
│   └── widget.js                 # One-line embed script
├── scripts/
│   └── test-phase1.ts           # Validation tests
└── docs/
    ├── BLUEPRINT.md             # Transformation guide
    └── setup.md                 # Database setup SQL
```

## Layercode Integration

### Architecture
- **Frontend**: React SDK with WebSocket for real-time audio streaming
- **Backend**: Node.js SDK with SSE for streaming responses
- **Pipeline**: Browser → Layercode (STT) → Webhook → AI Analysis → Layercode (TTS) → Browser

### Configuration Steps
1. Create Layercode account at layercode.com
2. Create new pipeline (Webhook SSE API type)
3. Set webhook URL: `https://your-domain.com/api/layercode/webhook`
4. Copy Pipeline ID and API keys to environment variables

### Key Documentation
- React SDK: https://docs.layercode.com/sdk-reference/react_sdk
- Node.js SDK: https://docs.layercode.com/sdk-reference/node_js_sdk
- Webhook SSE API: https://docs.layercode.com/api-reference/webhook_sse_api

## Transformation History

This project was transformed from a Huberman Lab FAQ assistant to a feedback collection widget on September 30, 2025. Key changes:

**Removed:**
- FAQ matching system
- URL extraction and display
- Legacy chat API (`/api/chat`)
- FAQ data files

**Added:**
- Question flow state machine
- Sentiment analysis system
- Progress tracking UI
- Feedback-specific database tables
- Natural transition generation

**Preserved (80% of codebase):**
- All Layercode voice integration
- AI provider abstraction layer
- Widget embed system
- Admin dashboard structure
- Supabase integration
- Component architecture

## Known Limitations

- No authentication system (public access)
- Question flows currently hardcoded (can be moved to Supabase)
- No A/B testing for question variations
- No multi-language support
- No real-time dashboard updates (manual refresh required)
- CSV export not yet implemented

## Future Enhancements

### High Priority
- Dynamic question flow loading from Supabase
- CSV export functionality in admin dashboard
- Real-time sentiment trends chart
- Mobile-optimized modal sizing

### Medium Priority
- A/B testing for question variations
- Multi-language support
- Integration webhooks (Slack, CRM)
- Advanced analytics (word clouds, cohort analysis)

### Low Priority
- User authentication for admin dashboard
- Custom branding options for embed
- Voice tone/speed customization
- Offline response queuing

## Resources

- **Layercode Docs**: https://docs.layercode.com/
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js 14 Docs**: https://nextjs.org/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Google Gemini**: https://ai.google.dev/docs

## Support & Development

For questions or issues:
1. Check BLUEPRINT.md for transformation guidance
2. Review setup.md for database configuration
3. Test locally with `npm run dev` before deploying
4. Use Supabase MCP tools for database operations
5. Check Layercode dashboard for voice connection issues
