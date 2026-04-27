# Lovify Web-to-App Funnel — Status & Runbook

**Last updated:** 2026-04-26 (session 4 — security hardening, email dedup, session guards, favicon)
**Shared Supabase project:** `pqjqurjdujwforscefov`
**Repos (all under `C:\Users\hp\Documents\GitHub\`):**
- `lovifymusic` — main Vite+Capacitor app (owns Supabase migrations + the Stripe webhook + `src/lib/pricing.ts`)
- `lovify-admin` — Vite+React admin panel where Peter builds funnels + watches analytics
- `lovify-funnel` — Next.js 14 SSR funnel renderer for paid ad traffic (this repo)

> **For future Claude sessions:** this document is the authoritative snapshot of what's built. The three repos are independent deploys sharing one Supabase project. User (Hamza) wears both dev + product hats; Peter is the fictional marketer persona we design admin UX around. When in doubt, verify with `git log` / file reads — this doc may lag by minutes.

> **Where this session ended:** Security hardening pass. Duplicate-email blocking added on both client (onBlur) and server (GET + POST guards). All quiz/step components fixed to redirect back to funnel root when `sessionId` is missing instead of silently advancing. Build passes. Favicon updated from lovifymusic. Stripe test-mode badge explained (live keys needed in Vercel).

---

## 1. System overview

### Three-repo collaboration

```
                        ┌─────────────────────────────┐
                        │   Supabase (pqjqurjdujw...) │
                        │   5 funnel tables + RLS     │
                        └──────────┬──────────────────┘
                                   │  shared DB
           ┌───────────────────────┼─────────────────────────┐
           │                       │                         │
           ▼                       ▼                         ▼
┌──────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
│   lovify-admin   │   │    lovify-funnel     │   │     lovifymusic     │
│  (Vite, 5173)    │   │    (Next.js, 3000)   │   │    (Vite, 8080)     │
│                  │   │                      │   │                     │
│ · Funnels CRUD   │   │ · SSR by slug        │   │ · /set-password     │
│ · Step editor +  │   │ · session cookie     │   │ · Stripe webhook    │
│   live preview   │   │ · Stripe Element     │   │   edge function     │
│ · Plans catalog  │   │ · Catalog-driven     │   │ · pricing.ts (SOURCE│
│ · Analytics      │   │   paywall            │   │   OF TRUTH for plans│
│ · Cache bust ────┼──▶│ · Template registry  │   │                     │
│ · Template       │   │   (lovify-music-v1 + │   │                     │
│   gallery + DnD  │   │    lovify-template-2)│   │                     │
└──────────────────┘   └──────────┬───────────┘   └──────────▲──────────┘
                                  │                          │
                    Stripe Customer + Subscription           │
                    (metadata.funnel_session_id,             │
                     metadata.plan_key, ...)                 │
                                  │                          │
                                  └──────── webhook ─────────┘
                                         (subscription.created + .updated,
                                          gated on status ∈ {active,past_due}
                                          OR (trialing AND default_payment_method))
```

### End-to-end user flow (golden path)

1. **Ad click** — Sarah lands on `funnel.trylovify.com/<slug>?ttclid=X&utm_source=tiktok`.
2. **Middleware** stamps a signed `lfa` cookie (30-day, HS256 via `jose`) with `ttclid|fbclid|gclid|utm_*`. First-touch wins.
3. **SSR** loads the funnel (60-sec cache, tag-revalidated by admin saves), redirects to the first step.
4. **SSR step page** (`/[slug]/[step]`) validates the `lfs` session cookie belongs to *this* funnel. If yes and session is `converted`, redirects to `/success`. If no `email-capture` step in the funnel, auto-mints an empty session row + cookie so analytics has something to attach answers to.
5. **Email capture** → `POST /api/sessions` creates `funnel_sessions`, sets `lfs` cookie, stamps attribution. Email step seeds its input from `priorAnswers[step.step_key].email` so back-nav preserves the value. **Email is checked on blur + on submit for duplicates (see §3.13).**
6. **Quiz steps** → each submit `POST /api/answers` upserts to `funnel_answers` and advances `current_step_key`. **If `sessionId` is missing, redirects back to funnel root instead of silently advancing.**
7. **Paywall** — layout depends on the funnel's template.
8. `/api/payment-intent` creates a Stripe Subscription in `default_incomplete` state with metadata `{funnel_session_id, plan_key, attribution}`. Returns SetupIntent (trial) or PaymentIntent (paid-now) client secret.
9. Stripe `<PaymentElement/>` collects card → `confirmSetup`/`confirmPayment` redirects to `/<slug>/success`.
10. **Success page** routes through the template registry.
11. **Stripe webhook** fires conversion → creates `auth.users`, projects quiz answers → `profiles`, flips session to `converted`.
12. **User clicks recovery email** → `/set-password?from=funnel` on lovifymusic → sets password → iOS app login.

---

## 2. What's built — current state

### 2.1 Supabase migrations (all in `lovifymusic/supabase/migrations/`)

| File | Purpose | Status |
|---|---|---|
| `20260424000000_funnel_system.sql` | 5 tables + RLS | applied remote |
| `20260424000001_funnel_seed.sql` | Seeds `lovify-music-v1` funnel with 10 steps | applied remote |
| `20260424120000_funnels_default_interval.sql` | `funnels.default_interval` column | **run `supabase db push`** |
| `20260424130000_clear_legacy_paywall_plan_keys.sql` | One-shot cleanup of legacy per-step plan keys | **run `supabase db push`** |
| `20260424140000_drop_archived_funnel_status.sql` | Drops `archived` status; folds → paused | **run `supabase db push`** |
| `20260424150000_update_crafting_messages.sql` | Rewrites old music-generation copy | **run `supabase db push`** |
| `20260424160000_expand_funnel_step_types.sql` | Adds `narrative`, `time-picker`, `statement` to step_type CHECK | **run `supabase db push`** |
| `20260425000000_profiles_notification_time.sql` | Adds `profiles.notification_time text` | **run `supabase db push`** |
| `20260425010000_reorder_funnel_steps_rpc.sql` | `reorder_funnel_steps()` RPC for drag-drop | **run `supabase db push`** |
| `20260425020000_funnels_default_template.sql` | Backfills `template = 'lovify-music-v1'` | **run `supabase db push`** |
| `20260425030000_funnels_most_popular_plan_key.sql` | Adds `funnels.most_popular_plan_key text` | **run `supabase db push`** |

### 2.2 lovifymusic — pricing catalog + webhook

Unchanged from session 3. See original §2.2 for webhook gate details.

### 2.3 lovify-admin — funnel authoring + analytics

Unchanged from session 3.

### 2.4 lovify-funnel — this repo

**Session 4 changes:**

#### Favicon
- Replaced `src/app/favicon.ico` with `src/app/icon.png` (copied from `lovifymusic/public/favicon.png`).
- Next.js App Router serves any `icon.png` in the app directory as the site favicon automatically — no code changes needed.

#### Build fixes
- `src/templates/lovify-template-2/Layout.tsx` — renamed unused `step` prop to `_step` to satisfy `@typescript-eslint/no-unused-vars`.
- `.eslintrc.json` — added `varsIgnorePattern`/`argsIgnorePattern: "^_"` so `_`-prefixed variables are allowed.

#### Duplicate email blocking (§3.13)

**New `GET /api/sessions`** endpoint checks if an email is already taken before the user submits:
- Checks `funnel_sessions` for `status = 'converted'` on this funnel.
- Checks `profiles` for `subscription_status IN ('active', 'past_due', 'grace_period')`.
- Returns `{ taken: boolean }`.

**`POST /api/sessions`** now also rejects taken emails server-side (runs both checks in `Promise.all`, returns `409` before creating any session or setting any cookie). This is the hard enforcement — client blur check is UX only.

**Client blur check** — both `EmailCaptureStep` components (`src/components/steps/EmailCaptureStep.tsx` and `src/templates/lovify-template-2/steps/EmailCaptureStep.tsx`) call `GET /api/sessions?email=&funnelId=` on `onBlur`. If `taken`, sets error state. Button `disabled` prop now includes `!!error` so the button is visually locked immediately.

**Submit guard** — both components have `if (busy || err) return` at the top of the submit handler, blocking keyboard-triggered submits (Enter key) even if the button is somehow still visible.

#### Session guard on all quiz steps

Previously every step component had:
```ts
if (sessionId) {
  await postAnswer(...)
}
onNext(); // ← called even with no session!
```

All 9 step components now redirect to the funnel root when `sessionId` is missing:
```ts
if (!sessionId) { router.push(`/${funnel.slug}`); return; }
await postAnswer(...);
onNext();
```

Fixed files:
- `src/components/steps/QuizSingleStep.tsx`
- `src/components/steps/QuizMultiStep.tsx`
- `src/components/steps/NarrativeStep.tsx`
- `src/components/steps/StatementStep.tsx`
- `src/components/steps/WelcomeStep.tsx`
- `src/components/steps/GenrePickerStep.tsx`
- `src/components/steps/NumberPickerStep.tsx`
- `src/components/steps/TimePickerStep.tsx`
- `src/components/steps/CraftingStep.tsx`

All now destructure `funnel` from props (to get `funnel.slug`) and import `useRouter` from `next/navigation`.

#### Stripe test-mode badge
Not a code issue. The "stripe >" badge in the corner of the paywall is injected by Stripe automatically when `pk_test_*` keys are detected. Fix: update Vercel env vars (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`) to live keys (`pk_live_*` / `sk_live_*`). Also ensure Stripe Price IDs in the funnel config are live-mode IDs.

---

## 3. Active gotchas & design decisions

### 3.1 step_key is developer-only (Option B)
Marketers never type step_keys. Magic presets carry locked `fixedKey`s the webhook's profile map knows. `step_key` is **immutable after create** — admin `useUpdateStep` only sends `config`, never `step_key`.

### 3.2 CORS on admin → funnel revalidate
Admin `localhost:5173`, funnel `localhost:3000`. `FUNNEL_ADMIN_ORIGINS` env var controls the allowlist. Failure surfaces as red toast.

### 3.3 Subscription status gate
Do not remove the `payingStatuses` guard or the `default_payment_method` check on trialing subs. Stripe creates trialing subs with PM=null on `.create`; only the follow-up `.updated` event after SetupIntent has the real signal.

### 3.4 Admin live preview drifts from funnel
Each template has both a funnel-side renderer and an admin-side Preview. When funnel-side visuals change, admin preview must be updated by hand. Accepted trade-off.

### 3.5 Plans at funnel-level, not step-level
Migration `20260424130000` strips legacy step-level plan keys. Admin's PaywallForm no longer exposes them.

### 3.6 Dialog doesn't close on backdrop click (step editor)
`StepEditor` passes `dismissOnBackdropClick={false}` — step edits have unsaved state.

### 3.7 Templates: manifests eager, components lazy
Adding template #N: drop a folder, append manifest entry + LOADER entry in `registry.ts`. No core changes elsewhere.

### 3.8 Asset library is dev-curated
Marketers pick from `lovify-funnel/public/funnel-assets/`. Devs drop files + add manifest entries. Legacy `character_image_url` still works as fallback.

### 3.9 Template-2 viewport prop in admin preview
Tailwind `md:` reads window width, not container. `PreviewProps` carries `viewport?: 'mobile'|'desktop'` for admin preview use.

### 3.10 Template-2 full-page background requires `body:has(.lt2-root)`
`globals.css` applies `@apply bg-background` on `body`. Fix in `theme.css`: `body:has(.lt2-root) { background: #faf6ef !important }`.

### 3.11 CTA button must never be full-bleed
Wrap button in `<div class="w-full max-w-3xl mx-auto">` to constrain to content column.

### 3.12 SuccessLayout is mandatory for template-2
Success page renders outside `Layout.tsx`. Without `SuccessLayout`, all `var(--lt2-*)` CSS variables resolve to empty. Always provide `SuccessLayout` if your template uses scoped CSS variables.

### 3.13 Duplicate email blocking (new — session 4)

**Three layers of protection (in order):**

1. **Client onBlur** — fires `GET /api/sessions?email=&funnelId=` when user leaves the email field. Sets error immediately. Button becomes disabled (`disabled={submitting || !email.trim() || !!error}`).
2. **Client submit guard** — `if (busy || err) return` at top of submit handler blocks Enter-key or any race condition.
3. **Server POST guard** — `POST /api/sessions` runs both DB checks in `Promise.all` before any session is created or cookie is set. Returns `409` for taken emails. **This is the hard enforcer — cannot be bypassed from the client.**

**What counts as "taken":**
- `funnel_sessions` with `status = 'converted'` on this funnel → already paid via funnel.
- `profiles` with `subscription_status IN ('active', 'past_due', 'grace_period')` → active paying subscriber in the app.

**What is NOT blocked:**
- Profiles with `subscription_status IN ('expired', 'dormant', 'none')` → free account, allowed to purchase via funnel.
- Active sessions on other funnels (only blocks same funnel conversions).

### 3.14 Session missing = redirect to funnel root, not silent advance

Before session 4, all step components silently skipped saving when `sessionId` was null and still called `onNext()`. This meant a user could skip the email step entirely (e.g. direct URL to `/funnel-slug/mindset`) and walk through the entire funnel without a session, reaching the paywall with no session ID.

Now: every step component checks `if (!sessionId) { router.push(\`/${funnel.slug}\`); return; }` before any answer post or advance. This redirects them to the funnel root (which redirects to the first step — typically email capture).

---

## 4. What's left

### Production-blocking

| Item | Where | Blocker? |
|---|---|---|
| Apply pending migrations 120000 → 030000 | `supabase db push` in lovifymusic | Yes |
| Redeploy webhook with new conversion gate | `supabase functions deploy stripe-webhook` | Yes |
| Verify webhook endpoint subscribes `customer.subscription.updated` | Stripe dashboard | Yes |
| Clean false-converted dev sessions before retesting | SQL in §7 | Before retesting |
| Point `auth.trylovify.com` DNS at lovifymusic | DNS + Supabase Auth custom domain | Yes for prod recovery emails |
| Deploy lovify-funnel + lovify-admin to Vercel | Vercel + DNS | Yes |
| Set prod env vars — all three repos | See §5 | Yes |
| **Swap Stripe keys to live (`pk_live_*` / `sk_live_*`) in Vercel** | Vercel env vars | Yes — test keys show "stripe >" badge |
| Set `FUNNEL_ADMIN_ORIGINS` on funnel in prod | Vercel env | Yes |

### Smoke test checklist (session 4 additions)

| Test | Expected |
|---|---|
| Enter an already-converted email → tab away | Error appears immediately, button disabled |
| Enter an already-converted email → press Enter | Submit blocked, no navigation |
| Enter an already-converted email → submit via DevTools fetch | `POST /api/sessions` returns `409`, no cookie set |
| Enter a profile email with `subscription_status = 'none'` → tab away | No error, proceeds normally |
| Direct-navigate to `/lovify-music-v1/mindset` (skip email) | Redirects back to `/lovify-music-v1` (email step) |
| Complete email step → clear cookies → navigate to quiz step | Redirects back to funnel root |

---

## 5. Environment variables — current set

### `lovify-funnel/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # pk_test_ in local dev only — live keys in Vercel prod
STRIPE_SECRET_KEY=sk_live_...                     # sk_test_ in local dev only — live keys in Vercel prod
ATTRIBUTION_COOKIE_SECRET=<64 hex chars>
FUNNEL_REVALIDATE_SECRET=<shared with admin>
FUNNEL_ADMIN_ORIGINS=http://localhost:5173,http://localhost:8080
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_MARKETING_URL=https://trylovify.com
```

### `lovify-admin/.env.local`
```
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_FUNNEL_BASE_URL=http://localhost:3000
VITE_FUNNEL_REVALIDATE_SECRET=<same as FUNNEL_REVALIDATE_SECRET>
```

---

## 6. Key file reference

### lovify-funnel (this repo)

| File | Purpose |
|---|---|
| `src/app/[slug]/page.tsx` | Redirects to first step |
| `src/app/[slug]/[step]/page.tsx` | SSR step renderer + session validation + auto-mint + converted-redirect |
| `src/app/[slug]/success/page.tsx` | Routes through `getTemplate(funnel.template).Success` + `SuccessLayout` |
| `src/app/not-found.tsx` | 404 page — neutral inline styles, no template CSS dependency |
| `src/app/icon.png` | Favicon (copied from lovifymusic public/favicon.png) |
| `src/app/api/sessions/route.ts` | **GET**: email taken check (blur). **POST**: email capture → funnel_sessions (with taken-email 409 guard) |
| `src/app/api/answers/route.ts` | Answer upsert + session advance |
| `src/app/api/payment-intent/route.ts` | Stripe Subscription creation, alreadyConverted redirect |
| `src/app/api/revalidate/route.ts` | Admin cache-bust with CORS |
| `src/app/api/meta-capi/route.ts` | Browser CAPI pass-through |
| `src/middleware.ts` | Attribution cookie signer |
| `src/lib/funnel-config.ts` | `unstable_cache` wrapper, 60s TTL |
| `src/lib/interpolate.ts` | `{{answer.<key>}}` token resolver |
| `src/lib/load-answers.ts` | SSR helper to fetch all prior answers |
| `src/lib/plans.ts` | PlanOption helpers |
| `src/lib/assets.ts` | `resolveAssetUrl(key)` + `pickStepImage(config)` |
| `src/components/steps/StepRouter.tsx` | Reads template from registry; calls `getTemplate(funnel.template)` |
| `src/components/steps/EmailCaptureStep.tsx` | v1 email step — blur check + submit guard + button disabled on error |
| `src/components/steps/QuizSingleStep.tsx` | v1 single-select — sessionId guard → redirect if missing |
| `src/components/steps/QuizMultiStep.tsx` | v1 multi-select — sessionId guard |
| `src/components/steps/NarrativeStep.tsx` | v1 narrative — sessionId guard |
| `src/components/steps/StatementStep.tsx` | v1 yes/no/Likert — sessionId guard |
| `src/components/steps/WelcomeStep.tsx` | v1 welcome — sessionId guard |
| `src/components/steps/GenrePickerStep.tsx` | v1 genre picker — sessionId guard |
| `src/components/steps/NumberPickerStep.tsx` | v1 scroll wheel — sessionId guard |
| `src/components/steps/TimePickerStep.tsx` | v1 time wheel — sessionId guard |
| `src/components/steps/CraftingStep.tsx` | v1 fake loader — sessionId guard in useEffect |
| `src/templates/types.ts` | `Template`, `StepRenderers`, `SuccessRenderer`, `SuccessLayoutComponent` |
| `src/templates/registry.ts` | `getTemplate(id)`, `TEMPLATES`, `DEFAULT_TEMPLATE_ID` |
| `src/templates/lovify-music-v1/` | v1 template — PhoneFrame + ProgressBar |
| `src/templates/lovify-template-2/theme.css` | CSS tokens scoped to `.lt2-root` |
| `src/templates/lovify-template-2/Layout.tsx` | Full-bleed header + progress bar |
| `src/templates/lovify-template-2/SuccessLayout.tsx` | Wraps success page with `.lt2-root` — REQUIRED for CSS vars |
| `src/templates/lovify-template-2/Cta.tsx` | Shared sticky-bottom pill CTA |
| `src/templates/lovify-template-2/index.ts` | Template assembly |
| `src/templates/lovify-template-2/steps/EmailCaptureStep.tsx` | t2 email step — blur check + submit guard + Cta disabled on error |
| `src/templates/lovify-template-2/steps/*.tsx` | All other t2 step renderers |
| `public/funnel-assets/manifest.json` | Asset library catalog |
| `.eslintrc.json` | ESLint — `varsIgnorePattern: "^_"` allows `_`-prefixed unused vars |

---

## 7. Testing the fresh-payment flow

1. **Apply migrations + redeploy webhook**: `supabase db push && supabase functions deploy stripe-webhook` in lovifymusic.
2. **Clean dev DB**:
   ```sql
   delete from public.funnel_answers
     where session_id in (select id from public.funnel_sessions where user_id is null);
   delete from public.attribution_events
     where session_id in (select id from public.funnel_sessions where user_id is null);
   delete from public.funnel_sessions where user_id is null;
   delete from public.credit_transactions where reference_id like 'funnel_purchase_%';
   ```
3. **Start all three dev servers** (admin 5173, funnel 3000, lovifymusic 8080).
4. **Fresh incognito** → `http://localhost:3000/<your-funnel-slug>?ttclid=TEST`.
5. Walk through quiz → paywall → card `4242 4242 4242 4242`.
6. Land on `/success`. Check: `funnel_sessions.status='converted'`, `auth.users` row exists, `profiles.quiz_*` populated, recovery email received, `attribution_events` has a `Purchase` row.
7. **Test duplicate email**: try re-entering the same email on the email step → error on blur, button disabled.
8. **Test session bypass**: direct-nav to a quiz step without a cookie → redirects to funnel root.

---

## 8. Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Publish/pause "Failed to fetch" toast | CORS or `FUNNEL_ADMIN_ORIGINS` missing | Add admin origin to funnel env; verify funnel on `:3000` |
| Paywall shows only trial plan | Legacy step-level `plan_keys` on paywall step | Run migration `20260424130000` |
| Step create → 23514 CHECK violation | DB CHECK on original 9-type list | Run migration `20260424160000` |
| User session `converted` without paying | Webhook using old gate | Redeploy webhook |
| Trial user enters card but never converts | Stripe not subscribing `customer.subscription.updated` | Add the event in Stripe dashboard |
| `payment_intent_failed_410 session_closed` | Retry after false conversion | Clean DB + redeploy webhook |
| `step_mismatch` 400 on quiz Continue | Cross-funnel `lfs` cookie | Clear cookies for localhost:3000 |
| `404 Page not found` on existing step | Funnel not `status='live'` OR stale cache | Publish the funnel; cache busts on publish |
| `profiles.quiz_*` all null after success | `notification_time` column missing | Run migration `20260425000000` |
| Template-2 success page wrong background | `SuccessLayout` missing | Provide `SuccessLayout.tsx` and wire into `index.ts` |
| Template-2 bottom half white on tall desktop | `globals.css` `bg-background` overrides `.lt2-root` | `body:has(.lt2-root) { background: #faf6ef !important }` in `theme.css` |
| Template-2 CTA full viewport width on desktop | `w-full` with no enclosing `max-w` | Wrap in `max-w-3xl mx-auto` div |
| Stripe "stripe >" badge on production paywall | `pk_test_*` key used in Vercel prod | Swap to `pk_live_*` / `sk_live_*` in Vercel env vars + redeploy |
| Duplicate email gets through to quiz | Button disabled check was missing `!!error` | Fixed: button now `disabled={submitting \|\| !email.trim() \|\| !!error}` |
| No session but quiz still advances | Old `if (sessionId)` guard silently skipped | Fixed: all steps now redirect to funnel root when sessionId missing |
| `lfs` cookie set for blocked email | POST had no taken-email check | Fixed: POST now runs `Promise.all` check and returns `409` before any cookie |
| Port 3000 already in use | Background dev server still running | `netstat -aon | findstr :3000` then `taskkill /F /PID <pid>` |

---

## 9. Templates — at a glance

| Template id | Look | Status |
|---|---|---|
| `lovify-music-v1` | Mobile-first phone frame, peach gradient, Montserrat. `supportsViewports: ['mobile']`. | Production-ready. |
| `lovify-template-2` | Full-bleed responsive, cream `#faf6ef` + dark `#1a1611`, no phone frame, Plus Jakarta Sans, brand wordmark in `h-14` header, `max-w-3xl` content column, dark pill CTAs. BetterMe-style quiz rows. | Visually polished. Needs smoke test + admin tsc pass before production. |

---

## 10. How to create Template 3

This is the complete recipe — follow in order and you will not miss anything.

### Step 1 — Pick an ID and design direction

Choose a short kebab-case ID, e.g. `lovify-template-3`. Decide:
- What is the color palette? (background, foreground, accent, card, border)
- What is the font? (Google Fonts import or system)
- Full-bleed or phone-frame?
- What CSS class roots the theme? (e.g. `.lt3-root`)

### Step 2 — Create the funnel-side folder

```
src/templates/lovify-template-3/
├── theme.css          ← CSS variables scoped to .lt3-root
├── Layout.tsx         ← wraps every step page (header, progress bar, back button)
├── SuccessLayout.tsx  ← wraps success page with .lt3-root (REQUIRED if using CSS vars)
├── Cta.tsx            ← shared CTA button (optional — reuse ui/Button if simpler)
├── index.ts           ← assembles and exports the Template object
└── steps/
    ├── EmailCaptureStep.tsx
    ├── WelcomeStep.tsx
    ├── QuizSingleStep.tsx
    ├── QuizMultiStep.tsx
    ├── NarrativeStep.tsx
    ├── StatementStep.tsx
    ├── NumberPickerStep.tsx
    ├── TimePickerStep.tsx
    ├── CraftingStep.tsx
    ├── PaywallStep.tsx
    └── SuccessStep.tsx
```

**`theme.css`** — scope every token to `.lt3-root`:
```css
@import url('https://fonts.googleapis.com/css2?family=YourFont&display=swap');

.lt3-root {
  --lt3-bg: #your-bg;
  --lt3-fg: #your-fg;
  --lt3-accent: #your-accent;
  --lt3-card: #your-card;
  --lt3-border: #your-border;
  --lt3-muted: #your-muted;
  font-family: 'YourFont', system-ui, sans-serif;
}

/* Override the Tailwind body bg so the color fills below the last element */
body:has(.lt3-root) {
  background: #your-bg !important;
}
```

**`Layout.tsx`** — must accept `TemplateLayoutProps` and render:
- The `.lt3-root` wrapper (imports `theme.css`)
- A header with back button + brand mark + progress bar
- A `<main>` that passes `children` through

```tsx
import type { TemplateLayoutProps } from "@/templates/types";
import "./theme.css";

export function Layout({ funnel, step: _step, stepIndex, totalSteps, hideProgress, children }: TemplateLayoutProps) {
  // ... your header + progress bar + main
}
```

**`SuccessLayout.tsx`** — minimal wrapper:
```tsx
import "./theme.css";
export function SuccessLayout({ children }: { children: React.ReactNode }) {
  return <div className="lt3-root min-h-screen">{children}</div>;
}
```

**`index.ts`** — assembles the template:
```ts
import type { Template } from "@/templates/types";
import { Layout } from "./Layout";
import { SuccessLayout } from "./SuccessLayout";
import { EmailCaptureStep } from "./steps/EmailCaptureStep";
// ... import all other steps

export const lovifyTemplate3: Template = {
  manifest: {
    id: "lovify-template-3",
    name: "Template 3 — Your Name",
    description: "Short description for admin gallery.",
    supportsViewports: ["mobile", "desktop"],
  },
  Layout,
  SuccessLayout,
  steps: {
    "email-capture": EmailCaptureStep,
    welcome: WelcomeStep,
    "quiz-single": QuizSingleStep,
    "quiz-multi": QuizMultiStep,
    narrative: NarrativeStep,
    statement: StatementStep,
    "number-picker": NumberPickerStep,
    "time-picker": TimePickerStep,
    crafting: CraftingStep,
    paywall: PaywallStep,
    "genre-picker": UnsupportedStep,   // placeholder if not implemented
    success: SuccessStep,
  },
};
```

### Step 3 — Wire it into the funnel registry

Open `src/templates/registry.ts` and add one line:

```ts
import { lovifyTemplate3 } from "./lovify-template-3";

const TEMPLATES: Template[] = [
  lovifyTemplate1,
  lovifyTemplate2,
  lovifyTemplate3,   // ← add this
];
```

That's all on the funnel side. `getTemplate("lovify-template-3")` now works.

### Step 4 — Write step components

**Rules every step component must follow:**

1. **Always import `funnel` from props** — you need `funnel.slug` for the session guard redirect.
2. **Always import `useRouter`** and add the session guard at the top of every submit handler:
   ```ts
   const router = useRouter();
   // ...
   if (!sessionId) { router.push(`/${funnel.slug}`); return; }
   ```
3. **EmailCaptureStep blur check** — call `GET /api/sessions?email=&funnelId=` on `onBlur`, set error if `taken`, and include `!!error` in the button `disabled` prop.
4. **EmailCaptureStep submit guard** — `if (busy || err) return` at top of submit.
5. **No `if (sessionId)` wrapping `postAnswer`** — always require the session; redirect if missing.

You can copy any step from `lovify-template-2/steps/` as a starting point and restyle with your CSS variables. The logic is identical; only the markup and class names differ.

### Step 5 — Create the admin-side preview (lovify-admin)

```
lovify-admin/src/templates/lovify-template-3/
├── index.ts       ← AdminTemplate object (manifest + loadPreview + loadSamples)
├── Preview.tsx    ← read-only renderer (uses viewport prop instead of md:)
└── samples.ts     ← 4–7 hand-picked step configs for the gallery card + carousel
```

**`index.ts`**:
```ts
import type { AdminTemplate } from "../types";

export const lovifyAdminTemplate3: AdminTemplate = {
  manifest: {
    id: "lovify-template-3",
    name: "Template 3 — Your Name",
    description: "...",
    supportsViewports: ["mobile", "desktop"],
  },
  loadPreview: () => import("./Preview").then(m => m.Preview),
  loadSamples: () => import("./samples").then(m => m.samples),
};
```

**`Preview.tsx`** — mirror of the funnel renderer but:
- Replace Tailwind `md:` breakpoints with `viewport === 'desktop' ? ... : ...` conditionals.
- Read-only: no `onNext`, no API calls, no router. Just renders the config passed as `step`.
- Import the same `theme.css` from a relative path (or duplicate relevant styles inline).

**`samples.ts`** — array of `TemplateSample` objects, one per step type you want shown in the gallery. Include at least: email, quiz-single, paywall.

Then append to `lovify-admin/src/templates/manifests.ts`:
```ts
import { lovifyAdminTemplate3 } from "./lovify-template-3";
export const manifests = [...existingManifests, lovifyAdminTemplate3.manifest];
```

And append to `lovify-admin/src/templates/registry.ts` LOADERS:
```ts
"lovify-template-3": () => import("./lovify-template-3").then(m => m.lovifyAdminTemplate3),
```

### Step 6 — No DB migration needed

The template ID is stored as a string in `funnels.template`. No schema change is required — the new ID just needs to exist in both registries. Gallery picks it up automatically on next page load.

### Step 7 — Test

1. Admin: open Template Gallery → new template appears → preview carousel works for mobile + desktop.
2. Admin: create a new funnel with template-3 → step editor shows template-3 preview.
3. Funnel: `npm run build` → no errors.
4. Funnel: navigate to a live template-3 funnel → correct theme, font, layout.
5. Funnel: complete email → quiz → paywall → success → correct SuccessLayout renders.
6. Funnel: try duplicate email → blocked on blur + submit.
7. Funnel: direct-nav to quiz step without cookie → redirected to email step.

### Common template-3 mistakes to avoid

| Mistake | Consequence | Prevention |
|---|---|---|
| Forgetting `SuccessLayout` | Success page has wrong/missing CSS vars | Always create and wire `SuccessLayout` |
| Missing `body:has(.lt3-root)` in `theme.css` | Bottom half of page wrong color on tall displays | Add the override in `theme.css` |
| Using `if (sessionId)` guard around `postAnswer` | Silent advance with no session | Use redirect pattern instead |
| Button `disabled` without `!!error` | User can submit blocked email | Include error in disabled prop |
| CTA `w-full` without `max-w` container | Stretches edge-to-edge on desktop | Wrap in `max-w-3xl mx-auto` |
| Preview using `md:` Tailwind in admin | Viewport toggle doesn't work | Use `viewport === 'desktop'` prop instead |
| Forgetting to add to admin registry | Template invisible in gallery | Append to `manifests.ts` AND `registry.ts` |

---

## 11. Resume here next session

Read this file end to end, then start from §4.

**State as of session 4:**
- Duplicate email blocking: 3-layer protection (blur check, submit guard, server POST 409)
- Session guard: all 9 step components redirect to funnel root when sessionId missing
- Favicon: `src/app/icon.png` (from lovifymusic)
- Build: `npm run build` passes with zero errors
- Stripe badge: live keys needed in Vercel (test keys trigger the badge)
- Template-3 guide: §10 above — complete recipe, follow in order

**Immediate next actions (in order):**
1. Apply all pending migrations (`supabase db push` in lovifymusic)
2. Redeploy webhook (`supabase functions deploy stripe-webhook`)
3. Verify Stripe dashboard subscribes `customer.subscription.updated`
4. Swap Stripe keys to live in Vercel → redeploy → confirm badge is gone
5. Smoke test duplicate-email blocking on production URL
6. Smoke test session bypass fix (direct-nav to quiz step)
7. Drop real images into `public/funnel-assets/` and update `manifest.json`

When something breaks, start at §8.
When something changes architecturally, update §1–§3 first.

---

**End of runbook.**
