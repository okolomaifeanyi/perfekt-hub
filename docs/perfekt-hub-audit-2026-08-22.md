# PerfektHub Audit — 22 Aug 2026

Scope: RLS policy coverage on Supabase, security, performance/Core Web Vitals, accessibility, SEO/metadata. Every finding below is backed by a specific file and line I read directly — nothing here is generic checklist advice. Where I only sampled part of the codebase rather than reading it exhaustively, I've said so next to the finding.

Findings are ordered by severity within each section.

## 1. RLS (Row Level Security)

**Coverage:** All ~30 tables across the 42 migration files have RLS enabled. Almost everything is correctly scoped — see the Positives section.

### 🔴 High — `messages` update/delete policies let any conversation participant edit or delete someone else's message

`supabase/migrations/20260530000000_init.sql`, lines 284–321:

```sql
create policy "messages_participant_update"
on public.messages
for update
to authenticated
using (
  auth.uid()::text = senderId
  or exists (
    select 1 from public.conversations c
    where c.id = conversationId and auth.uid()::text = any(c.participants)
  )
)
with check ( /* same OR condition */ );

create policy "messages_participant_delete"
on public.messages
for delete
to authenticated
using (
  auth.uid()::text = senderId
  or exists ( /* same participant check */ )
);
```

The `or` means "any participant in the conversation" alone satisfies the policy — it doesn't require you to be the sender. Compare with `messages_participant_insert` a few lines above, which correctly requires `auth.uid()::text = senderId AND exists(participant)`.

**Impact:** any authenticated user in a 1:1 or group conversation can edit or delete messages sent by other people in that conversation, via a direct Supabase REST/PostgREST call — independent of what your UI exposes.

**Fix:** drop the `or exists(...)` clause from both policies so they match the insert policy — only `auth.uid()::text = senderId` should authorize update/delete.

I checked this wasn't a repeated pattern elsewhere (group_polls' creator-or-admin override and user_relationships' both-parties design are both intentionally scoped, not the same bug) — this looks like an isolated mistake in one migration.

## 2. Security

### 🔴 High — Rate limiting is fully built but never called

`lib/rate-limit.mjs` implements `checkRateLimit(action, limit, windowSeconds)` cleanly (fails open, IP-keyed via `x-forwarded-for`, backed by a locked-down `rate_limits` table and a `SECURITY DEFINER` RPC). I grepped `checkRateLimit` across the whole codebase — the only match is its own definition. It is not called from any route, server action, or API handler.

**Impact:** zero actual rate limiting anywhere, despite public unauthenticated surfaces (home feed, `/discover`, `/updates`, individual posts, login, signup) — these are open to brute-force login attempts, signup abuse, and scraping at whatever rate a client sends requests.

**Fix:** wire `checkRateLimit` into login, signup, and any other public POST/mutation route, most urgently `/login` and `/signup`.

### 🟡 Medium — No security headers configured

`next.config.ts` has no `headers()` function, and `proxy.ts` middleware doesn't set any either. Missing: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.

**Impact:** no clickjacking protection, no MIME-sniffing protection, no baseline CSP against injected scripts.

