"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getPost } from "@/lib/data";
import { rankMatchCandidates } from "@/lib/match-recommendations.mjs";
import { PostProps, UserProps } from "@/lib/types";
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

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const [year] = dob.split("-");
  const birthYear = parseInt(year, 10);
  return Number.isNaN(birthYear) ? null : new Date().getFullYear() - birthYear;
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
      .select("uid, username, fullname, photourl, gender, dob, followerscount, followingcount, friendscount, completedprofile")
      .neq("uid", currentUid)
      .eq("gender", genderPreference)
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
