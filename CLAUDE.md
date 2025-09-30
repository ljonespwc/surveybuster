# Huberman Lab Voice Assistant - Project Status

## Project Overview
Building a voice-enabled AI assistant widget for the Huberman Lab website that helps visitors find answers to frequently asked questions through natural conversation. The widget appears as a small button on the page that opens a modal with voice interaction capabilities.

## Supabase Configuration
**Project ID**: `qkotdvjrsyzdcgwqsqyc`
Always use this project_id when interacting with Supabase MCP tools.

## IMPORTANT: FAQ Data Management
**DO NOT MODIFY** the `/docs/huberman_lab_faqs.json` file without explicit user request. This file contains carefully curated FAQ content including specific Airtable form URLs that were manually added. Only make changes to this file when specifically instructed by the user, and only modify exactly what is requested.

## Recent Updates (Sept 25, 2025 - Evening)

### Streaming Fixes
- **Fixed "No Match" Tracking**: Declined responses now correctly tracked as `matched: false`
  - Added `[NO_MATCH]` marker detection in streaming responses
  - Markers stripped before TTS to keep responses clean
- **Fixed URL Handling**: AI no longer reads URLs character-by-character
  - Added explicit prompt instruction to replace URLs with natural phrases
  - Implemented `[FAQ:NUMBER]` marker to track matched FAQs
  - URLs extracted from original FAQ answers and displayed in widget
  - AI says "using the form" while widget shows clickable "Guest Suggestion Form"

## Recent Updates (Sept 25, 2025 - Afternoon)

### Feature Updates
- **Streaming LLM Responses**: Implemented real-time streaming using Vercel AI SDK
  - Faster perceived response time - users hear the beginning immediately
  - More natural conversation flow with gradual response
  - Better interruption handling during responses
  - Works with both OpenAI and Gemini providers
- **AI Provider Switching**: Easy toggle between GPT-4.1-mini and Gemini-2.5-flash-lite
  - Set `AI_PROVIDER=openai` or `AI_PROVIDER=gemini` in environment
  - Gemini is 3-4x faster (~800ms vs ~3s response time)
  - No code changes needed to switch providers

## Recent Updates (Sept 23, 2025)

### Previous Updates
- **Fixed Database Tracking**: Resolved foreign key constraint issue - sessions must be created before messages
- **Airtable Form URLs Added**: All form references now have actual clickable Airtable URLs
- **Clean URL Display**: Airtable forms show as friendly names (e.g., "Guest Suggestion Form") instead of long URLs
- **Dashboard Caching Fixed**: Added cache-control headers to `/api/stats` for real-time data display
- **Vercel CLI Deployed**: Manual deployment capability added as backup to GitHub integration

## Recent Updates (Sept 22, 2025)

### Morning Updates
- **Admin Dashboard**: MVP analytics at `/admin` with embed code
- **Widget Embed**: Simple one-line script installation
- **Session-Based Tracking**: Conversations now grouped by user session
  - New tables: `conversation_sessions` and `conversation_messages`
  - Dashboard shows expandable/collapsible session groups
  - Tracks duration, total questions, and match rates per session
- **Home Page Update**: Removed widget, added links to `/widget` and `/admin`
- **URL Bug Fix**: Fixed Ph.D and abbreviations showing as URLs
- **Blue Color Update**: Changed to #00AFEF throughout

### Afternoon Updates
- **Expanded FAQ Content**: Added 5 new FAQs about "Protocols" book and knowledge base for biographical questions
  - Total FAQs: 40 (up from 35)
  - New category: "Protocols Book" with release date, signed copies, languages, etc.
  - Added `knowledge_base` section for contextual answers about Dr. Huberman
- **Fixed Dashboard Data Issue**: Resolved Supabase nested select problem
  - Changed from `conversation_messages(*)` join to separate queries
  - Sessions and messages fetched independently then combined
- **Dashboard UX Improvements**:
  - Removed auto-refresh (was every 30 seconds)
  - Sessions maintain user's expand/collapse state
  - Dropped unused `conversations` table from database

