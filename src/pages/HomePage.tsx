import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import FilterBar from "@/components/FilterBar";
import SubletCard from "@/components/SubletCard";
import BottomNav from "@/components/BottomNav";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu as MenuIcon, Home, PlusCircle, MessageSquare, User } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

const HomePage = () => {
  const { currentUser } = useAuth();
  const { filteredSublets } = useFilter();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Remove redirect for unauthenticated users
    // if (!currentUser) {
    //   navigate('/auth');
    // }
  }, [currentUser, navigate]);

  return (
    <>
      <div className="flex flex-col w-full">
        <header className="bg-neu-red text-white p-4 text-center flex items-center justify-between w-full" style={{ borderRadius: 0 }}>
          {isMobile && (
            <button
              className="mr-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon size={28} />
            </button>
          )}
          <h1 className="text-xl font-bold flex-1 text-center">SubletNU</h1>
          {/* Spacer for alignment */}
          {isMobile && <div style={{ width: 40 }} />}
        </header>
        <FilterBar />
      </div>
      {/* Hamburger Drawer for mobile */}
      {isMobile && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <h2 className="text-lg font-bold mb-4">Menu</h2>
              <nav className="flex flex-col gap-4">
                <button className="flex items-center gap-2 text-left" onClick={() => { setDrawerOpen(false); navigate('/'); }}>
                  <Home size={22} /> Home
                </button>
                <button className="flex items-center gap-2 text-left" onClick={() => { setDrawerOpen(false); navigate('/create'); }}>
                  <PlusCircle size={22} /> Post
                </button>
                <button className="flex items-center gap-2 text-left" onClick={() => { setDrawerOpen(false); navigate('/messages'); }}>
                  <MessageSquare size={22} /> Messages
                </button>
                <button className="flex items-center gap-2 text-left" onClick={() => { setDrawerOpen(false); navigate('/profile'); }}>
                  <User size={22} /> Profile
                </button>
              </nav>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      )}
      <div className="pb-20 mx-auto w-full max-w-[90%] md:max-w-4xl lg:max-w-6xl">
        <div className="mt-4 pb-16">
          {filteredSublets === undefined ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neu-red" />
            </div>
          ) : filteredSublets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sublets match your filters.</p>
              <p className="text-gray-500">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            filteredSublets.map((sublet) => (
              <SubletCard key={sublet.id} sublet={sublet} />
            ))
          )}
        </div>
        {/* Only show BottomNav on desktop/tablet */}
        {!isMobile && <BottomNav />}
      </div>
    </>
  );
};

export default HomePage;
