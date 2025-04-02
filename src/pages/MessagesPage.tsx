import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { mockUsers } from "@/services/mockData";

const MessagesPage = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { currentUser, sublets, messages, sendMessage, getMessagesForUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [newMessage, setNewMessage] = useState("");
  const [activeUser, setActiveUser] = useState<string | null>(userId || null);
  
  const subletId = location.state?.subletId;
  
  const getUniqueContacts = () => {
    if (!currentUser) return [];
    
    const uniqueContactIds = new Set<string>();
    
    messages.forEach(msg => {
      if (msg.senderId === currentUser.id) {
        uniqueContactIds.add(msg.receiverId);
      } else if (msg.receiverId === currentUser.id) {
        uniqueContactIds.add(msg.senderId);
      }
    });
    
    return Array.from(uniqueContactIds).map(id => {
      const user = mockUsers.find(u => u.id === id);
      return {
        id,
        email: user?.email || "Unknown User",
      };
    });
  };
  
  const contacts = getUniqueContacts();
  const activeUserEmail = mockUsers.find(u => u.id === activeUser)?.email || "Unknown User";
  const activeUserMessages = activeUser ? getMessagesForUser(activeUser) : [];
  
  const activeUserSublet = activeUser 
    ? sublets.find(s => s.userId === activeUser) 
    : null;
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
    }
  }, [currentUser, navigate]);

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

  if (!activeUser && !userId) {
    return (
      <div className="pb-20 max-w-2xl mx-auto">
        <header className="bg-neu-red text-white p-4">
          <h1 className="text-xl font-bold">Messages</h1>
        </header>
        
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
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  className="w-full p-4 bg-white rounded-lg shadow flex items-center hover:bg-gray-50"
                  onClick={() => navigate(`/messages/${contact.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-neu-gold flex items-center justify-center text-white font-bold">
                    {contact.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3 text-left">
                    <p className="font-medium">{contact.email}</p>
                    <p className="text-sm text-gray-500">Tap to view conversation</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="pb-20 h-screen flex flex-col max-w-2xl mx-auto">
      <header className="bg-neu-red text-white p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-neu-red/80" 
          onClick={handleBackClick}
        >
          <ArrowLeft />
        </Button>
        <div className="ml-2">
          <h1 className="text-lg font-bold">{activeUserEmail}</h1>
          {activeUserSublet && (
            <p className="text-xs opacity-80">
              {activeUserSublet.location} - ${activeUserSublet.price}/mo
            </p>
          )}
        </div>
      </header>
      
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
              className={`max-w-[75%] p-3 rounded-lg ${
                msg.senderId === currentUser.id
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
      
      <BottomNav />
    </div>
  );
};

export default MessagesPage;
