# Video Viewer and Social Discovery Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fullscreen video viewer with ranked scroll-to-next playback, then wire the surrounding discovery, profile, calendar, and recommendation surfaces that make the app feel like a broader social network.

**Architecture:** Keep the video viewer route-based and derive it from existing post data. Put ranking, URL building, discovery ordering, calendar reminders, and match scoring into small pure helper modules so the UI stays thin and testable. Treat the navigation, Discover, Profile, Calendar, and right-rail surfaces as separate route shells that consume those helpers instead of reimplementing ranking logic in components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, current Supabase/Firestore hybrid data layer, node:test, shadcn/ui, Cloudinary, existing post/feed utilities.

---

## File Map

- `lib/video-url.mjs` — build canonical and shareable video URLs.
- `lib/video-metadata.mjs` — build per-route metadata for video pages.
- `lib/video-recommendations.mjs` — rank and refill video queues using watch time, likes, tags, quotes, replies, and follows.
- `lib/feed-recommendation-inserts.mjs` — decide where dynamic horizontal recommendation carousels should appear in the feed.
- `lib/discover-surface.mjs` — rank the Discover sections for saves, events, groups, people, and search surface blocks.
- `lib/calendar-reminders.mjs` — compute birthdays, events, and post-memory reminders.
- `lib/match-recommendations.mjs` — score opt-in match candidates using relationship-oriented preferences.
- `lib/video-viewer-state.mjs` — drive fullscreen defaults, scroll-to-next, and right-rail toggles.
- `app/(dashboard)/[username]/[postId]/video/page.tsx` — route shell for the full-screen video viewer.
- `components/video-viewer/*` — viewer shell, toggle, details rail, and mobile drawer.
- `components/feed/Feed.tsx` — insert recommendation carousels dynamically into the timeline.
- `components/NavBar.tsx` / `lib/nav-items.mjs` — grouped navigation with Watch, Discover, Profile, Calendar, and compact secondary items.
- `components/Aside.tsx` — desktop right rail for online friends, quick calls/messages, and 1-2 recommendations.
- `app/(dashboard)/discover/page.tsx` — Discover surface with top/trending saves, events, groups, people, and richer search.
- `app/(dashboard)/discover/match/page.tsx` — opt-in Suggested Match surface.
- `app/(dashboard)/calendar/page.tsx` — birthdays, events, and post-memory reminders.
- `app/(dashboard)/[username]/saved/page.tsx` — saved posts and saved videos in Profile.
- `app/(dashboard)/[username]/groups/page.tsx` — groups the user belongs to in Profile.
- `app/(dashboard)/[username]/videos/page.tsx` — profile video tab.
- `app/(dashboard)/search/page.tsx` — legacy alias/redirect to Discover.
- `app/(dashboard)/layout.tsx` / `components/Main.tsx` — preserve the wide layout and right rail while the new surfaces land.

## Task 1: Video URL, metadata, and ranking helpers

**Files:**
- Create: `lib/video-url.mjs`
- Create: `lib/video-url.test.mjs`
- Create: `lib/video-metadata.mjs`
- Create: `lib/video-metadata.test.mjs`
- Create: `lib/video-recommendations.mjs`
- Create: `lib/video-recommendations.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoPostUrl, buildCanonicalPostUrl } from "./video-url.mjs";
import { buildVideoMetadata } from "./video-metadata.mjs";
import { rankVideoCandidates, refillVideoQueue } from "./video-recommendations.mjs";

test("buildVideoPostUrl creates the shareable video route", () => {
  assert.equal(buildVideoPostUrl("jane", "post-123"), "/jane/post-123/video");
  assert.equal(buildCanonicalPostUrl("jane", "post-123"), "/jane/post-123");
});

test("buildVideoMetadata keeps canonical and social metadata aligned", () => {
  const meta = buildVideoMetadata({
    username: "jane",
    postId: "post-123",
    title: "Sunset reel",
    description: "Video post on Perfekt Hub",
    image: "https://cdn.example.com/post.jpg",
  });

  assert.equal(meta.alternates.canonical, "/jane/post-123");
  assert.equal(meta.openGraph.url, "/jane/post-123/video");
  assert.equal(meta.openGraph.images[0].url, "https://cdn.example.com/post.jpg");
});

test("rankVideoCandidates orders watch time before likes, tags, quotes, replies, and follows", () => {
  const ranked = rankVideoCandidates([
    { id: "watch-heavy", watchTime: 100, likes: 1, tags: 0, quotes: 0, replies: 0, follows: 0 },
    { id: "likes-heavy", watchTime: 20, likes: 50, tags: 0, quotes: 0, replies: 0, follows: 0 },
    { id: "tags-heavy", watchTime: 20, likes: 1, tags: 40, quotes: 0, replies: 0, follows: 0 },
    { id: "quotes-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 20, replies: 0, follows: 0 },
    { id: "replies-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 1, replies: 15, follows: 0 },
    { id: "follows-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 1, replies: 1, follows: 10 },
  ]);

  assert.deepEqual(ranked.map(candidate => candidate.id), [
    "watch-heavy",
    "likes-heavy",
    "tags-heavy",
    "quotes-heavy",
    "replies-heavy",
    "follows-heavy",
  ]);
});

test("refillVideoQueue keeps 10 to 20 videos ahead", () => {
  const queue = refillVideoQueue({
    currentQueue: [{ id: "a" }, { id: "b" }],
    candidates: [{ id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }],
    targetSize: 4,
  });

  assert.equal(queue.length, 4);
  assert.deepEqual(queue.map(item => item.id), ["a", "b", "c", "d"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/video-url.test.mjs lib/video-metadata.test.mjs lib/video-recommendations.test.mjs`

