import { notFound } from "next/navigation";
import { getCuratedContentById, getMatchAnalysis, getMatchSummary } from "@/app/actions/curatedContent";
import { incrementCuratedContentView } from "@/app/actions/curatedContentEngagement";
import { FOOTBALL_CATEGORIES } from "@/lib/curated-content-categories.mjs";
import ContentDetailClient from "./ContentDetailClient";

// A view only counts once someone actually clicks through to this page
// (see CuratedContentDisplay's ActionBar, which no longer increments on
// card mount) — so this route needs to run fresh on every visit rather than
// serve a cached snapshot.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const item = await getCuratedContentById(id);
  if (!item) return {};

  return {
    title: item.title,
    description: item.body?.slice(0, 160) || item.title,
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getCuratedContentById(id);
  if (!item) return notFound();

  await incrementCuratedContentView(id);

  // A finished result gets the post-match recap (score, goals, and whether
  // the pre-match prediction held up) instead of the pre-match analysis —
  // that analysis is written before kickoff and never updated, so it would
  // otherwise still show a "Prediction: ..." line for a match that's over.
  const analysis = item.external_id
    ? item.category === "football_result"
      ? await getMatchSummary(item.external_id)
      : FOOTBALL_CATEGORIES.includes(item.category)
        ? await getMatchAnalysis(item.external_id)
        : null
    : null;

  return <ContentDetailClient item={item} analysis={analysis} />;
}
