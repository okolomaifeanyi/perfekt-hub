import Link from "next/link";

import NavBar from "../../[username]/components/NavBar";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MatchDiscoverPage() {
  return (
    <>
      <NavBar title="Suggested Match" />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="py-5">
            <CardHeader className="space-y-2">
              <CardTitle>Opt-in compatibility matching</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Suggested Match prioritizes people with compatible preferences,
                age range, interests, likes, and friend-of-friend connections.
              </p>
              <p>
                Set your preferences before the system starts ranking match
                candidates for dating or marriage intent.
              </p>
              <Button asChild>
                <Link href="/settings">Set preferences</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <RecommendationRail type="matches" />
            <RecommendationRail type="follows" />
          </div>
        </section>
      </main>
    </>
  );
}
