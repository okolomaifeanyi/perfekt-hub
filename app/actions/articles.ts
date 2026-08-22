"use server";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicClient, getSupabaseServerClient } from "@/lib/supabase/client";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { checkRateLimit } from "@/lib/rate-limit.mjs";
import {
  dedupeSlug,
  deriveExcerpt,
  estimateReadingMinutes,
  isValidCoverImageUrl,
  slugify,
  validateArticleInput,
} from "@/lib/articles.mjs";

export type ArticleStatus = "draft" | "published";

export type ArticleProps = {
  id: string;
  authorUid: string;
  authorUsername: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
  status: ArticleStatus;
  readingMinutes: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapArticleRow(row: Record<string, unknown>): ArticleProps {
  return {
    id: row.id as string,
    authorUid: row.authoruid as string,
    authorUsername: row.authorusername as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string,
    body: row.body as string,
    coverImageUrl: (row.coverimageurl as string | null) ?? null,
    status: row.status as ArticleStatus,
    readingMinutes: Number(row.readingminutes ?? 1),
    viewCount: Number(row.viewcount ?? 0),
    publishedAt: (row.publishedat as string | null) ?? null,
    createdAt: row.createdat as string,
    updatedAt: row.updatedat as string,
  };
}

// Same request-scoped, RLS-respecting client pattern as withPostAttachmentClient
// in app/actions/posts.tsx — every write below relies on the actual RLS
// policies in the articles migration as the real enforcement boundary, not
// just the uid checks in this file (defense in depth).
async function withArticlesClient<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot mutate cookies; the proxy refreshes them.
        }
      });
    },
  });
  await supabase.auth.getUser();
  return callback(supabase);
}

export async function createArticle(input: {
  title: string;
  body: string;
  coverImageUrl?: string | null;
  status?: ArticleStatus;
}): Promise<ArticleProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to write an article");

  // Ties the rate-limiting infrastructure (built in lib/rate-limit.mjs but,
  // per the 2026-08-22 audit, never actually wired into any route) into the
  // one write path this feature adds. 10 creates/hour is generous for a
  // real writer and tight enough to blunt scripted spam.
  const withinLimit = await checkRateLimit(`create-article:${uid}`, 10, 60 * 60);
  if (!withinLimit) {
    throw new Error("You're creating articles too quickly — please wait a bit and try again.");
  }

  const validation = validateArticleInput({ title: input.title, body: input.body });
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
  if (!isValidCoverImageUrl(input.coverImageUrl)) {
    throw new Error("Cover image must be a valid http(s) URL");
  }

  const title = input.title.trim();
  const body = input.body.trim();
  const status: ArticleStatus = input.status === "published" ? "published" : "draft";
  const coverImageUrl = input.coverImageUrl?.trim() || null;

  return withArticlesClient(async client => {
    const { data: userRow, error: userError } = await client
      .from("users")
      .select("username")
      .eq("uid", uid)
      .maybeSingle();
    if (userError) throw userError;
    if (!userRow?.username) throw new Error("Could not resolve your username");

    const { data: existing, error: existingError } = await client
      .from("articles")
      .select("slug")
      .eq("authoruid", uid);
    if (existingError) throw existingError;

    const slug = dedupeSlug(
      slugify(title),
      (existing ?? []).map(row => row.slug as string)
    );
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: insertError } = await client.from("articles").insert({
      id,
      authoruid: uid,
      authorusername: userRow.username,
      title,
      slug,
      excerpt: deriveExcerpt(body),
      body,
      coverimageurl: coverImageUrl,
      status,
      readingminutes: estimateReadingMinutes(body),
      publishedat: status === "published" ? now : null,
    });
    if (insertError) throw insertError;

    const { data: row, error: fetchError } = await client.from("articles").select("*").eq("id", id).single();
    if (fetchError) throw fetchError;

    return mapArticleRow(row);
  });
}

export async function updateArticle(
  id: string,
  input: { title?: string; body?: string; coverImageUrl?: string | null }
): Promise<ArticleProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to edit an article");

  return withArticlesClient(async client => {
    const { data: currentRow, error: currentError } = await client
      .from("articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!currentRow) throw new Error("Article not found");
    if (currentRow.authoruid !== uid) throw new Error("You can only edit your own articles");

    const nextTitle = input.title !== undefined ? input.title.trim() : (currentRow.title as string);
    const nextBody = input.body !== undefined ? input.body.trim() : (currentRow.body as string);

    const validation = validateArticleInput({ title: nextTitle, body: nextBody });
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    if (input.coverImageUrl !== undefined && !isValidCoverImageUrl(input.coverImageUrl)) {
      throw new Error("Cover image must be a valid http(s) URL");
    }

    const updates: Record<string, unknown> = {
      title: nextTitle,
      body: nextBody,
      excerpt: deriveExcerpt(nextBody),
      readingminutes: estimateReadingMinutes(nextBody),
    };

    if (input.coverImageUrl !== undefined) {
      updates.coverimageurl = input.coverImageUrl?.trim() || null;
    }

    // Slug is deliberately not regenerated on a title edit — once an
    // article exists at a URL, that URL should stay stable across edits
    // (bookmarks, shared links, and search-engine indexing all depend on
    // it not moving).

    const { data, error } = await client
      .from("articles")
      .update(updates)
      .eq("id", id)
      .eq("authoruid", uid)
      .select("*")
      .single();
    if (error) throw error;

    return mapArticleRow(data);
  });
}

