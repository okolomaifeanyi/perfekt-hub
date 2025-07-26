import Aside from "@/components/Aside";
import NavBar from "@/components/NavBar";
import MobileNavBar from "@/components/MobileNavBar";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-[70px_1fr_300px] lg:grid-cols-[300px_1fr_300px] max-w-6xl mx-auto h-screen overflow-hidden">
        <nav className="hidden md:block sticky top-0 h-screen overflow-auto">
          <NavBar />
        </nav>

        <main className="overflow-auto h-screen w-full">{children}</main>

        <aside className="hidden md:block sticky top-0 h-screen overflow-auto w-full">
          <Aside />
        </aside>
      </div>

      <MobileNavBar />
    </>
  );
};

export default layout;
