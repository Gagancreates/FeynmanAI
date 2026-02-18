# FeynmanAI Beta Release Plan

---

## Phase 1 — Deployment

### Goal
Get the app live on a public URL that beta testers can access.

### Steps

1. **Build the frontend**
   ```bash
   cd agent
   npm run build
   ```
   This outputs the compiled React app to `dist/client/`.

2. **Deploy to Cloudflare Workers**
   ```bash
   npx wrangler deploy
   ```
   This bundles the worker + serves the frontend as static assets.

3. **Set API secrets** (one-time, never commit these)
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put GOOGLE_API_KEY
   npx wrangler secret put SARVAM_API_KEY
   ```

4. **Add a custom domain**
   - Go to Cloudflare Dashboard → Workers → feynmanai → Settings → Domains & Routes
   - Add your domain (e.g. `app.feynmanai.com`)
   - Cloudflare handles SSL automatically

5. **Verify the deploy**
   - Open the live URL
   - Test a full session: type a message, check voice output, check canvas drawing
   - Check Cloudflare dashboard for any worker errors

### Deliverables
- [ ] App is live on `feynmanai.workers.dev`
- [ ] Custom domain pointing to the worker
- [ ] All 3 API secrets set in Cloudflare
- [ ] Manual smoke test passed (type → agent responds → voice plays → canvas draws)

---

## Phase 2 — Access Control

### Goal
Only invited beta testers can access the app. No open public access (protects API costs).

### Approach: Cloudflare Access (Zero Trust)
No code changes needed. Cloudflare puts a login wall in front of the entire worker.

### Steps

1. **Enable Cloudflare Zero Trust**
   - Go to Cloudflare Dashboard → Zero Trust → Access → Applications
   - Click "Add an application" → Self-hosted
   - Set the domain to your app domain

2. **Configure Google OAuth**
   - Under Identity Providers, add Google
   - Testers log in with their Google account
   - No passwords to manage

3. **Create an Access Policy**
   - Policy type: Allow
   - Rule: Emails → add each tester's email address
   - This whitelist controls who gets in

4. **Send invites**
   - Email each tester the app URL
   - First visit prompts Google login
   - If their email is on the list, they're in

5. **Removing access**
   - Remove email from the policy in the dashboard — instant revoke

### Notes
- Free Cloudflare plan supports up to 50 users
- No code changes, no auth library, no database
- Session cookies last 24 hours by default (configurable)

### Deliverables
- [ ] Cloudflare Access enabled on the app domain
- [ ] Google OAuth configured as identity provider
- [ ] Access policy with all beta tester emails
- [ ] Tested login flow end-to-end with one tester email
- [ ] Confirmed non-whitelisted email is blocked

---

## Phase 3 — Cost Protection

### Goal
Prevent a single tester from burning the API budget in one session. Set a hard limit on messages per session.

### Steps

1. **Add a message counter to ChatPanel**
   - Track `messageCount` in state
   - Increment on every `sendToAgent` call
   - Cap at 20 messages per session

2. **Add a soft warning at 15 messages**
   - Show a subtle notice above the input: *"5 messages remaining in this session"*
   - Style it as a muted warning, not an error

3. **Hard stop at 20 messages**
   - Disable the input and mic button
   - Show a message: *"Session limit reached. Start a new chat to continue."*
   - The `+` (new chat) button resets the counter

4. **Monitor API spend**
   - Check Anthropic dashboard weekly: `console.anthropic.com`
   - Check Google AI Studio for Gemini TTS usage
   - Check Sarvam dashboard for STT minutes
   - Set up billing alerts on each platform

### Deliverables
- [ ] Message counter implemented in ChatPanel
- [ ] Soft warning shown at 15 messages
- [ ] Input disabled and message shown at 20 messages
- [ ] New chat resets the counter
- [ ] Billing alerts set on Anthropic, Google, and Sarvam dashboards

---

## Phase 4 — UX Polish

### Goal
Fix the rough edges that testers will hit in their first session. These are high-confidence bug reports if not addressed.

### Steps

1. **Input placeholder text**
   - Add `placeholder="Ask me to explain anything..."` to the textarea in `ChatInput.tsx`
   - Helps first-time users understand what to do immediately

2. **New chat confirmation**
   - The `+` button in the chat header currently resets without warning
   - Add a `window.confirm("Start a new chat? This will clear the current session.")` before calling `agent.reset()`
   - Prevents accidental session wipes

3. **API error handling**
   - Currently if the agent fails, nothing visible happens to the user
   - Add a visible error state in the chat history: *"Something went wrong. Please try again."*
   - Handle network errors in `useVoiceOutput` (TTS fetch failures) with a silent fallback (no audio, text still shows)

4. **System prompt reliability**
   - Claude currently skips the opening Socratic question ~30% of the time and dives straight into explanation
   - Audit and tighten the `FIRST ACTION RULE` section in `tutor-section.ts`
   - Test with 10 different topic prompts before releasing

5. **Voice input feedback**
   - When the mic picks up audio but STT returns empty transcript, show a subtle *"Didn't catch that, try again"* message near the mic button
   - Prevents testers from thinking the app is frozen

### Deliverables
- [ ] Placeholder text in chat input
- [ ] Confirmation dialog on new chat
- [ ] Error message visible in chat when agent fails
- [ ] TTS failure handled gracefully (no crash)
- [ ] System prompt tested with 10 topics, opening question asked every time
- [ ] Empty transcript feedback shown near mic button

---

## Phase 5 — Feedback Loop

### Goal
Collect structured feedback from testers so every session generates actionable insight.

### Steps

1. **Create a Google Form**
   Three questions only (keep it short so testers actually fill it):
   - What topic did you try to learn? *(short answer)*
   - How well did Feynman teach it? *(1–5 scale)*
   - What felt broken or frustrating? *(paragraph)*

2. **Add a feedback button to the UI**
   - Small "Feedback" link in the chat header, next to the `+` button
   - Opens the Google Form in a new tab
   - Style it subtly — it should not compete with the main UI

3. **Set up a response notification**
   - In Google Forms → Responses → enable email notifications
   - You get an email every time a tester submits

4. **Tester briefing doc**
   Write a short brief to send with the invite link:
   - What FeynmanAI is (2 sentences)
   - How to use it (3 bullet points)
   - What to look out for / known issues
   - Link to the feedback form
   - Your contact (WhatsApp/email) for urgent bugs

### Deliverables
- [ ] Google Form created with 3 questions
- [ ] Feedback button in chat header linking to form
- [ ] Email notifications enabled on form responses
- [ ] Tester briefing doc written and ready to send
- [ ] Beta invite sent to first tester

---

## Launch Checklist

Before sending the link to anyone:

```
Phase 1: Deploy
  ✅ App live on custom domain
  ✅ All secrets set
  ✅ Smoke test passed

Phase 2: Access Control
  ✅ Cloudflare Access enabled
  ✅ Tester emails whitelisted
  ✅ Login flow tested

Phase 3: Cost Protection
  ✅ 20-message limit live
  ✅ Billing alerts set

Phase 4: UX Polish
  ✅ Placeholder text
  ✅ New chat confirmation
  ✅ Error handling
  ✅ System prompt reliable

Phase 5: Feedback
  ✅ Feedback button live
  ✅ Tester brief ready
```
