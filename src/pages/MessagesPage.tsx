import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSublet } from "@/contexts/SubletContext";
import { useMessage } from "@/contexts/MessageContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Menu as MenuIcon, Home, PlusCircle, MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

const MessagesPage = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { currentUser } = useAuth();
  const { sublets } = useSublet();
  const {
    messages,
    sendMessage,
    getMessagesForUser,
    getDisplayName,
    getInitials,
    fetchUserProfiles,
    fetchMessages,
    markMessagesAsRead,
    getUnreadCount,
    isLoadingMessages
  } = useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [activeUser, setActiveUser] = useState<string | null>(userId || null);
  const [isFetching, setIsFetching] = useState(false);

  const subletId = location.state?.subletId;

  const getUniqueContacts = () => {
    if (!currentUser) return [];

    const uniqueContactIds = new Set<string>();

    messages.forEach(msg => {
      // Skip messages where user is messaging themselves
      if (msg.senderId === msg.receiverId) return;

      if (msg.senderId === currentUser.id) {
        uniqueContactIds.add(msg.receiverId);
      } else if (msg.receiverId === currentUser.id) {
        uniqueContactIds.add(msg.senderId);
      }
    });

    const contacts = Array.from(uniqueContactIds).map(id => {
      const contactMessages = messages.filter(
        msg => (msg.senderId === id && msg.receiverId === currentUser.id) ||
          (msg.receiverId === id && msg.senderId === currentUser.id)
      );

      const lastMessage = contactMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      return {
        id,
        lastMessage,
      };
    });

    return contacts.sort((a, b) => {
      if (!a.lastMessage || !b.lastMessage) return 0;
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
    });
  };

  const contacts = getUniqueContacts();
  const activeUserMessages = activeUser ? getMessagesForUser(activeUser) : [];
  const activeUserSublet = activeUser ? sublets.find(s => s.userId === activeUser) : null;

  // Prevent self-messaging
  useEffect(() => {
    if (userId === currentUser?.id) {
      navigate('/messages');
    }
  }, [userId, currentUser, navigate]);

  // Update activeUser when userId changes
  useEffect(() => {
    if (userId && userId !== currentUser?.id) {
      setActiveUser(userId);
    } else {
      setActiveUser(null);
    }
  }, [userId, currentUser]);

  // Fetch messages and profiles when opening a conversation
  useEffect(() => {
    const fetchData = async () => {
      if (!activeUser || isFetching || activeUser === currentUser?.id) return;

      setIsFetching(true);
      try {
        await Promise.all([
          fetchUserProfiles([activeUser]),
          fetchMessages(),
          markMessagesAsRead(activeUser)
        ]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [activeUser, currentUser?.id, fetchUserProfiles, fetchMessages, markMessagesAsRead, isFetching]);

  // Fetch profiles for contacts
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth', { state: { fromProtected: true } });
      return;
    }

    const userIds = contacts.map(contact => contact.id);
    if (userIds.length > 0) {
      fetchUserProfiles(userIds);
    }
  }, [currentUser, contacts, navigate, fetchUserProfiles]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser || !newMessage.trim()) return;

    sendMessage(activeUser, newMessage);
    setNewMessage("");
  };

  const handleBackClick = () => {
    if (subletId) {
      navigate(`/sublet/${subletId}`);
    } else {
      navigate('/messages');
    }
  };

  if (!currentUser) return null;

  // Prevent rendering if trying to message self
  if (userId === currentUser.id) return null;

  // Show conversation list if no conversation is selected
  if (!activeUser && !userId) {
    return (
      <>
        <div className="flex flex-col w-full">
          <header className="bg-neu-red text-white p-4 flex items-center justify-between w-full" style={{ borderRadius: 0 }}>
            {isMobile && (
              <button
                className="mr-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon size={28} />
              </button>
            )}
            <h1 className="text-xl font-bold flex-1 text-center">Messages</h1>
            {isMobile && <div style={{ width: 40 }} />}
          </header>
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
          <div className="p-4">
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No conversations yet.</p>
                <p className="text-gray-500">
                  Start by messaging a sublet poster from the listings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map(contact => {
                  const unreadCount = getUnreadCount(contact.id);
                  return (
                    <button
                      key={contact.id}
                      className="w-full p-4 bg-white rounded-lg shadow flex items-center hover:bg-gray-50"
                      onClick={() => {
                        navigate(`/messages/${contact.id}`, { state: { subletId } });
                      }}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-neu-gold flex items-center justify-center text-white font-bold">
                          {getInitials(contact.id)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-neu-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 text-left">
                        <div className="flex justify-between items-start">
                          <p className={`font-medium ${unreadCount > 0 ? 'text-neu-red' : ''}`}>
                            {getDisplayName(contact.id)}
                          </p>
                          {contact.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(contact.lastMessage.timestamp), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {contact.lastMessage && (
                          <p className={`text-sm truncate ${unreadCount > 0 ? 'text-black font-medium' : 'text-gray-500'}`}>
                            {contact.lastMessage.senderId === currentUser.id ? "You: " : ""}
                            {contact.lastMessage.text}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Only show BottomNav on desktop/tablet */}
        {!isMobile && <BottomNav />}
      </>
    );
  }

  // Show message thread if a conversation is selected
  return (
    <div className="pb-20 h-screen flex flex-col mx-auto w-full max-w-[90%] md:max-w-4xl lg:max-w-6xl">
      <header className="bg-neu-red text-white p-4 flex items-center justify-between w-full" style={{ borderRadius: 0 }}>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-neu-red/80"
            onClick={handleBackClick}
          >
            <ArrowLeft />
          </Button>
        </div>
        <div className="flex-1 ml-2">
          <h1 className="text-lg font-bold">
            {activeUser ? getDisplayName(activeUser) : "Unknown User"}
          </h1>
          {activeUserSublet && (
            <p className="text-xs opacity-80">
              {activeUserSublet.location} - ${activeUserSublet.price}/mo
            </p>
          )}
        </div>
        {isMobile && (
          <button
            className="ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={28} />
          </button>
        )}
      </header>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeUserMessages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet.</p>
            <p className="text-gray-500">Send a message to start the conversation.</p>
          </div>
        ) : (
          activeUserMessages.map(msg => (
            <div
              key={msg.id}
              className={`max-w-[75%] p-3 rounded-lg ${msg.senderId === currentUser.id
                ? "bg-neu-red text-white ml-auto"
                : "bg-gray-200 text-black"
                }`}
            >
              <p>{msg.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim()}
            className="bg-neu-red hover:bg-neu-red/90"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
      {/* Only show BottomNav on desktop/tablet */}
      {!isMobile && <BottomNav />}
    </div>
  );
};

export default MessagesPage;
