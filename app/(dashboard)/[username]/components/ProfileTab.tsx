import UserFeed from "../[postId]/components/UserFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AboutBlock } from "./AboutBlock";
import { UserProps } from "@/lib/types";
import FriendsList from "./FriendList";
import { MediaGrid } from "./MediaGrid";

const ProfileTab = ({
  profile,
  isMe,
}: {
  profile: UserProps;
  isMe: boolean;
}) => {
  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
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

        <TabsContent value="friends" className="mt-4">
          <FriendsList uid={profile.uid} isMe={isMe} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ProfileTab;
