import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";

const API_URL = "https://www.googleapis.com/youtube/v3/videos";
const REQUEST_TIMEOUT_MS = 8000;
const DESCRIPTION_MAX_LENGTH = 280;

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || null;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// videos.list?chart=mostPopular costs 1 quota unit per call (confirmed live
// against Google's docs) vs. 100 units for search.list — against a 10,000/day
// free quota that's the difference between this running constantly and
// running twice.
export async function runVideosIngestion() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("runVideosIngestion: YOUTUBE_API_KEY not set, skipping");
    return { skipped: true };
  }

  const params = new URLSearchParams({
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode: "US",
    maxResults: "25",
    key: apiKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data;
  try {
    const response = await fetch(`${API_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    return { skipped: false, error: `YouTube: ${error.message}` };
  } finally {
    clearTimeout(timeout);
  }

  const videos = Array.isArray(data?.items) ? data.items : [];
  const items = videos
    .filter(video => video?.id && video?.snippet?.title)
    .map(video => {
      const thumbnail =
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        video.snippet.thumbnails?.default?.url ||
        null;

      return {
        category: "video_trending",
        title: video.snippet.title,
        body: truncate(video.snippet.description, DESCRIPTION_MAX_LENGTH),
        image_url: thumbnail,
        source_url: `https://www.youtube.com/watch?v=${video.id}`,
        source_name: video.snippet.channelTitle || "YouTube",
        external_id: `yt-${video.id}`,
        metadata: {
          channelId: video.snippet.channelId || null,
          channelTitle: video.snippet.channelTitle || null,
          viewCount: video.statistics?.viewCount ?? null,
          likeCount: video.statistics?.likeCount ?? null,
        },
        published_at: video.snippet.publishedAt || new Date().toISOString(),
      };
    });

  const result = await upsertCuratedContent(items);
  return { skipped: false, ...result };
}
