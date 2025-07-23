import Feed from "@/components/feed/Feed";
import PostComposer from "@/components/post-composer/PostComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitialPosts } from "@/lib/data";

export default async function Home() {
  const posts = await getInitialPosts();

  return (
    <Tabs defaultValue="home" className="w-full">
      <TabsList className="flex flex-row overflow-x-auto w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden !rounded-none sticky top-0 z-20">
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="real estate">Real Estate</TabsTrigger>
        <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
        <TabsTrigger value="designs">Designs</TabsTrigger>
        <TabsTrigger value="football">Football</TabsTrigger>
      </TabsList>
      <TabsContent value="home">
        <div className="px-4 pb-8 space-y-8 mx-auto my-4 !w-full relative">
          {/* <Stories user={enrichedPosts} /> */}
          <PostComposer />

          <Feed initialPosts={posts} />
        </div>
      </TabsContent>
      <TabsContent value="real estate">
        <h2>Real Estate</h2>
      </TabsContent>
      <TabsContent value="ecommerce">
        <h2>E-commerce</h2>
      </TabsContent>
      <TabsContent value="designs">
        <h2>Designs</h2>
      </TabsContent>
      <TabsContent value="football">
        <h2>Football</h2>
      </TabsContent>
    </Tabs>
  );
}
