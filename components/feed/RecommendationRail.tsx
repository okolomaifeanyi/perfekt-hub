"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Clapperboard,
  HeartHandshake,
  Sparkles,
  Tag,
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
import { getFeedAction } from "@/app/actions/feed";
import { getSuggestedMatches, getTopSavedPosts } from "@/app/actions/discover";
import { getMyGroupMemberships, listGroups, joinGroup, type GroupProps } from "@/app/actions/groups";
import { useGroupMembershipStore } from "@/lib/store/useGroupMembershipStore";
import { listUpcomingEvents, rsvpToEvent, type EventProps } from "@/app/actions/events";
import { listProductsPage, type PostProductProps } from "@/app/actions/posts";
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
  | "products";

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
};

function RailShell({
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

function ListRow({
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

function RowSkeleton() {
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

function EmptyRow({ label }: { label: string }) {
  return <p className="px-2 py-2 text-sm text-muted-foreground">{label}</p>;
}

function PeopleRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
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

  const people = suggestions.slice(0, 5);

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

function VideosRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [videos, setVideos] = useState<PostProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;

    void getFeedAction(currentUser.uid, 30, null, null, false, "trending").then(posts => {
      if (active) setVideos(posts.filter(hasVideoMedia).slice(0, 5));
    });

    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  return (
    <RailShell title={title} description={description} icon={icon}>
      {videos === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : videos.length === 0 ? (
        <EmptyRow label="No videos yet." />
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

function SavesRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [posts, setPosts] = useState<PostProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    void getTopSavedPosts(5)
      .then(result => {
        if (active) setPosts(result);
      })
      .catch(() => {
        if (active) setPosts([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/saves">
      {posts === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : posts.length === 0 ? (
        <EmptyRow label="No saved posts yet — be the first to save one." />
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

function MatchesRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [matches, setMatches] = useState<UserProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    void getSuggestedMatches(currentUser.uid, 5)
      .then(result => {
        if (active) setMatches(result);
      })
      .catch(() => {
        if (active) setMatches([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  return (
    <RailShell title={title} description={description} icon={icon} seeMoreHref="/discover/match">
      {matches === null ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : matches.length === 0 ? (
        <EmptyRow label="No match suggestions right now." />
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

function GroupsRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [groups, setGroups] = useState<GroupProps[] | null>(null);
  // Shared across this rail, the /discover/groups list, and the group
  // detail page — without it, joining here didn't show up on the list (or
  // vice versa), and a fresh mount always showed "Join" even for groups
  // already joined, same bug already fixed on GroupsListClient.
  const joinedIds = useGroupMembershipStore(state => state.joinedIds);
  const requestedIds = useGroupMembershipStore(state => state.requestedIds);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    void listGroups(5)
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
  }, [currentUser?.uid]);

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
        <EmptyRow label="No groups yet — create the first one from Discover." />
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

function EventsRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [events, setEvents] = useState<EventProps[] | null>(null);
  const [rsvpedIds, setRsvpedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    void listUpcomingEvents(5)
      .then(result => {
        if (active) setEvents(result);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

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
        <EmptyRow label="No upcoming events — create the first one from Discover." />
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

function ProductsRail({ title, description, icon }: { title: string; description: string; icon: LucideIcon }) {
  const currentUser = useUserStore(state => state.user);
  const [products, setProducts] = useState<PostProductProps[] | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    void listProductsPage({ offset: 0, sortMode: "time", limit: 5 })
      .then(result => {
        if (active) setProducts(result);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

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

export default function RecommendationRail({
  type,
}: {
  type: FeedRecommendationType;
}) {
  const config = railCopy[type];

  if (type === "friends" || type === "follows") {
    return <PeopleRail {...config} />;
  }

  if (type === "videos") {
    return <VideosRail {...config} />;
  }

  if (type === "saves") {
    return <SavesRail {...config} />;
  }

  if (type === "matches") {
    return <MatchesRail {...config} />;
  }

  if (type === "groups") {
    return <GroupsRail {...config} />;
  }

  if (type === "events") {
    return <EventsRail {...config} />;
  }

  if (type === "products") {
    return <ProductsRail {...config} />;
  }

  return null;
}
