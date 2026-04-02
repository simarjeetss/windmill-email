# ReachKit.ai


## Technology Stack

### Core Technologies
- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Backend (App Logic + Realtime)**: Convex
- **Database (Durable Events + Analytics)**: PostgreSQL (Supabase for quick setup)
- **Auth**: Supabase Auth (built-in)
- **AI**: OpenAI API (GPT-4)
- **Email**: Resend (simple API, generous free tier)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

### What We're Skipping for Prototype
- Vector databases (use simple JSON storage)
- Redis/caching layer
- Queue systems
- Payment integration
- Advanced agent orchestration
- Mobile app
- Multiple integrations

---

## Simplified Architecture (Hybrid)

```
User Interface (Next.js)
    ↓
Convex (queries/mutations/actions + realtime)
    ↓
┌─────────┬──────────┬─────────┐
│         │          │         │
Supabase  OpenAI    Resend
(Auth+DB)  (AI)    (Email)
```

---

## Data Model (Hybrid, Minimal)

```sql
-- Core entities (Convex)

campaigns
- id, user_id, name, status, created_at

contacts
- id, campaign_id, email, first_name, last_name, company

emails
- id, campaign_id, subject, body_template, send_delay_hours

-- Durable event history + analytics (Supabase/Postgres)

users (handled by Supabase Auth)

sent_emails
- id, email_id, contact_id, sent_at, opened_at, clicked_at
```

---

## Prototype Features

## Phase 1: Basic Setup

### Project Setup
- Initialize Next.js project with TypeScript
- Set up Supabase project (database + auth)
- Configure Tailwind CSS + shadcn/ui
- Create basic layout (navbar, sidebar, main content)
- Deploy to Vercel

### Authentication
- Sign up / Login pages
- Protected routes
- User session management
- Simple dashboard redirect after login

**Deliverable**: User can sign up, log in, and see empty dashboard

---

## Phase 2: Campaign & Contact Management

### Campaign Creation
- Create new campaign form (just name + status)
- List all campaigns (simple table)
- View single campaign detail page
- Delete campaign

### Contact Management
- Add contacts manually (form with email, first name, last name)
- CSV import (basic parsing)
- List contacts in a campaign
- Delete contacts

**Deliverable**: User can create campaigns and add contacts

---

## Phase 3: AI Email Generation

### Simple Email Composer
- Create email template with subject + body
- Add placeholder variables: `{{first_name}}`, `{{company}}`, etc.
- Email preview with actual contact data

### AI Writer Integration
- "Generate with AI" button
- Simple prompt: "Write a professional cold email for [contact info] about [campaign goal]"
- Display generated email
- Allow editing before saving
- Save template to campaign

### Basic Personalization
- Replace variables when sending
- Store email template per campaign (just one email for now)

**Deliverable**: User can generate AI-written emails with basic personalization

---

## Phase 4: Email Sending 

### Send Configuration
- Set campaign to "ready" status
- Preview emails before sending
- "Send Now" button (sends to all contacts immediately)

### Email Delivery
- Integrate Resend API
- Send personalized emails to each contact
- Track sent status in database
- Handle basic errors (log to console for prototype)

### Basic Tracking
- Track email opens (tracking pixel)
- Track link clicks
- Store events in database

**Deliverable**: Functional email sending with basic tracking

---

## Phase 5: Simple Follow-ups

### Follow-up Logic
- Add 1-2 follow-up emails per campaign
- Set delay in hours (e.g., send follow-up after 48 hours)
- Only send if previous email was opened (simple condition)

### Execution
- Create simple cron job (Vercel Cron or API route)
- Check for pending follow-ups every hour
- Send follow-ups based on conditions

**Deliverable**: Automatic follow-up emails based on opens

---

## Phase 6: Basic Analytics

### Campaign Dashboard
- Total emails sent
- Open rate
- Click rate
- List of contacts with their status (sent, opened, clicked)

### Simple Visualizations
- Bar chart showing open/click rates
- Timeline of email sends
- Contact engagement table

**Deliverable**: Basic analytics showing campaign performance

---

## Phase 7: AI Memory

### Simple Context Storage
- Store user's successful email examples in database (JSON field)
- When generating new emails, include past examples in prompt
- "Learn from this email" button to save good examples

### Writing Style Learning
- Analyze user's edited emails
- Extract tone, length, structure preferences
- Apply these preferences in future generations

**Deliverable**: AI learns from user's writing style over time

---


## Success Criteria for Prototype

The prototype is successful if:

1. User can create an account
2. User can import/add 10+ contacts
3. AI generates a decent cold email
4. Emails are delivered successfully
5. System sends 1 follow-up automatically
6. Basic analytics show open/click rates
7. AI improves with user feedback

---

## Features(initially)

[] Setup + Auth  
[] Campaigns + Contacts  
[] AI Integration + Email Sending  
[] Follow-ups  
[] Analytics + Memory  
[] Testing + Polish  

---

## Minimal Tech Requirements

### APIs Needed
- Supabase
- OpenAI API or any other 
- Resend (free tier)

## Key Code Structure

```
app/
├── (auth)/
│   ├── login/
│   └── signup/
├── (dashboard)/
│   ├── campaigns/
│   │   ├── page.tsx              # List campaigns
│   │   ├── new/page.tsx          # Create campaign
│   │   └── [id]/
│   │       ├── page.tsx          # Campaign detail
│   │       ├── contacts/         # Manage contacts
│   │       ├── compose/          # Write email
│   │       └── analytics/        # View stats
│   └── layout.tsx
├── api/
│   ├── campaigns/
│   ├── contacts/
│   ├── ai/generate/
│   ├── emails/send/
│   └── cron/followups/
└── layout.tsx

lib/
├── supabase.ts          # Database client
├── openai.ts            # AI functions
├── resend.ts            # Email functions
└── utils.ts             # Helpers
```

---