"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Clapperboard,
  HeartHandshake,
  Newspaper,
  Radio,
  Sparkles,
  Tag,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import UserCard from "@/components/UserCard";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { useUserStore } from "@/lib/store/useUserStore";
import { useCuratedInterests } from "@/hooks/useCuratedInterests";
import { getFeedAction } from "@/app/actions/feed";
import { getSuggestedMatches, getTopSavedPosts } from "@/app/actions/discover";
import { getMyGroupMemberships, listGroups, joinGroup, type GroupProps } from "@/app/actions/groups";
import { useGroupMembershipStore } from "@/lib/store/useGroupMembershipStore";
import { listUpcomingEvents, rsvpToEvent, type EventProps } from "@/app/actions/events";
import { listProductsPage, type PostProductProps } from "@/app/actions/posts";
import {
  getFootballScores,
  getBettingPredictions,
  getInterestedNews,
  type CuratedContentItem,
} from "@/app/actions/curatedContent";
import { formatContentTime, groupMatches } from "@/components/feed/CuratedContentDisplay";
import { hasVideoMedia } from "@/lib/video-viewer-queue.mjs";
import { buildVideoPostUrl } from "@/lib/video-url.mjs";
import { PostProps, UserProps } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { CreateEventDialog } from "@/components/CreateEventDialog";

type FeedRecommendationType =
  | "saves"
  | "friends"
  | "follows"
  | "groups"
  | "events"
  | "videos"
  | "matches"
  | "products"
  | "news"
  | "fixtures"
  | "live"
  | "results"
  | "betting";

// "vertical" is the original stacked-row-in-a-card look, used in the Aside
// sidebar and empty-state fallbacks. "horizontal" is a scroll-snap strip of
// compact cards, used for the feed's interleaved-between-posts interstitial
// (see Posts.tsx) — a narrow sidebar rail and a full-width feed slot need
// genuinely different layouts, not just a resize of the same one.
type RailLayout = "vertical" | "horizontal";

// A feed interstitial with only 1-2 cards reads as sparse filler rather than
// a real recommendation — below this, skip the slot entirely rather than
// show a half-empty strip. Vertical rails (Aside, empty states) don't use
// this; they're fine showing however few items exist.
const MIN_HORIZONTAL_RAIL_ITEMS = 5;

const railCopy: Record<
  FeedRecommendationType,
  { title: string; description: string; icon: LucideIcon }
> = {
  friends: {
    title: "People you may know",
    description: "Fresh people from your network and interests.",
    icon: Users,
  },
  follows: {
    title: "Suggested follows",
    description: "Broaden the timeline with relevant accounts.",
    icon: HeartHandshake,
  },
  saves: {
    title: "Top saves",
    description: "The posts and videos people revisit most.",
    icon: Bookmark,
  },
  groups: {
    title: "Recommended groups",
    description: "Communities aligned with your interests.",
    icon: Users,
  },
  events: {
    title: "Events for you",
    description: "Public and private events from your network.",
    icon: CalendarDays,
  },
  videos: {
    title: "More videos",
    description: "Keep the watch feed moving with fresh clips.",
    icon: Clapperboard,
  },
  matches: {
    title: "Suggested match",
    description: "Compatibility-based suggestions for follow or relationship intent.",
    icon: Sparkles,
  },
  products: {
    title: "Marketplace",
    description: "Items people are selling right now.",
    icon: Tag,
  },
  news: {
    title: "News for you",
    description: "From the topics you follow.",
    icon: Newspaper,
  },
  fixtures: {
    title: "Upcoming fixtures",
    description: "From the leagues you follow.",
    icon: CalendarDays,
  },
  live: {
    title: "Live right now",
    description: "Matches currently in play.",
    icon: Radio,
  },
  results: {
    title: "Recent results",
    description: "From the leagues you follow.",
    icon: Trophy,
  },
  betting: {
    title: "Betting predictions",
    description: "Odds-based picks from your leagues.",
    icon: TrendingUp,
  },
};

