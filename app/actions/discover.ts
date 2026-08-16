"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getPost } from "@/lib/data";
import { rankMatchCandidates } from "@/lib/match-recommendations.mjs";
import { MARRIED_STATUS } from "@/lib/marital-status.mjs";
import { calculateAge } from "@/lib/dob.mjs";
import { PostProps, UserProps } from "@/lib/types";

// PostgREST .neq() on a nullable column excludes NULL rows too (SQL's
// `NULL <> 'Married'` is NULL, not true) — almost every candidate has never
// set a relationship status at all, so a plain .neq() would wrongly hide
// them all. This explicit .or() keeps "never set" alongside "set to
// anything but Married".
const EXCLUDE_MARRIED_FILTER = `relationship.is.null,relationship.neq.${MARRIED_STATUS}`;
import type { SupabaseClient } from "@supabase/supabase-js";

async function withSupabaseRequestContext<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  await supabase.auth.getUser();
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

export async function getTopSavedPosts(limit = 5): Promise<PostProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } = await client.rpc("get_top_saved_posts", {
      result_limit: limit,
    });
    if (error) throw error;

    const posts = await Promise.all(
      (data ?? []).map((row: { postid: string }) => getPost(row.postid))
    );
    return posts.filter((post): post is PostProps => Boolean(post));
  });
}

export async function listSavesPage(params: {
  offset: number;
  sortMode: "time" | "engagement";
  limit: number;
}): Promise<PostProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } =
      params.sortMode === "time"
        ? await client.rpc("get_recently_saved_posts", {
            result_limit: params.limit,
            result_offset: params.offset,
          })
        : await client.rpc("get_top_saved_posts_page", {
            result_limit: params.limit,
            result_offset: params.offset,
          });
    if (error) throw error;

    const posts = await Promise.all(
      (data ?? []).map((row: { postid: string }) => getPost(row.postid))
    );
    return posts.filter((post): post is PostProps => Boolean(post));
  });
}

export async function listPeoplePage(params: {
  currentUid: string;
  offset: number;
  sortMode: "time" | "engagement";
  limit: number;
}): Promise<UserProps[]> {
  return withSupabaseRequestContext(async client => {
    const query = client
      .from("users")
      .select("uid, username, fullname, photourl, followerscount, followingcount, friendscount, completedprofile, createdat")
      .neq("uid", params.currentUid)
      .range(params.offset, params.offset + params.limit - 1);
    const { data, error } =
      params.sortMode === "time"
        ? await query.order("createdat", { ascending: false })
        : await query.order("followerscount", { ascending: false });
    if (error) throw error;

    return (data ?? []).map(row => ({
      uid: row.uid as string,
      username: row.username as string,
      fullName: (row.fullname as string) ?? "",
      photoURL: (row.photourl as string) ?? "",
      followersCount: (row.followerscount as number) ?? 0,
      followingCount: (row.followingcount as number) ?? 0,
      friendsCount: (row.friendscount as number) ?? 0,
      completedProfile: Boolean(row.completedprofile),
    }));
  });
}

export async function getSuggestedMatches(
  currentUid: string,
  limit = 5
): Promise<UserProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data: me, error: meError } = await client
      .from("users")
      .select("gender, dob")
      .eq("uid", currentUid)
      .maybeSingle();
    if (meError) throw meError;
    if (!me) return [];

    // This app doesn't (yet) have a dedicated "who are you interested in"
    // preference setting, and rankMatchCandidates requires one to produce
    // any ranking at all — default to the opposite of the user's own gender
    // as a reasonable starting point rather than showing nothing.
    const genderPreference =
      me.gender === "male" ? "female" : me.gender === "female" ? "male" : "female";
    const myAge = calculateAge(me.dob as string | null);

    const { data: candidates, error } = await client
      .from("users")
      .select("uid, username, fullname, photourl, gender, dob, relationship, followerscount, followingcount, friendscount, completedprofile")
      .neq("uid", currentUid)
      .eq("gender", genderPreference)
      .or(EXCLUDE_MARRIED_FILTER)
      .limit(50);
    if (error) throw error;
    if (!candidates || candidates.length === 0) return [];

    const ranked = rankMatchCandidates(
      candidates.map(candidate => ({
        id: candidate.uid,
        gender: candidate.gender,
        ageDiff: myAge && candidate.dob ? Math.abs(myAge - (calculateAge(candidate.dob as string) ?? myAge)) : 0,
        workMatch: 0,
        interestMatch: 0,
        likeMatch: 0,
        friendOfFriend: 0,
      })),
      { genderPreference, ageRange: [18, 99] }
    );

    const candidateByUid = new Map(candidates.map(c => [c.uid, c]));

    return ranked
      .slice(0, limit)
      .map(entry => candidateByUid.get(entry.id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(row => ({
        uid: row.uid as string,
        username: row.username as string,
        fullName: (row.fullname as string) ?? "",
        photoURL: (row.photourl as string) ?? "",
        gender: row.gender as UserProps["gender"],
        followersCount: (row.followerscount as number) ?? 0,
        followingCount: (row.followingcount as number) ?? 0,
        friendsCount: (row.friendscount as number) ?? 0,
        completedProfile: Boolean(row.completedprofile),
      }));
  });
}

