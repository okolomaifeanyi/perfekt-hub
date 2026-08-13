import Link from "next/link";

import NavBar from "../../[username]/components/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchListClient } from "./MatchListClient";

export default function MatchDiscoverPage() {
  return (
    <>
      <NavBar title="Suggested Match" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="py-5">
          <CardHeader className="space-y-2">
            <CardTitle>Opt-in compatibility matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Suggested Match prioritizes people with compatible preferences,
              age range, interests, likes, and friend-of-friend connections.
            </p>
            <Button asChild size="sm">
              <Link href="/settings">Set preferences</Link>
            </Button>
          </CardContent>
        </Card>

        <MatchListClient />
      </main>
    </>
  );
}
