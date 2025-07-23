import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const TopNav = () => {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="you">You</TabsTrigger>
        <TabsTrigger value="password">Group</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        Make changes to your account here.
      </TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
    </Tabs>
  );
}

export default TopNav