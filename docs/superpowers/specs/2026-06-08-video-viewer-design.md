# Video Viewer and Recommendation Feed Design

## Context

The app already has post pages, media rendering, comments, reactions, and a lightbox-style media viewer. The current video experience is not a dedicated browse flow: users open a post, view its media, and stop there. The request is to make video consumption feel closer to a modern short-form feed while keeping the existing post page and comments intact.

## Goals

- Give every video post a shareable video URL.
- Default to a full-screen video experience.
- Let users scroll to the next video without leaving the viewer.
- Show the post and comments beside the video on desktop when the user chooses to inspect details.
- Keep mobile usable without hover-only interactions.
- Rank video recommendations by watch time first, then likes, then tags/categories, then follows.
- Keep the queue from running dry by preloading and extending it before the user reaches the end.
- Preserve the canonical post page and avoid duplicate-content confusion.
- Make recommendation inserts adapt to feed density and engagement instead of using a rigid fixed interval.

## Non-goals

- Replacing the entire post detail page.
- Adding live chat, calls, or Stream integration in this slice.
- Building a full creator studio or video editor.
- Rewriting the existing feed ranking engine for non-video posts.

## Current State

- Video media already exists in posts via `PostProps.media`.
- `app/(dashboard)/[username]/[postId]/page.tsx` renders the existing post detail experience.
- `components/feed/post/CommentFeed` and `app/(dashboard)/[username]/[postId]/components/PostCard.tsx` already provide comments and post details.
- `app/(dashboard)/[username]/[postId]/components/PostMedia.tsx` currently opens a lightbox for media instead of a route-based video viewer.
- `app/actions/feed.ts` already provides a server-side feed loader and a relationship-aware author set, which can be reused as the basis for recommended video candidates.

## Route Model

- Canonical post URL stays `/{username}/{postId}`.
- Video URL becomes `/{username}/{postId}/video`.
- The video URL is a route variant for browsing and sharing, not a separate content object.
- The video route should derive its data from the same post ID and reuse the same media source.
- The video route should generate metadata that points canonical back to the post page to avoid duplicate-content issues.

## Viewer Behavior

- The viewer opens full-screen by default.
- The active video fills the viewport and advances vertically to the next item on scroll.
- The scroll model should use a snap-like behavior so one clip feels centered and the next clip feels intentional, not accidental.
- On desktop, a `View post` control appears on hover.
- Clicking that control opens a right rail with:
  - the post content,
  - the author,
  - reactions,
  - comments,
  - reply/quote actions.
- On mobile, the same control should be visible without hover and open a bottom sheet or drawer instead of a right rail.
- The current post detail panel should update smoothly when the active video changes.
- The transition between videos should be animated with a subtle crossfade or slide, but motion should respect reduced-motion settings.

## Recommendation Model

The initial recommendation order should be:

1. Watch behavior
   - watch time,
   - completion rate,
   - replay rate,
   - skip rate.
2. Engagement
   - likes,
   - dislikes as negative signal.
3. Content similarity
   - matching tags,
   - matching categories/topics,
   - similar media type.
4. Quote activity
   - quote-post frequency,
   - quote-post engagement quality.
5. Reply activity
   - reply frequency,
   - reply-thread engagement quality.
6. Social proximity
   - follows,
   - friends,
   - repeated creator affinity.

Rules:

- Use follows as a boost, not the primary driver.
- Treat quotes and replies as separate signals, each weaker than direct engagement and content similarity.
- Prefer variety across creators so the queue does not feel repetitive.
- Suppress already-seen or explicitly hidden items.
- Fall back to trending videos inside the user’s strongest categories when watch history is sparse.
- Fall back to global trending video posts when category data is thin.
- Insert horizontal recommendation carousels dynamically when the feed is dense enough or engagement suggests a break, rather than on a fixed post count.

The system should maintain a short rolling queue, roughly 10 to 20 videos ahead of the active item, and refresh it before the visible queue gets low.

## Data Model

This slice should not store the video URL as a persisted field unless a future migration needs it. The URL is derivable from the route and post ID.

Recommended derived and aggregate data:

- `videoUrl`: derived from `username` + `postId`.
- `VideoRecommendationItem`: internal structure with `postId`, `score`, `reason`, and `rank`.
- `UserVideoInterestProfile`: aggregate of tags, categories, creators, watch time, completion, and like history.
- `VideoWatchEvent`: `postId`, `viewerUid`, `watchedMs`, `durationMs`, `completed`, `replayed`, `liked`, `tags`, `categories`.

