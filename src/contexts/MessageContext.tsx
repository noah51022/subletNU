import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Message } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "./AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

type MessageContextType = {
  messages: Message[];
  isLoadingMessages: boolean;
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForUser: (userId: string) => Message[];
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
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
        const mappedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.text,
          timestamp: msg.created_at,
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
              const mappedMessage: Message = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                text: newMessage.text,
                timestamp: newMessage.created_at,
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
              const mappedMessage: Message = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                text: newMessage.text,
                timestamp: newMessage.created_at,
              };
              setMessages((prev) =>
                prev.find((m) => m.id === mappedMessage.id) ? prev : [...prev, mappedMessage]
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

  const getMessagesForUser = (userId: string): Message[] => {
    if (!currentUser) return [];

    return messages.filter(
      (msg) =>
        (msg.senderId === currentUser.id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === currentUser.id)
    ).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const value = {
    messages,
    isLoadingMessages,
    sendMessage,
    getMessagesForUser,
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