export async function publishArticle(id: string): Promise<ArticleProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to publish an article");

  return withArticlesClient(async client => {
    const { data: currentRow, error: currentError } = await client
      .from("articles")
      .select("publishedat")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!currentRow) throw new Error("Article not found");

    const { data, error } = await client
      .from("articles")
      .update({
        status: "published",
        // A previously-published article being re-published (e.g. after an
        // edit) keeps its original publishedAt instead of jumping back to
        // the top of a chronological feed every time it's saved.
        publishedat: currentRow.publishedat ?? new Date().toISOString(),
      })
      .eq("id", id)
      .eq("authoruid", uid)
      .select("*")
      .single();
    if (error) throw error;

    return mapArticleRow(data);
  });
}

export async function unpublishArticle(id: string): Promise<ArticleProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to unpublish an article");

  return withArticlesClient(async client => {
    const { data, error } = await client
      .from("articles")
      .update({ status: "draft" })
      .eq("id", id)
      .eq("authoruid", uid)
      .select("*")
      .single();
    if (error) throw error;
    return mapArticleRow(data);
  });
}

export async function deleteArticle(id: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to delete an article");

  await withArticlesClient(async client => {
    const { data, error } = await client.from("articles").delete().eq("id", id).eq("authoruid", uid).select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Only the author can delete this article");
    }
  });
}

// Public read: works for a signed-out visitor (published only, enforced by
// RLS) and for the article's own author viewing their own draft (also via
// RLS — see articles_read_published_or_own). Uses the cookie-aware server
// client rather than the plain public client specifically so a signed-in
// author's session is honored here.
export async function getArticleBySlug(username: string, slug: string): Promise<ArticleProps | null> {
  return withArticlesClient(async client => {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("authorusername", username)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? mapArticleRow(data) : null;
  });
}

// Powers the compose page's "load an existing article to keep editing"
// flow (?id=... — see app/(dashboard)/articles/compose/page.tsx). Unlike
// getArticleBySlug, this is author-only even for a published article: it's
// meant for the edit form, not for display, so there's no reason to let it
// resolve anyone else's article at all, published or not.
export async function getArticleForEdit(id: string): Promise<ArticleProps | null> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to edit an article");

  return withArticlesClient(async client => {
    const { data, error } = await client.from("articles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data || data.authoruid !== uid) return null;
    return mapArticleRow(data);
  });
}

// No personalization here — every visitor sees the same published list —
// so the plain public client is enough, same reasoning as getNewsFeed in
// app/actions/curatedContent.ts.
export async function listPublishedArticles(
  params: { limit?: number; offset?: number } = {}
): Promise<ArticleProps[]> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("publishedat", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapArticleRow);
}

export async function listMyArticles(): Promise<ArticleProps[]> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("You must be signed in to view your articles");

  return withArticlesClient(async client => {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("authoruid", uid)
      .order("createdat", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapArticleRow);
  });
}

// Lightweight projection for app/sitemap.ts — only the columns a sitemap
// entry needs, capped well below Google's per-sitemap limits.
export async function listPublishedArticleSlugsForSitemap(
  limit = 500
): Promise<{ username: string; slug: string; updatedAt: string }[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("authorusername, slug, updatedat")
    .eq("status", "published")
    .order("publishedat", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    username: row.authorusername as string,
    slug: row.slug as string,
    updatedAt: row.updatedat as string,
  }));
}

// Best-effort — a failed view-count bump should never break the page
// render, same "fails open" philosophy as checkRateLimit. The anon-role
// public client is enough: increment_article_view is a SECURITY DEFINER
// RPC granted to anon/authenticated, and the RPC itself (not the caller's
// role) is what enforces "only published rows, only viewCount" — see the
// migration.
export async function incrementArticleView(id: string): Promise<void> {
  try {
    const supabase = getSupabasePublicClient();
    await supabase.rpc("increment_article_view", { p_article_id: id });
  } catch (err) {
    console.error("incrementArticleView failed:", err);
  }
}
