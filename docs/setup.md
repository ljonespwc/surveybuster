# Setting Up New Services for Surveybuster

This guide walks you through creating all the necessary services to deploy Surveybuster independently from the original Huberman Lab assistant.

## Prerequisites
- GitHub account
- Vercel account
- Supabase account
- Layercode account (optional for new pipeline)
- OpenAI API key (already have)
- Gemini API key (optional, already have)

## Step 1: Create GitHub Repository

### 1.1 Create New Repository
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `surveybuster`
3. Description: "AI-powered voice feedback collection widget"
4. Set to **Private** (initially)
5. Don't initialize with README (we already have code)
6. Click **Create repository**

### 1.2 Push Local Code
```bash
cd /Users/lancejones/Library/Mobile\ Documents/com~apple~CloudDocs/projects/surveybuster

# Add remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/surveybuster.git

# Create initial commit
git add .
git commit -m "Initial commit - voice feedback widget"

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Create Supabase Project

### 2.1 Create New Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New project**
3. Project name: `surveybuster`
4. Database password: Generate a strong one (save it!)
5. Region: Choose closest to your users
6. Plan: Free tier is fine to start
7. Click **Create new project** (takes 2-3 minutes)

### 2.2 Get Credentials
Once created, go to **Settings → API**:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → `SUPABASE_SERVICE_KEY`

### 2.3 Create Database Tables
Go to **SQL Editor** and run:

```sql
-- Original tables (keep for session tracking)
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_questions INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,  -- renamed from matched_questions
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  question TEXT NOT NULL,
  answered BOOLEAN DEFAULT false,  -- renamed from matched
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New tables for feedback
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  user_response TEXT NOT NULL,
  sentiment_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE question_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_name TEXT NOT NULL,
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feedback_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES conversation_sessions(session_id),
  completion_rate FLOAT,
  total_duration INTEGER,
  sentiment_average FLOAT,
  nps_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_metrics ENABLE ROW LEVEL SECURITY;

-- Create a sample question flow
INSERT INTO question_flows (flow_name, questions, is_active) VALUES (
  'product_feedback',
  '[
    {"id": "q1", "text": "How long have you been using our product?", "type": "open"},
    {"id": "q2", "text": "On a scale of 1 to 10, how satisfied are you?", "type": "rating"},
    {"id": "q3", "text": "What feature do you use the most?", "type": "open"},
    {"id": "q4", "text": "What could we improve?", "type": "open"},
    {"id": "q5", "text": "Would you recommend us to a colleague?", "type": "yes_no"}
  ]'::jsonb,
  true
);
```

## Step 3: Update Environment Variables

### 3.1 Update .env.local
```bash
cd /Users/lancejones/Library/Mobile\ Documents/com~apple~CloudDocs/projects/surveybuster
```

Edit `.env.local` with new Supabase credentials:
```env
# Supabase (UPDATE THESE)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY

# App URL (UPDATE AFTER VERCEL DEPLOY)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Update to Vercel URL later

# Layercode (KEEP SAME FOR NOW)
NEXT_PUBLIC_LAYERCODE_PIPELINE_ID=YOUR_EXISTING_ID
LAYERCODE_API_KEY=YOUR_EXISTING_KEY
LAYERCODE_WEBHOOK_SECRET=YOUR_EXISTING_SECRET