**Fix:** add a `headers()` block to `next.config.ts` (or set headers in `proxy.ts`) covering at minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security`. A CSP is more work (needs to allow-list Cloudinary, Stream, Google fonts, etc.) but is worth scheduling.

### 🟢 Non-finding, verify one thing — `.env` / `.env.local` / `scripts/.env`

A secret-pattern scan flagged these three files as containing key-shaped strings (`SAFE_BROWSING_API_KEY`, `YOUTUBE_API_KEY`, `FIREBASE_PRIVATE_KEY`). I checked `.gitignore`: it has `.env*` (covers `.env` and `.env.local`) and `/scripts` (covers `scripts/.env`) both ignored. So as the repo stands today, these files are correctly excluded from version control — this is not a live finding.

One caveat I couldn't rule out without shell/git access this session: whether any of these files were ever committed *before* `.gitignore` picked them up (the `.gitignore` mtime shows it was touched relatively recently — 2026-07-something). If you want to be fully sure, run this yourself:

```
git log --all --full-history -- .env .env.local scripts/.env
```

If that returns any commits, those keys (especially the Firebase private key) should be rotated, since git history retains them even after a later `.gitignore` add.

## 3. Performance / Core Web Vitals

### Positives
- `next/image` is used correctly and consistently in the components I sampled: `ContainedImage` requires `alt` as a non-optional prop, uses `fill` + `sizes`, and splits `priority`/`loading="lazy"` per caller. `JustAvatar` has a solid alt-text fallback chain.
- `images.remotePatterns` in `next.config.ts` is a tight, explicit allowlist (Cloudinary, Pravatar, Giphy, etc.) — not a wildcard.
- `next/font/google` (`Plus_Jakarta_Sans`) uses `display: "swap"`, avoiding invisible-text-on-load (FOIT).
- The dark-mode-flash-prevention script in `app/layout.tsx` is a tiny inline synchronous script, which is the correct pattern for this specific problem (it has to run before first paint) and isn't a meaningful render-blocking concern.
- `components/Aside.tsx` lazy-loads `DirectCallButton` via `next/dynamic({ ssr: false })`, specifically to keep Stream Video/Chat SDK code out of the server render and initial bundle — there's a code comment noting this was a deliberate fix for a prior outage. Good practice.

### 🟡 Medium — Caching (`revalidate`) is set on exactly one route

Only `app/(dashboard)/updates/page.tsx` declares `export const revalidate = 60`. No other page in the app sets an explicit revalidate window, so everything else falls back to Next's defaults (fully dynamic per-request rendering unless something else is caching it). For a feed-heavy social app this is worth a deliberate per-route decision rather than an implicit default — some pages (public feed, `/discover`) are good ISR candidates.

### Not verified — scope caveat

Package.json lists `stream-chat`, `stream-chat-react`, `@stream-io/video-react-sdk`, and `@stream-io/node-sdk` as dependencies — these are large bundles. I could only confirm lazy-loading for `DirectCallButton`; I could not find any other file in the staged copy of the repo importing these packages, which most likely means the messages/calls UI components simply weren't part of what I had staged this session, not that they're missing. **I did not verify bundle-size/lazy-loading for the actual chat and video call screens** — worth a targeted look (e.g. `next build` bundle analyzer, or just confirming `stream-chat-react`'s CSS/JS isn't in the initial `/` or `/discover` bundle).

## 4. Accessibility

### 🔴 High — Primary navigation has no ARIA labels, and on mobile no visible label at all

**`components/MobileNavBar.tsx`** (the entire mobile-only bottom nav, `sm:hidden`): the `NavItem` sub-component renders only an icon inside a `<Link>` — no text label ever, at any breakpoint, and no `aria-label`. This covers Home, Notifications, Messages, and Group — the core navigation for every mobile user, which for a consumer social app launched via Play Store is probably the majority of your traffic.

**`components/NavBar.tsx`** (desktop/tablet sidebar): `renderNavItem()` renders icon + `<span className="hidden md:block">{label}</span>` with no `aria-label` on the `<Link>` itself. Below the `md` breakpoint the text is hidden by CSS, so a screen reader user on a smaller screen where this component happens to render gets an unlabeled link. Same issue on the "More" dropdown trigger button.

**Impact:** screen reader users can't tell what these nav links do — VoiceOver/TalkBack will just announce the icon's implicit or absent name.

**Fix:** add `aria-label={label}` to each `<Link>`/`<button>` in both components. This is a small, mechanical fix.

Notably the codebase does this correctly elsewhere — `components/post-composer/Buttons.tsx` has an explicit `aria-label="Add a poll, product, or event to this post"` on its icon+text dropdown trigger, with a comment explaining exactly why icon-only buttons need it. So this is an inconsistency, not a blanket gap — whoever built the composer knew the rule; the nav bars just missed it.

### Scope caveat

I sampled navigation and media/avatar components specifically because they're the highest-traffic, most icon-heavy UI. I did not do an exhaustive pass over the ~110+ component files in the repo, so there may be other icon-only buttons elsewhere with the same gap. Given the pattern found (nav = missed, composer = correct), I'd guess it's inconsistent rather than universal, but that's an inference, not something I verified file-by-file.

## 5. SEO / Metadata

### 🔴 High, needs one-time verification — `APP_URL` env var

`lib/appInfo.ts` and `lib/site-metadata.mjs` both derive the canonical/OG/sitemap base URL from `process.env.APP_URL`, falling back to `http://localhost:3000` if unset. I could not confirm this variable is set in Vercel (it wasn't among the env vars confirmed during the earlier env-var pass — `SAFE_BROWSING_API_KEY`, `VIRUSTOTAL_API_KEY`, `CRYPTOPANIC_API_KEY`, `ADMIN_SECRET_TOKEN`, `NEXT_PUBLIC_BASE_URL`, etc. were checked, `APP_URL` wasn't).

