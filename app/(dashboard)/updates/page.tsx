import { getFootballScores, getNewsFeed } from "@/app/actions/curatedContent";
import UpdatesClient from "./UpdatesClient";

// Without this, Next.js prerenders the page once at build time and every
// visitor gets that frozen snapshot forever — pointless for scores that
// change every 2 minutes. 60s roughly matches the live-score poll cadence
// without hitting the database on every single page load.
export const revalidate = 60;

export const metadata = {
  title: "Scores & News",
  description:
    "Live football scores, fixtures, results, and news across crypto, betting, music, tech, and more.",
};

export default async function UpdatesPage() {
  const [scores, news] = await Promise.all([getFootballScores(), getNewsFeed()]);

  return <UpdatesClient initialScores={scores} initialNews={news} />;
}