Expected: FAIL because the helper modules do not exist yet or the behavior is not implemented.

- [ ] **Step 3: Write the minimal implementation**

```js
export function buildCanonicalPostUrl(username, postId) {
  return `/${username}/${postId}`;
}

export function buildVideoPostUrl(username, postId) {
  return `/${username}/${postId}/video`;
}

export function buildVideoMetadata({ username, postId, title, description, image }) {
  const canonical = buildCanonicalPostUrl(username, postId);
  const videoUrl = buildVideoPostUrl(username, postId);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: videoUrl,
      images: [{ url: image }],
    },
  };
}

export function rankVideoCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const fields = ["watchTime", "likes", "tags", "quotes", "replies", "follows"];

    for (const field of fields) {
      if (right[field] !== left[field]) {
        return right[field] - left[field];
      }
    }

    return 0;
  });
}

export function refillVideoQueue({ currentQueue, candidates, targetSize }) {
  const queue = [...currentQueue];

  for (const candidate of candidates) {
    if (queue.length >= targetSize) break;
    if (!queue.some(item => item.id === candidate.id)) {
      queue.push(candidate);
    }
  }

  return queue;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/video-url.test.mjs lib/video-metadata.test.mjs lib/video-recommendations.test.mjs`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

```bash
git add lib/video-url.mjs lib/video-url.test.mjs lib/video-metadata.mjs lib/video-metadata.test.mjs lib/video-recommendations.mjs lib/video-recommendations.test.mjs
git commit -m "feat: add video url and ranking helpers"
```

## Task 2: Adaptive feed recommendation inserts

**Files:**
- Create: `lib/feed-recommendation-inserts.mjs`
- Create: `lib/feed-recommendation-inserts.test.mjs`
- Modify: `components/feed/Feed.tsx`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { computeRecommendationSlots } from "./feed-recommendation-inserts.mjs";

test("computeRecommendationSlots inserts carousels only when the feed is dense enough", () => {
  const slots = computeRecommendationSlots({
    itemCount: 18,
    engagementScore: 0.8,
    availableTypes: ["groups", "friends", "events"],
  });

  assert.equal(slots.length > 0, true);
  assert.equal(slots[0].type, "groups");
});