export async function listMatchesPage(params: {
  currentUid: string;
  offset: number;
  sortMode: "time" | "engagement";
  limit: number;
}): Promise<UserProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data: me, error: meError } = await client
      .from("users")
      .select("gender, dob")
      .eq("uid", params.currentUid)
      .maybeSingle();
    if (meError) throw meError;
    if (!me) return [];

    const genderPreference =
      me.gender === "male" ? "female" : me.gender === "female" ? "male" : "female";

    if (params.sortMode === "time") {
      const { data, error } = await client
        .from("users")
        .select("uid, username, fullname, photourl, gender, relationship, followerscount, followingcount, friendscount, completedprofile, createdat")
        .neq("uid", params.currentUid)
        .eq("gender", genderPreference)
        .or(EXCLUDE_MARRIED_FILTER)
        .order("createdat", { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);
      if (error) throw error;
      return (data ?? []).map(row => ({
        uid: row.uid as string,
        username: row.username as string,
        fullName: (row.fullname as string) ?? "",
        photoURL: (row.photourl as string) ?? "",
        gender: row.gender as UserProps["gender"],
        followersCount: (row.followerscount as number) ?? 0,
        followingCount: (row.followingcount as number) ?? 0,
        friendsCount: (row.friendscount as number) ?? 0,
        completedProfile: Boolean(row.completedprofile),
      }));
    }

    // Engagement mode: match-score ranking doesn't have a DB-level sort
    // column, so rank a reasonably large pool once and slice it for the
    // requested page — approximate pagination, same tradeoff as the rest
    // of these offset-paginated lists.
    const myAge = calculateAge(me.dob as string | null);
    const { data: candidates, error } = await client
      .from("users")
      .select("uid, username, fullname, photourl, gender, dob, relationship, followerscount, followingcount, friendscount, completedprofile")
      .neq("uid", params.currentUid)
      .eq("gender", genderPreference)
      .or(EXCLUDE_MARRIED_FILTER)
      .limit(300);
    if (error) throw error;
    if (!candidates || candidates.length === 0) return [];

    const ranked = rankMatchCandidates(
      candidates.map(candidate => ({
        id: candidate.uid,
        gender: candidate.gender,
        ageDiff: myAge && candidate.dob ? Math.abs(myAge - (calculateAge(candidate.dob as string) ?? myAge)) : 0,
        workMatch: 0,
        interestMatch: 0,
        likeMatch: 0,
        friendOfFriend: 0,
      })),
      { genderPreference, ageRange: [18, 99] }
    );

    const candidateByUid = new Map(candidates.map(c => [c.uid, c]));

    return ranked
      .slice(params.offset, params.offset + params.limit)
      .map(entry => candidateByUid.get(entry.id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(row => ({
        uid: row.uid as string,
        username: row.username as string,
        fullName: (row.fullname as string) ?? "",
        photoURL: (row.photourl as string) ?? "",
        gender: row.gender as UserProps["gender"],
        followersCount: (row.followerscount as number) ?? 0,
        followingCount: (row.followingcount as number) ?? 0,
        friendsCount: (row.friendscount as number) ?? 0,
        completedProfile: Boolean(row.completedprofile),
      }));
  });
}
