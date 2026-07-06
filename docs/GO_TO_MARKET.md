# Go-to-Market Plan — Michi Snackie Plan

How to take the app from hobby project to paying subscribers. Companion to `docs/VISION.md` (what we are) and `docs/ROADMAP.md` (build status). Status of GTM prerequisites is tracked in the roadmap as Phase G.

**Positioning in one line:** *The meal planner for people who hate meal planning — five sensible lean meals a day, planned in one tap, no calorie accounting.*

- **Audience:** busy adults (25–45) who want to eat lean/healthy but bounce off heavyweight trackers (MyFitnessPal fatigue), and lapsed dieters who want structure without guilt.
- **Differentiators:** zero-friction onboarding (value before sign-up), auto-fill via a variety engine (not another recipe database), calm non-gamified UX, optional targets instead of mandatory tracking.
- **Anti-pitch (who we're not for):** macro-precision bodybuilders, barcode scanners, social dieters. Say this in marketing too — sharp positioning converts better than broad.

---

## 1. GTM roadmap

| Stage | Goal | Exit criterion |
|---|---|---|
| G0 — Productize | Legally & technically sellable | Landing page, analytics, privacy policy/terms, seeded catalog, deploy stable |
| G1 — Soft launch | Learn from free users | ~100 weekly active users, onboarding funnel measured |
| G2 — Monetize | Payment + plan gating live | First 10 paying subscribers |
| G3 — Paid acquisition | Profitable ad channel | CPA (cost per subscriber) < 1 year of subscription revenue |
| G4 — Retain & scale | Keep subscribers | Monthly churn < 7 %, ads scaled gradually |

Work each stage in order; don't buy ads (G3) before the funnel (G1) and payment (G2) exist — paid traffic into an unmeasured free app is burned money.

## 2. Onboarding journey (first session → habit)

The app's superpower: **anonymous users get a full working day plan with zero sign-up.** Lead with it.

**First 60 seconds (the "aha"):**
1. Land on `/` → see today's five slots immediately (no splash screens, no 12-step wizard).
2. One-tap **✨ Auto-fill day** → a complete, sensible lean day appears. *This is the aha moment — measure time-to-first-filled-day.*
3. Gentle one-liner CTA to set allergies & diet (existing) — optional, skippable.

**First week (habit + account):**
4. Day 2–3: user returns → localStorage plan still works; nudge "Register free to plan tomorrow too" appears only when they try multi-day features (already built: RegisterPrompt).
5. After sign-up: import their local preferences (already built), show the week planner once — don't tour every feature.
6. Optional targets are *offered once, never pushed* (fits vision: no calorie hunting).

**Instrument the funnel** (needed in G0/G1): visit → auto-fill/first meal selected → return visit → registration → week planned → (later) trial started → paid. Use a privacy-friendly analytics tool (e.g. Plausible/PostHog) — cookie-consent burden stays low and it doubles as the ads conversion source.

**Build items for onboarding** (add to roadmap when started):
- [ ] Prominent one-tap "Plan my day" auto-fill for anonymous users on `/` (engine + action already exist — surface it)
- [ ] Funnel analytics events
- [ ] Optional 3-screen intro (value promise → diet quick-pick → done) — only if data shows first-visit drop-off

## 3. Free → paid subscription

**Principle:** the *daily* experience stays free forever (that's the marketing engine and the habit loop); the *planning-ahead* comfort is what people pay for.

| Free | Paid ("Michi Plus") |
|---|---|
| Today's plan, swap/skip meals | Multi-day & week planner |
| Recommendations + diet/allergy filters | ✨ Auto-fill day & week |
| Meal detail + nutrition | Shopping list |
| Registration, favorites, pinned meals | Optional targets & progress |
| | Private "my meals" beyond ~3 |

**Pricing (start simple, adjust with data):** monthly ~€2.99–3.99, yearly ~€24–29 (2 months free), 7-day free trial of Plus at registration — trial converts far better than a hard paywall. One plan only; no tiers until there's a reason.

**Paywall moments** (soft, in-flow — never block the free core): tapping Week/Shopping tabs, auto-filling a future day, adding a 4th private meal. Each shows the same small "Try Plus free for 7 days" sheet.

**Technical prerequisites (Phase G2, add to roadmap when started):**
- [ ] Stripe Checkout + customer portal (web-first; no app stores = no 30 % cut), webhook → `user_subscriptions` table (migration, tri-location rule applies)
- [ ] `isPlusUser()` helper + gating in week/shopping/auto-fill actions and UI
- [ ] Trial state + expiry handling; grace period on failed payment
- [ ] Pricing page + upgrade sheet component

**Retention basics:** monthly "your lean week" email (opt-in), win-back offer at cancellation (pause instead of cancel), exit survey with one question.

## 4. Marketing strategy — Google Ads + Meta Ads

**Foundation first (G0/G1, before spending):**
- Landing page (can be the app's `/` + a `/about` marketing page): one promise, 3 screenshots, social proof placeholder, single CTA ("Plan today free — no sign-up").
- Conversion tracking: Google Ads tag + Meta Pixel/Conversions API, wired to funnel events (registration = primary conversion at first; later: trial start).
- Cookie consent banner (required in the EU for ad pixels).

**Google Ads (intent capture — people already searching):**
- Start with one **Search campaign**, exact/phrase keywords: "meal plan app", "healthy meal planner", "easy meal planning app", "lean eating plan" + negative keywords ("free printable", "pdf", "recipe book").
- Budget: €10–15/day for 2–4 weeks; judge on cost per registration, not clicks.
- Ad copy angle = the anti-pitch: "Meal planning without the tracking obsession. Five lean meals a day, planned in one tap."
- Later: Performance Max only after conversions flow reliably (it needs data to work).

**Meta Ads (demand creation — Instagram/Facebook):**
- Creative is 80 % of Meta performance. Test 3 angles, 2–3 formats each (Reel ≤ 15 s, static screenshot, carousel):
  1. *Relief*: "Deleted my calorie tracker. Still eating lean." (before/after phone screens)
  2. *Speed*: screen-record auto-fill filling a whole day in one tap.
  3. *Identity*: "For people who want to eat well but refuse to weigh rice."
- One Advantage+ campaign, broad targeting (the algorithm finds the audience from creative), €10/day. Add a retargeting audience (visited but didn't register) once traffic exists.
- Kill losing creatives weekly; feed winners more budget. Never edit a winning ad — duplicate and vary.

**KPIs to watch weekly:** CTR (>1 % search, >0.8 % Meta is workable), cost per registration (target < €2–3 at start), registration→trial %, trial→paid % (>25 % is good), and eventually CPA vs. yearly price. Numbers worse than target = fix the landing/onboarding before raising budget.

**Organic support (free, compounding):** post the same short videos to TikTok/Reels/Shorts organically; a simple blog page per diet type for SEO ("easy vegetarian lean meal plan") — low effort, feeds the ads' quality scores too.

## 5. Beginner's manual: running this with AI

You don't need a marketing team — you need a repeatable weekly loop where AI does the drafting and you do the deciding. Rule of thumb: **AI drafts, you approve, small budget tests, data decides.**

**Setup (once):**
- Create a dedicated AI conversation/project (e.g. a Claude Project) and paste in: the positioning line, audience, anti-pitch, pricing, and this document. Every marketing prompt then starts with full context ("context loading") — answers get dramatically better.
- Keep a simple spreadsheet: date, ad/creative name, spend, clicks, registrations, cost per registration. This is what you paste back into the AI each week.

**Task recipes (copy-paste prompts):**
- *Keyword research:* "Act as a Google Ads specialist. Product: [positioning line]. Audience: [audience]. Generate 30 search keywords grouped by intent (high/medium/low), plus 15 negative keywords. Explain the grouping in one sentence each."
- *Ad copy:* "Write 10 Google responsive search ad headlines (max 30 chars) and 4 descriptions (max 90 chars) for [product]. Angle: relief from tracking-app fatigue. No hype words, no emoji, no fake urgency."
- *Meta creative briefs:* "Give me 5 concrete 15-second Reel scripts I can film with just my phone and screen recordings of the app. Hook in the first 2 seconds. Audience: [audience]."
- *Landing page:* "Critique this landing page copy for conversion: [paste]. Rewrite it once for clarity, once for emotion. Keep the 'no calorie counting' promise central."
- *Weekly review:* "Here are this week's ad results: [paste spreadsheet rows]. Which ads should I kill, keep, or scale? What single experiment should I run next week? Reason from cost per registration, not clicks."
- *Competitor scan (quarterly):* "List the main meal-planning apps' positioning and pricing, then tell me which positioning gap Michi Snackie Plan should double down on."

**The weekly loop (≈1–2 h/week):**
1. Monday: paste last week's numbers into the AI → get kill/keep/scale + one experiment.
2. Ask the AI to draft the new ad copy/creative script for that experiment.
3. You film/screenshot (AI can't know your app better than a real screen recording), launch, spend small.
4. Log numbers during the week. Repeat.

**Guardrails:** never let AI invent metrics or health claims ("lose 5 kg in a week" = ad rejection + legal risk); always check character limits and platform ad policies before submitting; keep claims about the app honest — the product must deliver the ad's promise in the first 60 seconds.

---

*Written 2026-07. Revisit pricing and channel choices after G1 real-user data — every number above is a starting hypothesis, not a decision.*
