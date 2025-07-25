import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeTab from "./HomeTab";

export default function Home() {
  return (
    <Tabs defaultValue="home" className="w-full">
      <TabsList className="flex flex-row overflow-x-auto w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden !rounded-none sticky top-0 z-20">
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="real estate">Real Estate</TabsTrigger>
        <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
        <TabsTrigger value="designs">Designs</TabsTrigger>
        <TabsTrigger value="football">Football</TabsTrigger>
      </TabsList>
      <HomeTab />
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