test("computeRecommendationSlots returns no inserts for a short feed", () => {
  const slots = computeRecommendationSlots({
    itemCount: 4,
    engagementScore: 0.2,
    availableTypes: ["groups", "friends"],
  });

  assert.deepEqual(slots, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/feed-recommendation-inserts.test.mjs`

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function computeRecommendationSlots({ itemCount, engagementScore, availableTypes }) {
  if (itemCount < 8 || availableTypes.length === 0) return [];

  const slots = [];
  const shouldInsert = engagementScore >= 0.5 || itemCount >= 12;
  if (!shouldInsert) return slots;

  const insertAt = itemCount >= 16 ? 6 : 4;
  slots.push({ index: insertAt, type: availableTypes[0] });

  if (itemCount >= 20 && availableTypes[1]) {
    slots.push({ index: insertAt + 6, type: availableTypes[1] });
  }

  return slots;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/feed-recommendation-inserts.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-recommendation-inserts.mjs lib/feed-recommendation-inserts.test.mjs components/feed/Feed.tsx
git commit -m "feat: add adaptive feed recommendation inserts"
```

## Task 3: Full-screen video viewer route and toggle state

**Files:**
- Create: `lib/video-viewer-state.mjs`
- Create: `lib/video-viewer-state.test.mjs`
- Create: `components/video-viewer/VideoViewerShell.tsx`
- Create: `components/video-viewer/VideoDetailsRail.tsx`
- Create: `components/video-viewer/VideoViewerToggle.tsx`
- Modify: `app/(dashboard)/[username]/[postId]/video/page.tsx`
- Modify: `app/(dashboard)/[username]/[postId]/components/PostMedia.tsx`
- Modify: `app/(dashboard)/[username]/[postId]/components/PostCard.tsx`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { getNextVideoIndex, shouldShowDetailsRail } from "./video-viewer-state.mjs";

test("getNextVideoIndex advances to the next clip and wraps safely", () => {
  assert.equal(getNextVideoIndex(0, 5), 1);
  assert.equal(getNextVideoIndex(4, 5), 0);
});

test("shouldShowDetailsRail keeps fullscreen as the default", () => {
  assert.equal(shouldShowDetailsRail({ isOpen: false, isHovering: false, isMobile: false }), false);
  assert.equal(shouldShowDetailsRail({ isOpen: true, isHovering: false, isMobile: false }), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/video-viewer-state.test.mjs`

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function getNextVideoIndex(currentIndex, itemCount) {
  if (itemCount <= 0) return 0;
  return (currentIndex + 1) % itemCount;
}

export function shouldShowDetailsRail({ isOpen, isHovering, isMobile }) {
  if (isMobile) return isOpen;
  return isOpen || isHovering;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/video-viewer-state.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/video-viewer-state.mjs lib/video-viewer-state.test.mjs components/video-viewer/VideoViewerShell.tsx components/video-viewer/VideoDetailsRail.tsx components/video-viewer/VideoViewerToggle.tsx app/(dashboard)/[username]/[postId]/video/page.tsx app/(dashboard)/[username]/[postId]/components/PostMedia.tsx app/(dashboard)/[username]/[postId]/components/PostCard.tsx
git commit -m "feat: add fullscreen video viewer route"
```

## Task 4: Grouped navigation and Discover surface

**Files:**
- Modify: `lib/nav-items.mjs`
- Modify: `components/NavBar.tsx`
- Create: `lib/discover-surface.mjs`
- Create: `lib/discover-surface.test.mjs`
- Create: `app/(dashboard)/discover/page.tsx`
- Modify: `app/(dashboard)/search/page.tsx`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { navGroups } from "./nav-items.mjs";
import { buildDiscoverSections } from "./discover-surface.mjs";

test("nav groups keep Watch, Discover, and Calendar separate", () => {
  assert.deepEqual(navGroups.map(group => group.label), [
    "Primary",
    "Discover",
    "Library",
    "Account",
  ]);
});

test("buildDiscoverSections prefers saves, events, groups, and people in that order", () => {
  const sections = buildDiscoverSections({
    savedCount: 12,
    eventCount: 8,
    groupCount: 20,
    peopleCount: 15,
  });

  assert.deepEqual(sections.map(section => section.type), [
    "saves",
    "events",
    "groups",
    "people",
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/nav-items.test.mjs lib/discover-surface.test.mjs`

Expected: FAIL because the grouped nav and discover helper are not implemented yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export const navGroups = [
  {
    label: "Primary",
    items: ["Home", "Watch", "Discover", "Messages", "Notifications"],
  },
  { label: "Discover", items: ["Groups", "Events", "Match", "Top People"] },
  { label: "Library", items: ["Saved", "Calendar"] },
  { label: "Account", items: ["Profile", "Settings"] },
];

export function buildDiscoverSections({
  savedCount,
  eventCount,
  groupCount,
  peopleCount,
}) {
  return [
    { type: "saves", count: savedCount },
    { type: "events", count: eventCount },
    { type: "groups", count: groupCount },
    { type: "people", count: peopleCount },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/nav-items.test.mjs lib/discover-surface.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/nav-items.mjs lib/nav-items.test.mjs lib/discover-surface.mjs lib/discover-surface.test.mjs components/NavBar.tsx app/(dashboard)/discover/page.tsx app/(dashboard)/search/page.tsx
git commit -m "feat: group navigation and add discover surface"
```

## Task 5: Profile saved/videos/groups and calendar reminders

**Files:**
- Modify: `app/(dashboard)/[username]/components/ProfileClient.tsx`
- Modify: `app/(dashboard)/[username]/components/ProfileTab.tsx`
- Create: `app/(dashboard)/[username]/saved/page.tsx`
- Create: `app/(dashboard)/[username]/groups/page.tsx`
- Create: `app/(dashboard)/[username]/videos/page.tsx`
- Create: `app/(dashboard)/calendar/page.tsx`
- Create: `lib/calendar-reminders.mjs`
- Create: `lib/calendar-reminders.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendarReminders } from "./calendar-reminders.mjs";

test("buildCalendarReminders returns birthdays, events, and post memories in calendar order", () => {
  const reminders = buildCalendarReminders({
    today: new Date("2026-06-08T00:00:00.000Z"),
    birthdays: [{ username: "alex", date: "2026-06-12" }],
    events: [{ title: "Launch party", date: "2026-06-20" }],
    memories: [
      { postId: "p1", date: "2026-05-08" },
      { postId: "p2", date: "2025-06-08" },
    ],
  });

  assert.equal(reminders[0].type, "birthday");
  assert.equal(reminders[1].type, "event");
  assert.equal(reminders[2].type, "memory");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/calendar-reminders.test.mjs`

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function buildCalendarReminders({ birthdays, events, memories }) {
  return [
    ...birthdays.map(item => ({ type: "birthday", ...item })),
    ...events.map(item => ({ type: "event", ...item })),
    ...memories.map(item => ({ type: "memory", ...item })),
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/calendar-reminders.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/[username]/components/ProfileClient.tsx app/(dashboard)/[username]/components/ProfileTab.tsx app/(dashboard)/[username]/saved/page.tsx app/(dashboard)/[username]/groups/page.tsx app/(dashboard)/[username]/videos/page.tsx app/(dashboard)/calendar/page.tsx lib/calendar-reminders.mjs lib/calendar-reminders.test.mjs
git commit -m "feat: add profile library and calendar reminders"
```

## Task 6: Suggested Match, events visibility, and right-rail recommendations

**Files:**
- Create: `lib/match-recommendations.mjs`
- Create: `lib/match-recommendations.test.mjs`
- Create: `lib/event-discovery.mjs`
- Create: `lib/event-discovery.test.mjs`
- Modify: `components/Aside.tsx`
- Create: `app/(dashboard)/discover/match/page.tsx`
- Create: `app/(dashboard)/discover/events/page.tsx`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { rankMatchCandidates } from "./match-recommendations.mjs";
import { rankEvents } from "./event-discovery.mjs";

test("rankMatchCandidates prefers compatible candidates with explicit preferences", () => {
  const ranked = rankMatchCandidates(
    [
      { id: "a", gender: "female", workMatch: 3, ageDiff: 1, interestMatch: 4, friendOfFriend: 0 },
      { id: "b", gender: "female", workMatch: 0, ageDiff: 8, interestMatch: 1, friendOfFriend: 1 },
    ],
    {
      genderPreference: "female",
      ageRange: [24, 34],
      relationshipIntent: "marriage",
    }
  );

  assert.equal(ranked[0].id, "a");
});

test("rankEvents keeps public events and private events separate", () => {
  const ranked = rankEvents([
    { id: "public-1", visibility: "public", participants: 120 },
    { id: "private-1", visibility: "private", participants: 45 },
  ]);

  assert.equal(ranked[0].visibility, "public");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/match-recommendations.test.mjs lib/event-discovery.test.mjs`

Expected: FAIL because the helpers do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function rankMatchCandidates(candidates, preferences) {
  if (!preferences?.genderPreference) return [];
  return [...candidates].sort((left, right) => right.interestMatch - left.interestMatch);
}

export function rankEvents(events) {
  return [...events].sort((left, right) => {
    if (left.visibility !== right.visibility) {
      return left.visibility === "public" ? -1 : 1;
    }

    return right.participants - left.participants;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/match-recommendations.test.mjs lib/event-discovery.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/match-recommendations.mjs lib/match-recommendations.test.mjs lib/event-discovery.mjs lib/event-discovery.test.mjs components/Aside.tsx app/(dashboard)/discover/match/page.tsx app/(dashboard)/discover/events/page.tsx
git commit -m "feat: add match and event discovery surfaces"
```

## Task 7: SEO, sitemap, and final validation

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(dashboard)/[username]/[postId]/video/page.tsx`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`
- Create: `app/(dashboard)/discover/page.tsx`
- Create: `lib/site-metadata.mjs`
- Create: `lib/site-metadata.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildSiteMetadata } from "./site-metadata.mjs";

test("buildSiteMetadata keeps metadataBase, robots, and open graph aligned", () => {
  const metadata = buildSiteMetadata({
    canonical: "https://example.com/jane/post-123",
    title: "Sunset reel",
    description: "Video post on Perfekt Hub",
  });

  assert.equal(metadata.metadataBase.toString(), "https://example.com/");
  assert.equal(metadata.robots.index, true);
  assert.equal(metadata.openGraph.title, "Sunset reel");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/site-metadata.test.mjs`

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function buildSiteMetadata({ canonical, title, description }) {
  return {
    metadataBase: new URL(new URL(canonical).origin),
    robots: { index: true, follow: true },
    openGraph: { title, description, url: canonical },
  };
}
```

- [ ] **Step 4: Run the tests and full validation**

Run:
```bash
node --test lib/site-metadata.test.mjs
npm test
npm run lint
npm run build
```

Expected: PASS with no build or lint regressions.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/(dashboard)/[username]/[postId]/video/page.tsx app/(dashboard)/discover/page.tsx app/robots.ts app/sitemap.ts lib/site-metadata.mjs lib/site-metadata.test.mjs
git commit -m "feat: finish video discovery seo foundation"
```
