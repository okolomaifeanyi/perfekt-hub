import { notFound } from "next/navigation";
import { getCuratedContentById, getMatchAnalysis } from "@/app/actions/curatedContent";
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

  const analysis =
    FOOTBALL_CATEGORIES.includes(item.category) && item.external_id
      ? await getMatchAnalysis(item.external_id)
      : null;

  return <ContentDetailClient item={item} analysis={analysis} />;
}