### Evening Updates
- **Conversation History**: Implemented full conversation context tracking
  - Webhook handler stores messages with turn_id tracking
  - FAQ matcher now uses conversation history for context-aware responses
  - Enables follow-up questions like "tell me more" or "what about that?"
- **Interruption Handling**: Added support for user interruptions
  - Layercode's interruption_context properly updates partial responses
  - Maintains conversation coherence when user interrupts mid-answer
- **Page URL Tracking**: Added visitor source tracking
  - Stores page_url in database for each session and message
  - Dashboard displays which page visitors were on when asking questions
  - Widget.js captures window.location.href automatically
- **Data Fixes**:
  - Fixed tracking endpoint to be atomic (prevents count mismatches)
  - Removed periods after "Dr" in FAQ JSON (prevents false URL detection)
  - Corrected existing session/message count discrepancies in database

## Current Status: ✅ Production Ready
- **AI FAQ Matching**: GPT-4.1-mini handles all intent (95%+ accuracy, ~300ms)
  - Generates natural conversational responses
  - Polite declines for out-of-scope questions
- **Voice UX**: Layercode with automatic VAD
  - Green animations for user speaking
  - Blue pulse/ring for AI speaking (no bars)
  - Modal header: WiFi (left), title (center), X (right)
- **Welcome**: Mentions covered topics (podcast, premium, newsletter, events)
- **URL Display**: Shows clickable links below voice animation
  - Full URLs displayed (not abbreviated)
  - Actual URLs for all FAQ references (scraped from hubermanlab.com/faq)
  - Links appear during AI response, fade out 3 seconds after
- **Optimized spacing**: Reduced dead space for better visual balance
- Build passing, ready for deployment

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (connected for analytics tracking)
- **Voice**: Layercode (WebSocket + SSE streaming)
- **AI**: OpenAI GPT-4.1-mini
- **State Management**: React hooks + Zustand (installed)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel (planned)

## What's Been Built

### NEW: Admin Dashboard & Widget System
- **`/admin` Dashboard**: View stats, get embed code, see conversations
- **`/widget` Embed**: Standalone page for iframe embedding
- **`widget.js`**: One-line embed script for any website
- **Supabase Analytics**: Session-based tracking with `conversation_sessions` and `conversation_messages` tables
- **API Endpoints**: `/api/track` (fast tracking), `/api/stats` (dashboard data)

### 1. Data Layer
- **FAQ Data**: Scraped from hubermanlab.com/faq
  - 36 Q&A pairs across 9 categories
  - Stored in `/docs/huberman_lab_faqs.json`
  - Categories include: Huberman Lab, Premium, Newsletter, Events, etc.

### 2. Core Components (`/src/components/widget/`)
- **VoiceWidget.tsx**: Main widget controller
- **WidgetButton.tsx**: Floating button to open widget
- **WidgetModal.tsx**: Modal container with animations
- **SimplifiedVoiceInterface.tsx**: Clean voice UI with automatic VAD (no manual controls)

### 3. API Routes (`/src/app/api/`)
- **`/chat`**: Processes questions, matches FAQs, falls back to OpenAI
- **`/voice`**: Legacy Web Speech API handler
- **`/layercode/authorize`**: Secure session authorization for Layercode
- **`/layercode/webhook`**: SSE webhook handler for voice interactions

### 4. Business Logic (`/src/lib/`)
- **faq-ai-matcher.ts**: AI-powered intent matching using GPT-4.1-mini
- **faq-matcher.ts**: Legacy keyword matching (emergency fallback)
- **openai.ts**: GPT-4 integration utilities
- **supabase.ts**: Database client and types (now connected for analytics)
- **url-extractor.ts**: Extracts URLs, filters out Ph.D/abbreviations

### 5. Custom Hooks (`/src/hooks/`)
- **useSimpleLayercodeVoice.ts**: Simplified Layercode integration with automatic VAD
- **useLayercodeVoice.ts**: Full Layercode integration (with transcription display)
- **useVoice.ts**: Legacy Web Speech API
- **useChat.ts**: Chat message handling

