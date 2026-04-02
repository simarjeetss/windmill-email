export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; role: string; initials: string };
  date: string;
  readTime: string;
  featured: boolean;
  body: string; // minimal HTML/markdown-style content
};

export const POSTS: Post[] = [
  {
    slug: "cold-email-open-rates-2026",
    title: "What Actually Moves Cold Email Open Rates in 2026",
    excerpt:
      "Subject lines, send times, and sender reputation — we analysed 1.2M emails sent through ReachKit and distilled the findings into six actionable levers.",
    category: "Deliverability",
    author: { name: "Aisha Patel", role: "Head of Growth", initials: "AP" },
    date: "Mar 14, 2026",
    readTime: "6 min",
    featured: true,
    body: `
      <p>Cold email is not dead. It is, however, brutally Darwinian. The inboxes of your prospects are fought over by a thousand senders. Here's what separates the 68% open rate from the 14%.</p>

      <h2>1. Subject line length under 42 characters</h2>
      <p>Our data is unambiguous: subject lines between 28–42 characters consistently outperform longer ones by 11–18 percentage points. Brevity signals confidence. The reader's eye completes a short subject before their guard goes up.</p>

      <h2>2. Personalised preview text</h2>
      <p>The preview snippet is the second headline — it's what the eye jumps to after the subject. Using the prospect's company name or a role-specific hook here boosted opens by 8.3 percentage points in our sample.</p>

      <h2>3. Tuesday–Thursday 9–11 am (recipient's timezone)</h2>
      <p>This advice is almost a cliché, but the data still holds. Sending outside of business hours doesn't hurt opens as much as you'd expect — it only hurts when combined with a weak subject. Respect time zones: a 9 am arrival outperforms noon by ~14% for knowledge workers.</p>

      <h2>4. Domain age and warmup</h2>
      <p>A domain less than 90 days old sending more than 80 emails a day will get flagged. Full stop. If you're using a custom domain, warm it progressively: 20/day the first week, doubling weekly for six weeks. Use SPF, DKIM, and DMARC from day one.</p>

      <h2>5. One clear sender identity</h2>
      <p>Emails from a named human — "Aisha from ReachKit" — consistently outperform company-name senders by 9 percentage points in B2B contexts. People open emails from people.</p>

      <h2>6. Remove unengaged contacts ruthlessly</h2>
      <p>Keeping a list clean is a deliverability strategy. Contacts who haven't opened in 90 days are silently poisoning your sender reputation. Segment them into a re-engagement sequence; if they still don't open, remove them.</p>

      <p>None of these are silver bullets individually. Stack them — and you get a system that compounds.</p>
    `,
  },
  {
    slug: "ai-email-personalization-guide",
    title: "The Right Way to Use AI for Email Personalization",
    excerpt:
      "AI can write at scale, but scale without nuance is noise. Here's a framework for using AI to personalise email outreach without sounding like a robot.",
    category: "AI & Copywriting",
    author: { name: "Marcus Hill", role: "Product Lead", initials: "MH" },
    date: "Mar 7, 2026",
    readTime: "8 min",
    featured: false,
    body: `
      <p>The promise of AI in cold outreach is seductive: one campaign, a thousand perfectly personalised emails, sent at once. The reality is more nuanced — and more interesting.</p>

      <h2>The variable trap</h2>
      <p>Most teams using AI for personalization stop at swapping in <code>{{first_name}}</code> and <code>{{company}}</code>. That's not personalization — that's mail merge. Genuine personalization requires contextual relevance: why is this person, at this company, at this stage of their career, the right fit for this message today?</p>

      <h2>The signal-first framework</h2>
      <p>Before invoking the AI, enrich each contact with at least one strong signal: a recent funding round, a job posting that reveals a pain point, a LinkedIn post that shows their current focus area. Pass that signal as context to the model. The output quality jumps dramatically.</p>

      <h2>Tone mirroring</h2>
      <p>ReachKit's AI learns from your edits. Every time you tweak an AI-drafted email, the model updates its understanding of your voice. After 15–20 edited emails, the output starts to sound genuinely like you. This is not magic — it's retrieval-augmented generation over your own writing history.</p>

      <h2>The three-sentence rule</h2>
      <p>The best cold emails are short: a hook (one sentence), a value proposition (one sentence), and a low-friction ask (one sentence). Train your AI prompts around this structure. Any deviation should be intentional and deliberate.</p>

      <h2>Quality control at scale</h2>
      <p>Even with a well-tuned AI, review a random 10% sample before sending. Look for hallucinated facts, awkward transitions, or tone inconsistencies. A bad AI-written email at scale is worse than no email at all.</p>
    `,
  },
  {
    slug: "follow-up-sequences-that-work",
    title: "Follow-Up Sequences That Get Replies (Without Being Annoying)",
    excerpt:
      "Three follow-ups is the sweet spot. More than that and reply rates plateau while unsubscribe rates climb. Here's how to structure the sequence.",
    category: "Strategy",
    author: { name: "Simarjeet Singh", role: "Founder", initials: "SS" },
    date: "Feb 28, 2026",
    readTime: "5 min",
    featured: false,
    body: `
      <p>The first cold email rarely converts. The follow-up usually does. But most follow-up sequences are either too aggressive, too passive, or too identical to the original email.</p>

      <h2>The 3-touch rule</h2>
      <p>Our data shows diminishing returns after three follow-ups. Sending a fourth or fifth email in a 30-day window doesn't meaningfully increase reply rates — but it does increase unsubscribe rates by 23%. Stop at three.</p>

      <h2>The angles: different, not louder</h2>
      <p>Email 1 leads with the prospect's pain. Email 2 leads with a social proof or result. Email 3 is the "break-up" email — short, direct, and genuinely final. Each email addresses the same underlying value proposition from a different angle. Don't just resend the original with "following up on my email below."</p>

      <h2>Timing matters more than content</h2>
      <p>Day 1, Day 4, Day 9 is the cadence that performs best in our analysis. Day 1 is the original send. Day 4 catches the reader on a different day and mood. Day 9 is the "last chance" moment. Anything tighter feels pressuring; anything looser loses momentum.</p>

      <h2>Pause on reply — immediately</h2>
      <p>This sounds obvious but is often misconfigured: if someone replies — even to unsubscribe — the sequence must stop. ReachKit pauses the sequence the moment any reply hits your inbox, positive or not. Not respecting this is a deliverability and brand trust killer.</p>
    `,
  },
  {
    slug: "building-a-targeted-contact-list",
    title: "How to Build a Targeted Contact List Without Buying Data",
    excerpt:
      "Purchased lists are a deliverability disaster. Here's a repeatable process for building high-quality prospect lists organically — using tools you already have.",
    category: "List Building",
    author: { name: "Priya Nair", role: "Growth Ops", initials: "PN" },
    date: "Feb 19, 2026",
    readTime: "7 min",
    featured: false,
    body: `
      <p>Bought lists are tempting — ten thousand contacts for $99 sounds like a shortcut. In practice they are the fastest route to a blacklisted domain, a zero percent open rate, and a lot of wasted money.</p>

      <h2>The ICP-first approach</h2>
      <p>Before you build a list, define your Ideal Customer Profile with precision: industry, company size (revenue or headcount), tech stack signals, geography, and role/seniority of the buyer. The tighter the definition, the higher the conversion rate of every subsequent email.</p>

      <h2>LinkedIn Sales Navigator filters</h2>
      <p>Navigator's Boolean search across role titles, seniority, company headcount, and geography is the best free-ish list-building tool available. Export your searches into a CSV and enrich with a tool like Apollo or Clay to add verified email addresses.</p>

      <h2>Job postings as buying signals</h2>
      <p>A company hiring a VP of Sales is probably also buying sales tools. A company posting 10 engineering roles is growing and likely open to developer tools and infrastructure products. Use tools like Otta, Lever, or Greenhouse feeds to scrape and monitor job postings as real-time buying signals.</p>

      <h2>Verify before you send</h2>
      <p>Before importing any list into ReachKit, run it through an email verification tool (NeverBounce or Zerobounce). Aim for a bounce rate under 2%. Anything above that will start to damage your sender reputation.</p>
    `,
  },
  {
    slug: "spf-dkim-dmarc-explained",
    title: "SPF, DKIM, and DMARC Explained for Non-Technical Founders",
    excerpt:
      "Three acronyms stand between you and the spam folder. Here's what they mean, why they matter, and how to set them up in under 30 minutes.",
    category: "Deliverability",
    author: { name: "Marcus Hill", role: "Product Lead", initials: "MH" },
    date: "Feb 10, 2026",
    readTime: "9 min",
    featured: false,
    body: `
      <p>If you're serious about cold email, you need to understand three DNS records: SPF, DKIM, and DMARC. This is not optional infrastructure. Without them, Gmail and Outlook are actively deprioritizing your messages.</p>

      <h2>SPF — who is allowed to send on your behalf</h2>
      <p>Sender Policy Framework is a DNS record that lists the mail servers authorised to send email for your domain. If your email comes from a server not in your SPF record, it's treated with suspicion. Setting it up takes one DNS TXT record and about 5 minutes.</p>

      <h2>DKIM — a cryptographic signature on every email</h2>
      <p>DomainKeys Identified Mail attaches a digital signature to every email you send. The recipient's mail server checks the signature against a public key in your DNS. If the signature matches, the email is authenticated. This proves the email was not tampered with in transit.</p>

      <h2>DMARC — the policy that ties SPF and DKIM together</h2>
      <p>DMARC tells recipient servers what to do if SPF or DKIM fails: report it, quarantine the email, or reject it outright. Start with p=none (monitoring only), then move to p=quarantine once you've audited your sending infrastructure.</p>

      <h2>The 30-minute setup</h2>
      <p>1. Go to your DNS provider (Cloudflare, Route53, etc.). 2. Add the SPF TXT record provided by your email sending provider. 3. Add the DKIM TXT record (usually a long key string). 4. Add a DMARC TXT record starting with v=DMARC1; p=none;. 5. Use Google's Toolbox to verify. Done.</p>
    `,
  },
  {
    slug: "campaign-analytics-metrics",
    title: "The Only 4 Cold Email Metrics That Actually Matter",
    excerpt:
      "Open rate, click rate, reply rate, and conversion rate. Everything else is noise. Here's how to interpret each one and what thresholds to aim for.",
    category: "Analytics",
    author: { name: "Aisha Patel", role: "Head of Growth", initials: "AP" },
    date: "Jan 30, 2026",
    readTime: "4 min",
    featured: false,
    body: `
      <p>Cold email dashboards can display twenty metrics. Most of them are vanity. Here are the four that drive decisions.</p>

      <h2>Open rate — the deliverability and subject line metric</h2>
      <p>Target: 45–65% for cold outreach. If you're below 30%, your deliverability is broken (check SPF/DKIM/DMARC) or your subject lines are generic. Open rate alone doesn't correlate with revenue, but it's the prerequisite for everything else.</p>

      <h2>Click rate — the relevance metric</h2>
      <p>Target: 8–20% of opens. Click rate measures whether your email's body and CTA are relevant enough for the reader to take an action. A low click rate despite high opens usually means the email body doesn't match the expectation set by the subject line.</p>

      <h2>Reply rate — the most important metric</h2>
      <p>Target: 5–12% for well-targeted lists. Reply rate is the only metric that directly correlates with pipeline. An email that gets a reply — even a "not interested" — is an email that broke through. Track this above all others.</p>

      <h2>Positive reply rate — the quality metric</h2>
      <p>Out of your replies, what percentage are positive? If you're getting lots of replies but mostly unsubscribes and angry responses, your targeting or messaging is off. Aim for 70%+ of replies being positive or neutral.</p>

      <p>Ignore vanity metrics like total sends, bounce rate trends (unless it spikes), and unsubscribe rate (unless it's above 0.5%). Build your reporting around these four.</p>
    `,
  },
];
