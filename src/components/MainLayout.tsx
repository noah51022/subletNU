import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import BottomNav from "@/components/BottomNav"; // Keep BottomNav separate for now
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Menu as MenuIcon, Home, PlusCircle, MessageSquare, User } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type MainLayoutProps = {
  children: ReactNode;
  // Add props to customize header if needed later (e.g., showBackButton, title)
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const { currentUser } = useAuth(); // Needed potentially for conditional rendering
  const { getTotalUnreadCount } = useMessage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalUnreadCount = getTotalUnreadCount();

  // Only render layout if user is logged in? Or adapt based on page?
  // For now, assume it's shown for logged-in users on main app pages.

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-neu-red text-white p-4 flex items-center justify-between w-full sticky top-0 z-50" style={{ borderRadius: 0 }}>
          <div className="relative">
            <button
              className="mr-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon size={28} />
            </button>
            {totalUnreadCount > 0 && (
              <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-white ring-2 ring-black" />
            )}
          </div>
          {/* Title could be dynamic based on route or prop */}
          <h1 className="text-xl font-bold flex-1 text-center">SubletNU</h1>
          <div style={{ width: 40 }} /> {/* Balance */}
        </header>
      )}

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

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation for Desktop/Tablet */}
      {!isMobile && (
        <div className="sticky bottom-0 z-50">
          <BottomNav />
        </div>
      )}
    </div>
  );
};

export default MainLayout; 