export function RailShell({
  title,
  description,
  icon: Icon,
  headerAction,
  seeMoreHref,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  headerAction?: React.ReactNode;
  seeMoreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="py-5">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="size-5" />
            {title}
          </CardTitle>
          {headerAction}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">{children}</CardContent>
      {seeMoreHref && (
        <CardContent className="pt-1">
          <Link
            href={seeMoreHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            See more
          </Link>
        </CardContent>
      )}
    </Card>
  );
}

// Header-only strip + a horizontally scrolling row of cards — no outer Card
// chrome, since this sits directly between posts in the feed rather than in
// a boxed sidebar column.
export function HorizontalRailShell({
  title,
  icon: Icon,
  headerAction,
  seeMoreHref,
  children,
}: {
  title: string;
  icon: LucideIcon;
  headerAction?: React.ReactNode;
  seeMoreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </p>
        <div className="flex items-center gap-3">
          {headerAction}
          {seeMoreHref && (
            <Link href={seeMoreHref} className="text-xs font-medium text-primary hover:underline">
              See more
            </Link>
          )}
        </div>
      </div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  );
}

// Every horizontal-rail card is a click-through to the full thing — no
// inline actions (join/RSVP) crammed into a 144px-wide tile. That mirrors
// the "click to see details" pattern the rest of the feed now follows for
// curated content too, rather than trying to cram everything inline.
export function CardTile({
  href,
  media,
  avatarSrc,
  avatarFallback,
  title,
  subtitle,
}: {
  href: string;
  media?: { type: string; src: string } | null;
  avatarSrc?: string | null;
  avatarFallback: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="w-36 shrink-0 snap-start overflow-hidden rounded-lg border border-border/60 transition hover:bg-accent/40"
    >
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
        {media?.type === "video" ? (
          <video src={media.src} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : media?.type === "image" ? (
          <Image src={media.src} alt="" width={144} height={81} unoptimized className="size-full object-cover" />
        ) : (
          <Avatar className="size-12">
            {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
            <AvatarFallback>{avatarFallback.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </Link>
  );
}

export function CardTileSkeleton() {
  return (
    <div className="w-36 shrink-0 space-y-2 overflow-hidden rounded-lg border border-border/60">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-1.5 p-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ListRow({
  href,
  avatarSrc,
  avatarFallback,
  title,
  subtitle,
}: {
  href: string;
  avatarSrc?: string;
  avatarFallback: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2.5 -mx-2",
        "transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <Avatar className="size-10 shrink-0">
        {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
        <AvatarFallback>{avatarFallback.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 -mx-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function EmptyRow({ label }: { label: string }) {
  return <p className="px-2 py-2 text-sm text-muted-foreground">{label}</p>;
}

// These rails all fetch through account-scoped server actions (a
// specific uid's feed, saves, matches, groups, events, listings) with no
// public equivalent — unlike the main feed, there's no reasonable
// "for anyone" fallback for e.g. "posts you saved". A signed-out visitor
// sees this instead of the real empty state.
const SIGN_IN_TO_SEE = "Sign in to see this.";

function PeopleRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const suggestions = useUserStore(state => state.suggestions);
  const fetchSmartSuggestions = useUserStore(state => state.fetchSmartSuggestions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid && suggestions.length === 0) {
      void fetchSmartSuggestions().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid, fetchSmartSuggestions, suggestions.length]);

  const people = suggestions.slice(0, previewCount);

  if (hideIfEmpty && !loading && people.length === 0) return null;

  if (layout === "horizontal") {
    if (!loading && people.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover/people">
        {loading
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : people.map(person => (
              <CardTile
                key={person.uid}
                href={`/${person.username}`}
                avatarSrc={person.photoURL || userAltImageUrl({ name: person.fullName || person.username })}
                avatarFallback={person.fullName || person.username || "U"}
                title={person.fullName || person.username}
                subtitle={person.bio || `@${person.username}`}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/people">
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : people.length === 0 ? (
        <EmptyRow label="No suggestions right now." />
      ) : (
        people.map(person => (
          <UserCard key={person.uid} user={person}>
            <ListRow
              href={`/${person.username}`}
              avatarSrc={person.photoURL || userAltImageUrl({ name: person.fullName || person.username })}
              avatarFallback={person.fullName || person.username || "U"}
              title={person.fullName || person.username}
              subtitle={person.bio || `@${person.username}`}
            />
          </UserCard>
        ))
      )}
    </RailShell>
  );
}

function VideosRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const [videos, setVideos] = useState<PostProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setVideos([]);
      return;
    }
    let active = true;

    // Never recommend the viewer's own videos back to them — this rail is
    // for discovering other people's clips, not a mirror of their Videos tab.
    void getFeedAction(currentUser.uid, 30, null, null, false, "trending").then(posts => {
      if (active) {
        setVideos(
          posts.filter(post => hasVideoMedia(post) && post.userId !== currentUser.uid).slice(0, previewCount)
        );
      }
    });

    return () => {
      active = false;
    };
  }, [currentUser?.uid, previewCount]);

  if (hideIfEmpty && videos !== null && videos.length === 0) return null;

  if (layout === "horizontal") {
    if (videos !== null && videos.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon}>
        {videos === null
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : videos.map(post => (
              <CardTile
                key={post.id}
                href={buildVideoPostUrl(post.username || "", post.id)}
                media={post.media?.[0]}
                avatarSrc={post.userPhotoURL}
                avatarFallback={post.userFullName || post.username || "U"}
                title={post.content || "Watch this video"}
                subtitle={post.userFullName || post.username}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell title={title} description={description} icon={icon}>
      {videos === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : videos.length === 0 ? (
        <EmptyRow label={currentUser ? "No videos yet." : SIGN_IN_TO_SEE} />
      ) : (
        videos.map(post => (
          <ListRow
            key={post.id}
            href={buildVideoPostUrl(post.username || "", post.id)}
            avatarSrc={post.userPhotoURL}
            avatarFallback={post.userFullName || post.username || "U"}
            title={post.userFullName || post.username || "Unknown"}
            subtitle={post.content || "Watch this video"}
          />
        ))
      )}
    </RailShell>
  );
}

function ActionRow({
  href,
  avatarSrc,
  avatarFallback,
  title,
  subtitle,
  actionLabel,
  actionDone,
  onAction,
}: {
  href: string;
  avatarSrc?: string | null;
  avatarFallback: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  actionDone: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 -mx-2">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-10 shrink-0">
          {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
          <AvatarFallback>{avatarFallback.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </Link>
      <Button
        size="sm"
        variant={actionDone ? "outline" : "default"}
        disabled={actionDone}
        onClick={onAction}
      >
        {actionDone ? "Done" : actionLabel}
      </Button>
    </div>
  );
}

function SavesRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const [posts, setPosts] = useState<PostProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setPosts([]);
      return;
    }
    let active = true;
    void getTopSavedPosts(previewCount)
      .then(result => {
        if (active) setPosts(result);
      })
      .catch(() => {
        if (active) setPosts([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid, previewCount]);

  if (hideIfEmpty && posts !== null && posts.length === 0) return null;

  if (layout === "horizontal") {
    if (posts !== null && posts.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover/saves">
        {posts === null
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : posts.map(post => (
              <CardTile
                key={post.id}
                href={`/${post.username}/${post.id}`}
                media={post.media?.[0]}
                avatarSrc={post.userPhotoURL}
                avatarFallback={post.userFullName || post.username || "U"}
                title={post.content || "View this post"}
                subtitle={post.userFullName || post.username}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/saves">
      {posts === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : posts.length === 0 ? (
        <EmptyRow
          label={currentUser ? "No saved posts yet — be the first to save one." : SIGN_IN_TO_SEE}
        />
      ) : (
        posts.map(post => (
          <ListRow
            key={post.id}
            href={`/${post.username}/${post.id}`}
            avatarSrc={post.userPhotoURL}
            avatarFallback={post.userFullName || post.username || "U"}
            title={post.userFullName || post.username || "Unknown"}
            subtitle={post.content || "View this post"}
          />
        ))
      )}
    </RailShell>
  );
}

function MatchesRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const [matches, setMatches] = useState<UserProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setMatches([]);
      return;
    }
    let active = true;
    void getSuggestedMatches(currentUser.uid, previewCount)
      .then(result => {
        if (active) setMatches(result);
      })
      .catch(() => {
        if (active) setMatches([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid, previewCount]);

  if (hideIfEmpty && matches !== null && matches.length === 0) return null;

  if (layout === "horizontal") {
    if (matches !== null && matches.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover/match">
        {matches === null
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : matches.map(person => (
              <CardTile
                key={person.uid}
                href={`/${person.username}`}
                avatarSrc={person.photoURL || userAltImageUrl({ name: person.fullName || person.username })}
                avatarFallback={person.fullName || person.username || "U"}
                title={person.fullName || person.username}
                subtitle={`@${person.username}`}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/match">
      {matches === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : matches.length === 0 ? (
        <EmptyRow label={currentUser ? "No match suggestions right now." : SIGN_IN_TO_SEE} />
      ) : (
        matches.map(person => (
          <ListRow
            key={person.uid}
            href={`/${person.username}`}
            avatarSrc={person.photoURL || userAltImageUrl({ name: person.fullName || person.username })}
            avatarFallback={person.fullName || person.username || "U"}
            title={person.fullName || person.username}
            subtitle={`@${person.username}`}
          />
        ))
      )}
    </RailShell>
  );
}

function GroupsRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const [groups, setGroups] = useState<GroupProps[] | null>(null);
  // Shared across this rail, the /discover/groups list, and the group
  // detail page — without it, joining here didn't show up on the list (or
  // vice versa), and a fresh mount always showed "Join" even for groups
  // already joined, same bug already fixed on GroupsListClient.
  const joinedIds = useGroupMembershipStore(state => state.joinedIds);
  const requestedIds = useGroupMembershipStore(state => state.requestedIds);

  useEffect(() => {
    if (!currentUser?.uid) {
      setGroups([]);
      return;
    }
    let active = true;
    void listGroups(previewCount)
      .then(result => {
        if (active) setGroups(result);
      })
      .catch(() => {
        if (active) setGroups([]);
      });
    void getMyGroupMemberships()
      .then(({ joinedIds, requestedIds }) => {
        if (active) useGroupMembershipStore.getState().setInitial(joinedIds, requestedIds);
      })
      .catch(err => console.error("getMyGroupMemberships failed:", err));
    return () => {
      active = false;
    };
  }, [currentUser?.uid, previewCount]);

  const handleJoin = async (groupId: string) => {
    try {
      const result = await joinGroup(groupId);
      if (result.status === "requested") {
        useGroupMembershipStore.getState().markRequested(groupId);
        toast.success("Join request sent");
      } else {
        useGroupMembershipStore.getState().markJoined(groupId);
        toast.success("Joined group");
      }
    } catch {
      toast.error("Failed to join group");
    }
  };

  if (hideIfEmpty && groups !== null && groups.length === 0) return null;

  if (layout === "horizontal") {
    if (groups !== null && groups.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover/groups">
        {groups === null
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : groups.map(group => (
              <CardTile
                key={group.id}
                href={`/discover/groups/${group.id}`}
                avatarSrc={group.photoURL}
                avatarFallback={group.name}
                title={group.name}
                subtitle={`${group.membersCount} member${group.membersCount === 1 ? "" : "s"}`}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell
      title={title}
      description={description}
      icon={icon}
      headerAction={<CreateGroupDialog />}
      seeMoreHref="/discover/groups"
    >
      {groups === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : groups.length === 0 ? (
        <EmptyRow
          label={currentUser ? "No groups yet — create the first one from Discover." : SIGN_IN_TO_SEE}
        />
      ) : (
        groups.map(group => (
          <ActionRow
            key={group.id}
            href={`/discover/groups/${group.id}`}
            avatarSrc={group.photoURL}
            avatarFallback={group.name}
            title={group.name}
            subtitle={`${group.membersCount} member${group.membersCount === 1 ? "" : "s"}`}
            actionLabel={group.joinPolicy === "open" ? "Join" : "Request"}
            actionDone={
              joinedIds.has(group.id) ||
              requestedIds.has(group.id) ||
              group.ownerUid === currentUser?.uid
            }
            onAction={() => handleJoin(group.id)}
          />
        ))
      )}
    </RailShell>
  );
}

function EventsRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
  layout = "vertical",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const currentUser = useUserStore(state => state.user);
  const [events, setEvents] = useState<EventProps[] | null>(null);
  const [rsvpedIds, setRsvpedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.uid) {
      setEvents([]);
      return;
    }
    let active = true;
    void listUpcomingEvents(previewCount)
      .then(result => {
        if (active) setEvents(result);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid, previewCount]);

  const handleRsvp = async (eventId: string) => {
    setRsvpedIds(prev => new Set(prev).add(eventId));
    try {
      await rsvpToEvent(eventId);
      toast.success("You're going!");
    } catch {
      setRsvpedIds(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      toast.error("Failed to RSVP");
    }
  };

  if (hideIfEmpty && events !== null && events.length === 0) return null;

  if (layout === "horizontal") {
    if (events !== null && events.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;
    return (
      <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover/events">
        {events === null
          ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
          : events.map(event => (
              <CardTile
                key={event.id}
                href={`/discover/events/${event.id}`}
                avatarFallback={event.title}
                title={event.title}
                subtitle={`${new Date(event.startTime).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })} · ${event.attendeesCount} going`}
              />
            ))}
      </HorizontalRailShell>
    );
  }

  return (
    <RailShell
      title={title}
      description={description}
      icon={icon}
      headerAction={<CreateEventDialog />}
      seeMoreHref="/discover/events"
    >
      {events === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : events.length === 0 ? (
        <EmptyRow
          label={currentUser ? "No upcoming events — create the first one from Discover." : SIGN_IN_TO_SEE}
        />
      ) : (
        events.map(event => (
          <ActionRow
            key={event.id}
            href={`/discover/events/${event.id}`}
            avatarFallback={event.title}
            title={event.title}
            subtitle={`${new Date(event.startTime).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })} · ${event.attendeesCount} going`}
            actionLabel="RSVP"
            actionDone={rsvpedIds.has(event.id) || event.ownerUid === currentUser?.uid}
            onAction={() => handleRsvp(event.id)}
          />
        ))
      )}
    </RailShell>
  );
}

function formatRailPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function ProductsRail({
  title,
  description,
  icon,
  previewCount,
  hideIfEmpty,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  previewCount: number;
  hideIfEmpty?: boolean;
}) {
  const [products, setProducts] = useState<PostProductProps[] | null>(null);

  // Unlike the other rails, marketplace listings aren't scoped to the
  // viewer's account at all (listProductsPage takes no uid) — no reason to
  // gate this one behind sign-in when the data is public either way.
  useEffect(() => {
    let active = true;
    void listProductsPage({ offset: 0, sortMode: "time", limit: previewCount })
      .then(result => {
        if (active) setProducts(result);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, [previewCount]);

  if (hideIfEmpty && products !== null && products.length === 0) return null;

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/products">
      {products === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : products.length === 0 ? (
        <EmptyRow label="No listings yet — sell something from the composer." />
      ) : (
        products.map(product => (
          <ListRow
            key={product.id}
            href={product.sellerUsername ? `/${product.sellerUsername}/${product.postId}` : "/discover/products"}
            avatarSrc={product.thumbnailUrl ?? undefined}
            avatarFallback={product.name}
            title={product.name}
            subtitle={formatRailPrice(product.price, product.currency)}
          />
        ))
      )}
    </RailShell>
  );
}

// Curated-content rails (news/fixtures/live/results/betting) are only ever
// used at layout="horizontal" from the feed interstitial (see Posts.tsx) —
// Aside already has its own dedicated vertical curated-content rails (see
// CuratedContentRails.tsx), so there's no vertical branch to maintain here.
const CURATED_ITEMS_TO_FETCH = 20;

type FootballMatchMeta = {
  competition?: string;
  homeTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  score?: { home: number; away: number } | null;
};

function matchCardProps(match: CuratedContentItem) {
  const meta = match.metadata as FootballMatchMeta;
  const home = meta.homeTeam?.shortName || meta.homeTeam?.name || "TBD";
  const away = meta.awayTeam?.shortName || meta.awayTeam?.name || "TBD";
  const score =
    typeof meta.score?.home === "number" && typeof meta.score?.away === "number"
      ? ` ${meta.score.home}-${meta.score.away}`
      : "";
  return {
    href: `/updates/${match.id}`,
    avatarSrc: meta.homeTeam?.crest ?? undefined,
    avatarFallback: home,
    title: `${home} vs ${away}${score}`,
    subtitle: meta.competition || formatContentTime(match.published_at),
  };
}

function newsCardProps(item: CuratedContentItem) {
  return {
    href: `/updates/${item.id}`,
    media: item.image_url ? { type: "image", src: item.image_url } : null,
    avatarFallback: item.source_name || item.title,
    title: item.title,
    subtitle: item.source_name,
  };
}

function NewsRail({ title, icon, previewCount }: { title: string; icon: LucideIcon; previewCount: number }) {
  const { interests, topics } = useCuratedInterests();
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);

  useEffect(() => {
    if (topics.length === 0) return;
    let active = true;
    void getInterestedNews(topics, CURATED_ITEMS_TO_FETCH).then(result => {
      if (active) setItems(result);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.join(",")]);

  if (interests === null) return null; // still resolving — nothing to gate on yet
  if (topics.length === 0) return null;
  if (items !== null && items.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;

  return (
    <HorizontalRailShell title={title} icon={icon} seeMoreHref="/updates">
      {items === null
        ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
        : items.slice(0, previewCount).map(item => <CardTile key={item.id} {...newsCardProps(item)} />)}
    </HorizontalRailShell>
  );
}

function FootballBucketRail({
  title,
  icon,
  previewCount,
  bucket,
}: {
  title: string;
  icon: LucideIcon;
  previewCount: number;
  bucket: "upcoming" | "live" | "results";
}) {
  const { interests, leagueCodes } = useCuratedInterests();
  const [scores, setScores] = useState<CuratedContentItem[] | null>(null);

  useEffect(() => {
    if (leagueCodes.length === 0) return;
    let active = true;
    void getFootballScores(leagueCodes).then(result => {
      if (active) setScores(result);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueCodes.join(",")]);

  if (interests === null) return null;
  if (leagueCodes.length === 0) return null;

  const matches = scores === null ? null : groupMatches(scores)[bucket];
  if (matches !== null && matches.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;

  return (
    <HorizontalRailShell title={title} icon={icon} seeMoreHref="/updates">
      {matches === null
        ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
        : matches.slice(0, previewCount).map(match => <CardTile key={match.id} {...matchCardProps(match)} />)}
    </HorizontalRailShell>
  );
}

function BettingRail({ title, icon, previewCount }: { title: string; icon: LucideIcon; previewCount: number }) {
  const { interests, leagueCodes, topics } = useCuratedInterests();
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);
  const hasBettingInterest = topics.includes("betting_prediction");

  useEffect(() => {
    if (!hasBettingInterest) return;
    let active = true;
    void getBettingPredictions(leagueCodes, CURATED_ITEMS_TO_FETCH).then(result => {
      if (active) setItems(result);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBettingInterest, leagueCodes.join(",")]);

  if (interests === null) return null;
  if (!hasBettingInterest) return null;
  if (items !== null && items.length < MIN_HORIZONTAL_RAIL_ITEMS) return null;

  return (
    <HorizontalRailShell title={title} icon={icon} seeMoreHref="/discover">
      {items === null
        ? Array.from({ length: previewCount }).map((_, index) => <CardTileSkeleton key={index} />)
        : items.slice(0, previewCount).map(item => <CardTile key={item.id} {...newsCardProps(item)} />)}
    </HorizontalRailShell>
  );
}

export default function RecommendationRail({
  type,
  previewCount = 5,
  hideIfEmpty = false,
  layout = "vertical",
}: {
  type: FeedRecommendationType;
  previewCount?: number;
  hideIfEmpty?: boolean;
  layout?: RailLayout;
}) {
  const config = railCopy[type];

  if (type === "friends" || type === "follows") {
    return <PeopleRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "videos") {
    return <VideosRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "saves") {
    return <SavesRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "matches") {
    return <MatchesRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "groups") {
    return <GroupsRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "events") {
    return <EventsRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} layout={layout} />;
  }

  if (type === "products") {
    return <ProductsRail {...config} previewCount={previewCount} hideIfEmpty={hideIfEmpty} />;
  }

  if (type === "news") {
    return <NewsRail {...config} previewCount={previewCount} />;
  }

  if (type === "fixtures") {
    return <FootballBucketRail {...config} previewCount={previewCount} bucket="upcoming" />;
  }

  if (type === "live") {
    return <FootballBucketRail {...config} previewCount={previewCount} bucket="live" />;
  }

  if (type === "results") {
    return <FootballBucketRail {...config} previewCount={previewCount} bucket="results" />;
  }

  if (type === "betting") {
    return <BettingRail {...config} previewCount={previewCount} />;
  }

  return null;
}