## User Experience Flow
1. User clicks floating widget button
2. Modal opens with voice interface
3. User clicks mic once to start conversation
4. User speaks naturally - Layercode detects when they stop (VAD)
5. GPT-4.1-mini analyzes intent against all 35 FAQs
6. If match found: returns FAQ answer directly
7. If no match: polite decline with invitation to ask another question
8. Answer is spoken via Layercode TTS
9. Relevant URLs display below voice animation (if answer contains links)
10. User can continue conversation naturally (no button clicks needed)

## Quick Start

### Widget Installation
Add this single line to any webpage:
```html
<script src="https://hubermanchat.vercel.app/widget.js"></script>
```

### View Analytics
Visit `/admin` to see conversation stats and get the embed code.

## Next Steps Required

### Immediate (Before Testing)
1. **Environment Setup**:
   ```bash
   cp .env.local.example .env.local
   # Add your OpenAI API key to .env.local
   ```

2. **Test Development Server**:
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

### Short Term
1. **GitHub Connection**:
   ```bash
   git remote set-url origin https://github.com/[USERNAME]/hubermanchat.git
   git push -u origin main
   ```

2. **Supabase Setup** (Optional):
   - Create Supabase project
   - Create tables for FAQs and analytics
   - Add credentials to `.env.local`
   - Run migration to populate FAQ data

3. **Testing & Refinement**:
   - Test voice recognition across browsers
   - Refine FAQ matching algorithm
   - Improve error handling
   - Add loading states

### Medium Term
1. **Layercode Integration**: Replace Web Speech API when available
2. **Widget Embed Script**: Create standalone script for external sites
3. **Analytics**: Track usage, popular questions, success rates
4. **Vercel Deployment**: Deploy and configure production environment

## Project Structure
```
hubermanchat/
├── src/
│   ├── app/           # Next.js pages and API routes
│   ├── components/    # React components
│   ├── lib/          # Utilities and integrations
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript definitions
├── docs/             # FAQ data and documentation
├── public/           # Static assets
└── [config files]    # Next, TypeScript, Tailwind configs
```

## Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter (when configured)

# FAQ Testing
npx tsx scripts/test-ai-matcher.ts     # Test AI FAQ matching
```

## AI FAQ System

### Architecture
- **Single API Call**: GPT-4.1-mini matches intent AND generates natural response
- **No Embeddings**: Pure AI understanding (removed 600KB embedded JSON)
- **Response Flow**: Match → Natural answer OR Context-aware decline

### Performance
- ~300ms per query
- 95%+ accuracy
- $0.0002 per query

### Files
- `docs/huberman_lab_faqs.json` - 35 FAQ pairs
- `src/lib/faq-ai-matcher.ts` - AI matcher with natural response generation

## Layercode Integration

### Architecture
- **Frontend**: React SDK with WebSocket for real-time audio streaming
- **Backend**: Node.js SDK with SSE for streaming AI responses
- **Pipeline**: Browser → Layercode (STT) → Webhook → GPT-4.1-mini → Layercode (TTS) → Browser

### Key Layercode Documentation
- **React SDK**: https://docs.layercode.com/sdk-reference/react_sdk
- **Node.js SDK**: https://docs.layercode.com/sdk-reference/node_js_sdk
- **Webhook SSE API**: https://docs.layercode.com/api-reference/webhook_sse_api

### Configuration
- Agent ID: `NEXT_PUBLIC_LAYERCODE_PIPELINE_ID` (in .env.local)
- API Key: `LAYERCODE_API_KEY` (in .env.local)
- Webhook Secret: `LAYERCODE_WEBHOOK_SECRET` (in .env.local)

## Known Limitations
- Layercode requires webhook configuration in their dashboard
- No authentication system (public access only)

## Resources
- FAQ Data Source: https://www.hubermanlab.com/faq
- GitHub Repo: https://github.com/[USERNAME]/hubermanchat
- OpenAI Docs: https://platform.openai.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs