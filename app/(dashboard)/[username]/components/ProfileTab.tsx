import UserFeed from "../[postId]/components/UserFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProps } from "@/lib/types";
import { MediaGrid } from "./MediaGrid";
import { ProfileAboutWrapper } from "./ProfileAboutWrapper";

const ProfileTab = ({
  profile,
}: {
  profile: UserProps;
}) => {
  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger id="posts" value="posts" className="cursor-pointer">
            Posts
          </TabsTrigger>
          <TabsTrigger value="media" className="cursor-pointer">
            Media
          </TabsTrigger>
          <TabsTrigger value="about" className="cursor-pointer">
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <UserFeed />
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <MediaGrid uid={profile.uid} />
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <ProfileAboutWrapper profile={profile} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ProfileTab;