# AI Providers (KEEP SAME)
OPENAI_API_KEY=YOUR_EXISTING_KEY
GEMINI_API_KEY=YOUR_EXISTING_KEY
AI_PROVIDER=gemini  # or openai
```

### 3.2 Test Locally
```bash
npm run dev
```
Visit http://localhost:3000 to verify connection to new Supabase

## Step 4: Deploy to Vercel

### 4.1 Import Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `surveybuster` repository
4. Configure Project:
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build command: `next build`
   - Output directory: `.next`

### 4.2 Add Environment Variables
Before deploying, add all variables from `.env.local`:

Click **Environment Variables** and add each:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_APP_URL` (set to `https://surveybuster.vercel.app` or your custom domain)
- `NEXT_PUBLIC_LAYERCODE_PIPELINE_ID`
- `LAYERCODE_API_KEY`
- `LAYERCODE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (optional)
- `AI_PROVIDER`
- `USE_STREAMING` (set to `true`)

### 4.3 Deploy
Click **Deploy** and wait for build to complete

### 4.4 Update Local .env.local
After deployment, update your local `.env.local`:
```env
NEXT_PUBLIC_APP_URL=https://surveybuster.vercel.app  # Your actual Vercel URL
```

## Step 5: Configure Layercode

You have two options:

### Option A: Create New Pipeline (Recommended for Production)
1. Go to [layercode.com](https://layercode.com) dashboard
2. Create new pipeline
3. Configure:
   - Name: `Surveybuster Feedback`
   - Type: `Webhook SSE API`
   - Webhook URL: `https://surveybuster.vercel.app/api/layercode/webhook`
4. Copy new credentials to Vercel environment variables:
   - `NEXT_PUBLIC_LAYERCODE_PIPELINE_ID`
   - `LAYERCODE_API_KEY`
   - `LAYERCODE_WEBHOOK_SECRET`
5. Redeploy on Vercel to use new credentials

### Option B: Update Existing Pipeline (Quick for Testing)
1. Go to Layercode dashboard
2. Find your existing pipeline
3. Update webhook URL to: `https://surveybuster.vercel.app/api/layercode/webhook`
4. Save changes

## Step 6: Test Production Deployment

### 6.1 Test Widget Embed
Create a test HTML file:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Surveybuster Test</title>
</head>
<body>
    <h1>Test Page</h1>
    <script src="https://surveybuster.vercel.app/widget.js"></script>
</body>
</html>
```

### 6.2 Test Voice Flow
1. Click the widget button
2. Start a conversation
3. Verify it asks questions instead of answering
4. Check Supabase to see if responses are stored

### 6.3 Test Admin Dashboard
Visit: `https://surveybuster.vercel.app/admin`
- Should show feedback responses
- Check session tracking works
- Verify embed code shows correct URL

## Step 7: Update Widget Configuration

### 7.1 Update widget.js
In `/public/widget.js`, update the domain:
```javascript
iframe.src = 'https://surveybuster.vercel.app/widget';
// ...
if (e.origin !== 'https://surveybuster.vercel.app') return;
// ...
fetch('https://surveybuster.vercel.app/api/track', {
```

### 7.2 Commit and Push Changes
```bash
git add .
git commit -m "Update production URLs"
git push
```

Vercel will automatically redeploy.

## Troubleshooting

### Supabase Connection Issues
- Check credentials are copied correctly
- Ensure tables are created
- Check RLS policies if enabled

### Layercode Not Working
- Verify webhook URL is correct
- Check API keys match
- Test with Layercode dashboard tools

### Widget Not Appearing
- Check browser console for errors
- Verify CORS settings in API routes
- Ensure widget.js is loading

### Voice Not Working
- Check browser permissions for microphone
- Verify Layercode pipeline is active
- Check webhook is receiving requests

## Next Steps

Once everything is working:

1. **Customize for your use case**:
   - Modify question flows in database
   - Update welcome/closing messages
   - Adjust UI colors and branding

2. **Set up monitoring**:
   - Vercel Analytics
   - Supabase Dashboard
   - Error tracking (Sentry)

3. **Go live**:
   - Make GitHub repo public (if desired)
   - Add custom domain
   - Create documentation for end users

## Important Notes

- Keep your service keys secure
- Don't commit `.env.local` to Git
- Test thoroughly before sharing widget code
- Monitor Supabase usage to stay within limits
- Consider upgrading plans as usage grows

## Support

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Layercode**: [docs.layercode.com](https://docs.layercode.com)