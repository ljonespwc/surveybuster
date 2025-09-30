# Surveybuster - Transform Instructions

## Current State
This is a cloned copy of the Huberman Lab Voice Assistant (FAQ answering system).
The codebase is 100% working and tested.

## Your Task
Transform this into a customer feedback collection voice widget following the blueprint in `BLUEPRINT.md`.

## Key Files to Focus On

### Must Modify:
1. `/src/app/api/layercode/webhook/route.ts` - Core conversation logic
2. `/src/lib/faq-ai-matcher-streaming.ts` - Replace with question flow system
3. `/src/components/widget/SimplifiedVoiceInterface.tsx` - Add progress indicators
4. `/src/app/admin/page.tsx` - Show feedback responses instead of FAQ matches
5. `/docs/huberman_lab_faqs.json` - Replace with question flows

### Create New:
1. `/src/lib/question-flow-manager.ts` - Question flow system
2. `/src/lib/feedback-analyzer.ts` - Sentiment analysis
3. Database migrations for new tables

### Keep As-Is:
- All Layercode integration (`/src/hooks/`)
- AI provider abstraction (`/src/lib/ai-provider.ts`)
- Widget embedding (`/public/widget.js`)
- Tracking API structure (`/src/app/api/track/route.ts`)
- All UI components and styles

## Development Steps

1. **Update package.json**
   - Change name from "hubermanchat" to "surveybuster"
   - Update description

2. **Create Question Flow System**
   - Read BLUEPRINT.md section "Question Flow System"
   - Implement `/src/lib/question-flow-manager.ts`

3. **Modify Webhook Handler**
   - Follow BLUEPRINT.md section "Core Webhook Handler"
   - Replace FAQ matching with question progression

4. **Update Database**
   - Create new Supabase tables (see BLUEPRINT.md)
   - Keep existing session tables

5. **Test Core Flow**
   - Run `npm run dev`
   - Test voice conversation flow
   - Verify questions progress correctly

6. **Update UI Components**
   - Add progress bar to voice interface
   - Remove URL display logic
   - Update welcome messages

7. **Enhance Admin Dashboard**
   - Show feedback responses
   - Add sentiment visualization
   - Add CSV export

## Testing Checklist
- [ ] App builds without errors
- [ ] Voice connection works
- [ ] Questions flow in order
- [ ] Responses are stored in database
- [ ] Progress bar updates
- [ ] Session completes properly
- [ ] Admin dashboard shows feedback
- [ ] Widget embeds on external site

## Environment
All environment variables are already configured in `.env.local`.
No changes needed unless you want different Layercode pipeline.

## Important Notes
- DO NOT rebuild from scratch - modify the existing working code
- Test after each major change
- The blueprint in BLUEPRINT.md has all implementation details
- Focus on changing conversation flow, not infrastructure

## Ready to Start
1. Run `npm run dev` to see current FAQ app working
2. Start modifications following the blueprint
3. Test frequently to ensure nothing breaks