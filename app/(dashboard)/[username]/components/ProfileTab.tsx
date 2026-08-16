import UserFeed from "../[postId]/components/UserFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProps } from "@/lib/types";
import { MediaGrid } from "./MediaGrid";
import AddVideoButton from "@/components/post-composer/AddVideoButton";
import { ProfileAboutWrapper } from "./ProfileAboutWrapper";
import SavedPostsGrid from "./SavedPostsGrid";
import ProfileGroupsGrid from "./ProfileGroupsGrid";
import { H3 } from "@/components/Typography";

const ProfileTab = ({
  profile,
}: {
  profile: UserProps;
}) => {
  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        {/* TabsList's base style is a fixed h-9 (one row) — on mobile these
            5 triggers wrap into 3 rows via grid-cols-2, but nothing here
            overrode that height, so rows 2-3 overflowed the reserved 36px
            unclipped and rendered on top of the tab content starting right
            after it. h-auto lets the container grow to fit every row. */}
        <TabsList className="h-auto w-full grid grid-cols-2 gap-1 sm:grid-cols-5">
          <TabsTrigger id="posts" value="posts" className="cursor-pointer">
            Posts
          </TabsTrigger>
          <TabsTrigger value="videos" className="cursor-pointer">
            Videos
          </TabsTrigger>
          <TabsTrigger value="saved" className="cursor-pointer">
            Saved
          </TabsTrigger>
          <TabsTrigger value="groups" className="cursor-pointer">
            Groups
          </TabsTrigger>
          <TabsTrigger value="about" className="cursor-pointer">
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <UserFeed uid={profile.uid} />
        </TabsContent>

        <TabsContent value="videos" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <AddVideoButton targetUid={profile.uid} variant="outline" size="sm" />
          </div>
          <MediaGrid uid={profile.uid} mediaType="video" />
        </TabsContent>

        <TabsContent value="saved" className="mt-4 space-y-6">
          <section className="space-y-3">
            <H3>Saved posts</H3>
            <SavedPostsGrid uid={profile.uid} />
          </section>

          <section className="space-y-3">
            <H3>Saved videos</H3>
            <SavedPostsGrid uid={profile.uid} mediaType="video" />
          </section>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <ProfileGroupsGrid uid={profile.uid} />
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <ProfileAboutWrapper profile={profile} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ProfileTab;
