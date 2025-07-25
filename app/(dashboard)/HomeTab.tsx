import PostComposer from "@/components/post-composer/PostComposer";
import { TabsContent } from "@/components/ui/tabs";
import React from "react";
import ClientHomeTab from "./ClientHomeTab";

const HomeTab = async () => {
  return (
    <TabsContent
      value="home"
      className="px-4 pb-8 space-y-8 mx-auto my-4 !w-full relative"
    >
      {/* <Stories user={enrichedPosts} /> */}
      <PostComposer />
      <ClientHomeTab />
    </TabsContent>
  );
};

export default HomeTab;
