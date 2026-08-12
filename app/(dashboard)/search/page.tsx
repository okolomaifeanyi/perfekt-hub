import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const destination = query ? `/discover?q=${encodeURIComponent(query)}` : "/discover";
  redirect(destination);
}
