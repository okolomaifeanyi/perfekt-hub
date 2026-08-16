"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import NavBar from "../[username]/components/NavBar";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildBirthdayReminders, buildMemoryReminders } from "@/lib/calendar-reminders.mjs";
import { getInitialUserPosts, getUser } from "@/lib/data";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUserConnections } from "@/hooks/UserConnections";
import { PostProps, UserProps } from "@/lib/types";

type BirthdayReminder = {
  friend: UserProps;
  nextBirthday: Date;
  daysUntil: number;
};

type MemoryReminder = {
  post: PostProps;
  label: string;
  ageDays: number;
};

export default function CalendarPage() {
  const currentUser = useUserStore(state => state.user);
  const { friends } = useUserConnections();
  const [birthdayReminders, setBirthdayReminders] = useState<BirthdayReminder[]>([]);
  const [memoryReminders, setMemoryReminders] = useState<MemoryReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const friendProfiles = await Promise.all(
          friends.map(friendId => getUser(friendId))
        );
        const birthdays = buildBirthdayReminders(
          friendProfiles.filter((friend): friend is UserProps => Boolean(friend)),
          new Date()
        );

        const posts = await getInitialUserPosts(currentUser.uid, 200);
        const memories = buildMemoryReminders(posts, new Date());

        if (!active) return;
        setBirthdayReminders(birthdays);
        setMemoryReminders(memories);
      } catch (error) {
        console.error("Calendar page failed", error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser?.uid, friends]);

  if (!currentUser) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        Loading calendar...
      </div>
    );
  }

  return (
    <>
      <NavBar title="Calendar" />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Birthdays</h2>
              <p className="text-sm text-muted-foreground">
                Next friends birthdays and reminders.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading birthdays...</p>
          ) : birthdayReminders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No upcoming birthdays yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {birthdayReminders.map(reminder => (
                <Card key={reminder.friend.uid} className="py-4">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      {reminder.friend.fullName || reminder.friend.username}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      @{reminder.friend.username}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      {reminder.daysUntil === 0 ? (
                        <>🎂 It&apos;s their birthday today!</>
                      ) : (
                        <>
                          Next birthday in <strong>{reminder.daysUntil}</strong> day
                          {reminder.daysUntil === 1 ? "" : "s"}.
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/${reminder.friend.username}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        View profile
                      </Link>
                      {reminder.daysUntil === 0 && (
                        <Link
                          href={`/discover/events/birthday-${reminder.friend.uid}-${reminder.nextBirthday.getFullYear()}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Celebrate 🎉
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Events</h2>
            <p className="text-sm text-muted-foreground">
              Public and private events, plus recommendations.
            </p>
          </div>
          <RecommendationRail type="events" />
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Post memories</h2>
              <p className="text-sm text-muted-foreground">
                Posts from about a month or a year ago.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/">Back to feed</Link>
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading memories...</p>
          ) : memoryReminders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No post memories yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {memoryReminders.map(reminder => (
                <Card key={reminder.post.id} className="py-4">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      {reminder.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      @{reminder.post.username}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground line-clamp-3">
                      {reminder.post.content}
                    </p>
                    <Link
                      href={`/${reminder.post.username}/${reminder.post.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open post
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
