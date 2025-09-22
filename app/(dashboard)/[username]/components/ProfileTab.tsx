import UserFeed from "../[postId]/components/UserFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutBlock } from "./AboutBlock";
import { UserProps } from "@/lib/types";
import { MediaGrid } from "./MediaGrid";

const ProfileTab = ({
  profile,
}: {
  profile: UserProps;
}) => {
  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <UserFeed />
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <MediaGrid uid={profile.uid} />
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <AboutBlock profile={profile} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ProfileTab;