**Impact if unset in production:** every canonical tag, Open Graph URL, sitemap URL entry, and robots.txt host would resolve to `localhost:3000` — this would badly hurt indexing and make shared links preview incorrectly.

**Action:** check Vercel → Project → Settings → Environment Variables for `APP_URL` right now. This is the single highest-leverage SEO check on this list since perfektmart.com.ng has had zero sales — if this is a PerfektHub-family site with the same pattern, it's worth checking there too.

### 🟡 Medium — Sitemap lists routes that require login, and omits real public routes

`app/sitemap.ts` lists: `/`, `/watch`, `/discover`, `/discover/events`, `/discover/match`, `/calendar`, `/messages`, `/notifications`, `/settings`, `/signup`, `/login`.

Cross-checked against `lib/public-routes.mjs`'s `isPublicPath()` (the actual allowlist your middleware uses): only `/`, `/discover`, and `/updates` are genuinely public, plus individual `/[username]/[uuid]` post pages.

That means **7 of the 11 sitemap URLs** (`/watch`, `/discover/events`, `/discover/match`, `/calendar`, `/messages`, `/notifications`, `/settings`) will 302-redirect an anonymous Googlebot straight to `/login` — wasted crawl budget, and potentially confusing signals to search engines about what the page actually is.

Meanwhile `/updates` — genuinely public, with its own dedicated title ("Scores & News") — **isn't in the sitemap at all**, and neither is any individual post-detail page, which is presumably where a lot of your actual shareable/indexable content lives.

**Fix:** rebuild `sitemap.ts` from `isPublicPath()`'s logic instead of a hand-maintained list — include `/`, `/discover`, `/updates`, and dynamically pull recent public post URLs; drop everything that requires auth.

### 🟡 Medium — No structured data (JSON-LD) anywhere

Grepped the whole codebase for `application/ld+json`, `schema.org`, common JSON-LD helper names — zero matches. For a social/news app, `Article`/`SocialMediaPosting`/`Organization` schema on post pages and the homepage would help rich results and is a relatively contained addition.

### Low — `robots.ts`

Currently `allow: "/"` with no disallow rules for anyone. Once the sitemap fix above is in, it'd be worth explicitly disallowing the private routes (`/messages`, `/notifications`, `/settings`, etc.) so crawlers that ignore your middleware redirects don't keep hammering them.

## Priority order if you're triaging

1. RLS: fix `messages_participant_update`/`delete` (data integrity — other users can alter your messages, right now, today).
2. Security: wire up rate limiting on `/login` and `/signup` at minimum.
3. SEO: confirm `APP_URL` is set correctly in Vercel production env.
4. Accessibility: add `aria-label`s to `NavBar.tsx` and `MobileNavBar.tsx` — small, mechanical fix, meaningful impact.
5. SEO: fix `sitemap.ts` to match real public routes.
6. Security: add baseline security headers.
7. Everything else (JSON-LD, revalidate strategy, robots.txt tightening, bundle-size verification for Stream SDKs) — lower urgency, worth a pass when you have a quieter week.

## What I did not check

- Git history for the three `.env*` files (need `git log`, which I don't have shell access to this session — see section 2).
- Bundle size / lazy-loading of the actual chat and video-call UI (Stream SDKs) — those component files weren't in what I had staged.
- Full accessibility pass across all ~110+ components — I sampled navigation, media, and composer components specifically as the highest-traffic, most icon-dense UI.
- Anything about the mobile app (Play Store / iOS) itself — this audit is web-app only (RLS, headers, sitemap, etc. all sit under Supabase/Next.js, which the mobile app also talks to via the same backend, so the RLS and rate-limiting findings above apply to it too).
