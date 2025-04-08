import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Message as BaseMessage } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "./AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

interface ExtendedMessage extends BaseMessage {
  isRead: boolean;
}

type MessageContextType = {
  messages: ExtendedMessage[];
  isLoadingMessages: boolean;
  userProfiles: Record<string, UserProfile>;
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForUser: (userId: string) => ExtendedMessage[];
  getDisplayName: (userId: string) => string;
  getInitials: (userId: string) => string;
  fetchUserProfiles: (userIds: string[]) => Promise<void>;
  fetchMessages: () => Promise<void>;
  markMessagesAsRead: (senderId: string) => Promise<void>;
  getUnreadCount: (userId: string) => number;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const { currentUser } = useAuth();

  const fetchMessages = async () => {
    if (!currentUser) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Could not fetch messages.",
          variant: "destructive",
        });
        setMessages([]);
        return;
      }

      if (data) {
        const mappedMessages: ExtendedMessage[] = data.map((msg) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.text,
          timestamp: msg.created_at,
          isRead: msg.is_read,
        }));
        setMessages(mappedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching messages.",
        variant: "destructive",
      });
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg =>
        msg.senderId === senderId && msg.receiverId === currentUser.id
          ? { ...msg, isRead: true }
          : msg
      ));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const getUnreadCount = (userId: string): number => {
    if (!currentUser) return 0;

    return messages.filter(
      msg => msg.senderId === userId &&
        msg.receiverId === currentUser.id &&
        !msg.isRead
    ).length;
  };

  useEffect(() => {
    let messageChannel: RealtimeChannel | null = null;

    const setupMessages = async () => {
      await fetchMessages();

      if (currentUser) {
        messageChannel = supabase
          .channel(`realtime:messages:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `sender_id=eq.${currentUser.id}`,
            },
            (payload) => {
              const newMessage = payload.new as any;
              const mappedMessage: ExtendedMessage = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                text: newMessage.text,
                timestamp: newMessage.created_at,
                isRead: newMessage.is_read,
              };
              setMessages((prev) =>
                prev.find((m) => m.id === mappedMessage.id) ? prev : [...prev, mappedMessage]
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${currentUser.id}`,
            },
            (payload) => {
              const newMessage = payload.new as any;
              const mappedMessage: ExtendedMessage = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                text: newMessage.text,
                timestamp: newMessage.created_at,
                isRead: newMessage.is_read,
              };
              setMessages((prev) =>
                prev.find((m) => m.id === mappedMessage.id) ? prev : [...prev, mappedMessage]
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${currentUser.id}`,
            },
            (payload) => {
              const updatedMessage = payload.new as any;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === updatedMessage.id
                    ? {
                      ...msg,
                      isRead: updatedMessage.is_read,
                    }
                    : msg
                )
              );
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Messages channel error:', err);
              toast({ title: "Realtime Error", description: "Could not connect to live message updates.", variant: "destructive" });
            } else if (status === 'TIMED_OUT') {
              console.warn('Messages channel timed out');
            }
          });
      }
    };

    setupMessages();

    return () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        messageChannel = null;
      }
    };
  }, [currentUser]);

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages.",
        variant: "destructive",
      });
      return;
    }
    if (!text.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          text: text.trim(),
        });

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message.",
          variant: "destructive",
        });
        throw error;
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      if (!(error instanceof Error && (error as any).details)) {
        toast({
          title: "Error",
          description: "An unexpected error occurred while sending the message.",
          variant: "destructive",
        });
      }
    }
  };

  const getMessagesForUser = (userId: string): ExtendedMessage[] => {
    if (!currentUser) return [];

    return messages.filter(
      (msg) =>
        (msg.senderId === currentUser.id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === currentUser.id)
    ).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const fetchUserProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching user profiles:', error);
        return;
      }

      if (data) {
        const profiles = data.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {});
        setUserProfiles(prev => ({ ...prev, ...profiles }));
      }
    } catch (error) {
      console.error('Failed to fetch user profiles:', error);
    }
  };

  const getDisplayName = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return "Loading...";

    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile.first_name) {
      return profile.first_name;
    } else if (profile.last_name) {
      return profile.last_name;
    }
    return profile.email.split('@')[0];
  };

  const getInitials = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return "...";

    if (profile.first_name && profile.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    } else if (profile.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile.last_name) {
      return profile.last_name[0].toUpperCase();
    }
    return profile.email[0].toUpperCase();
  };

  const value = {
    messages,
    isLoadingMessages,
    userProfiles,
    sendMessage,
    getMessagesForUser,
    getDisplayName,
    getInitials,
    fetchUserProfiles,
    fetchMessages,
    markMessagesAsRead,
    getUnreadCount,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
}; 