Keep watch aggregates server-owned so the client cannot spoof the ranking model by writing directly to the post record.

## Data Flow

1. User opens `/{username}/{postId}/video`.
2. The server loads the post and the first recommendation queue.
3. The viewer renders the current clip and the right-rail toggle.
4. As the user watches, the client records watch events in batches.
5. The server updates aggregate watch signals.
6. When the queue drops below the refill threshold, the server fetches more ranked video candidates.
7. When the active video changes, the route updates smoothly and the right rail follows the new post.

## SEO and Metadata

- Keep the canonical post page indexable.
- Give the video route its own metadata for sharing.
- Use a `videoUrl` CTA on the post page when a video exists.
- Populate Open Graph and Twitter metadata for the video route from the post’s media thumbnail or video poster frame.
- Include a per-route title and description so the video page is meaningful when shared.
- Add `metadataBase` at the app root if it is not already set correctly for production sharing URLs.

## Product Surfaces

The video viewer sits inside a broader social product surface map. These routes and surfaces should stay consistent with the video experience and feed interruption logic:

- **Discover**
  - top and trending saves,
  - top and trending events,
  - top and trending groups,
  - most-followed people,
  - strongest friend connections,
  - richer search across people, posts, videos, groups, and events.
- **Suggested Match**
  - opt-in compatibility surface,
  - requires preference setup before recommendations are shown,
  - preferences can include gender, age range, job/work similarity, birthday proximity, age-mate filtering, interests, and relationship intent,
  - should support follow or befriend actions,
  - intended for compatible pairings with dating or marriage intent.
- **Profile**
  - posts,
  - videos,
  - saved posts,
  - saved videos,
  - groups the user belongs to.
- **Calendar**
  - next friends’ birthdays,
  - next events,
  - post memory reminders for one month ago and one year ago.
- **Events**
  - public events,
  - private events.
- **Right rail on desktop**
  - 1 to 2 friend recommendations,
  - 1 to 2 follower recommendations,
  - quick call/message actions for online friends,
  - 1 to 2 recommended groups.

The feed itself should also be able to interrupt the normal timeline with horizontal recommendation carousels for groups, friends, followers, events, and videos when engagement and feed density justify it.

## Accessibility

- All viewer controls need visible labels or accessible names.
- The right-rail toggle must be keyboard reachable.
- Escape should close the right rail or sheet.
- Arrow keys or standard scroll should move between videos without trapping focus.
- The right rail and bottom sheet should keep focus management sane when opened and closed.
- Reduced-motion users should get a low-motion transition or no animation.

## Performance and Reliability

- Prefetch the next few video posts and their media assets before the queue runs low.
- Avoid loading the full right rail until the user opens it.
- Batch watch events so the app does not emit a network request on every tiny scroll change.
- Skip broken or deleted video posts and move to the next candidate.
- If ranking fails, fall back to a trending queue instead of blocking playback.
- Keep the recommendation query server-side so client state does not determine the feed.

## Components and Files

Expected implementation shape:

- `app/(dashboard)/[username]/[postId]/video/page.tsx` for the video route.
- `components/video-viewer/*` or a similar focused folder for the viewer shell, rail, and toggle.
- `lib/video-recommendations.*` for ranking, queue refill, and fallback logic.
- `lib/video-url.*` for derived share URLs.
- `app/api/video/watch/route.ts` or a server action for batched watch events.
- Reuse `PostCard`, `CommentFeed`, `PostMedia`, and existing post data loaders where possible.

## Testing Plan

Add tests for:

- derived video URL generation,
- recommendation scoring order,
- queue refill behavior,
- fallback selection when signals are sparse,
- skipping deleted/unavailable videos,
- metadata output for the video route,
- desktop toggle and mobile drawer behavior,
- smooth active-item changes,
- batched watch event payloads.

If browser coverage is available later, add an end-to-end test that:

- opens a video URL,
- scrolls to the next video,
- opens the post/comments panel,
- closes it,
- confirms the route updates without a broken state.

## Open Questions Resolved

- The video experience defaults to fullscreen.
- The post/comments panel is secondary and appears on demand.
- Recommendation priority is watch time, likes, tags/categories, then follows.
- The video route is a shareable extended post URL, not a new post type.
