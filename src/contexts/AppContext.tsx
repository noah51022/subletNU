import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sublet, User, Message } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session, RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

type AppContextType = {
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoadingAuth: boolean;
  isLoadingSublets: boolean;
  isLoadingMessages: boolean;
  sublets: Sublet[];
  messages: Message[];
  filteredSublets: Sublet[];
  maxPrice: number;
  maxDistance: number;
  dateRange: { start: string | null; end: string | null };
  genderFilter: "male" | "female" | "any" | "all";
  pricingTypeFilter: "firm" | "negotiable" | "all";
  amenitiesFilter: string[];
  setMaxPrice: (price: number) => void;
  setMaxDistance: (distance: number) => void;
  setDateRange: (range: { start: string | null; end: string | null }) => void;
  setGenderFilter: (gender: "male" | "female" | "any" | "all") => void;
  setPricingTypeFilter: (type: "firm" | "negotiable" | "all") => void;
  setAmenitiesFilter: (amenities: string[]) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  addSublet: (sublet: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => Promise<void>;
  updateSublet: (subletId: string, sublet: Partial<Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">>) => Promise<void>;
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForUser: (userId: string) => Message[];
  uploadPhoto: (file: File, userId: string) => Promise<string | null>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoadingSublets, setIsLoadingSublets] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [genderFilter, setGenderFilter] = useState<"male" | "female" | "any" | "all">("all");
  const [pricingTypeFilter, setPricingTypeFilter] = useState<"firm" | "negotiable" | "all">("all");
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const appUser: User = {
            id: session.user.id,
            email: session.user.email || "",
            verified: session.user.email_confirmed_at !== null
          };
          setCurrentUser(appUser);
        } else {
          setCurrentUser(null);
        }
        setIsLoadingAuth(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session);
          const user = session?.user ?? null;
          setSupabaseUser(user);

          if (user) {
            const appUser: User = {
              id: user.id,
              email: user.email || "",
              verified: user.email_confirmed_at !== null
            };
            setCurrentUser(appUser);
          } else {
            setCurrentUser(null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchSublets = async () => {
    setIsLoadingSublets(true);
    try {
      const { data, error } = await supabase
        .from('sublets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sublets:', error);
        setSublets([]);
        return;
      }

      if (data) {
        const subletsWithEmails: Sublet[] = await Promise.all(
          data.map(async (item) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', item.user_id)
              .single();

            return {
              id: item.id,
              userId: item.user_id,
              userEmail: profileData?.email || "unknown@northeastern.edu",
              price: item.price,
              location: item.location,
              distanceFromNEU: item.distance_from_neu,
              startDate: item.start_date,
              endDate: item.end_date,
              description: item.description,
              photos: item.photos,
              createdAt: item.created_at,
              genderPreference: item.gender_preference as "male" | "female" | "any",
              pricingType: item.pricing_type as "firm" | "negotiable",
              amenities: item.amenities || [],
              noBrokersFee: item.no_brokers_fee || false,
            };
          })
        );
        setSublets(subletsWithEmails);
      } else {
        setSublets([]);
      }
    } catch (error) {
      console.error('Failed to fetch sublets:', error);
      setSublets([]);
    } finally {
      setIsLoadingSublets(false);
    }
  };

  useEffect(() => {
    fetchSublets();

    const channel = supabase
      .channel('public:sublets')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sublets' },
        (payload) => {
          fetchSublets();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Subscription channel error:', err);
        }
        if (status === 'TIMED_OUT') {
          console.error('Subscription timed out');
        }
        if (status === 'CLOSED') {
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      // Fetch initial messages
      await fetchMessages();

      // Set up realtime subscription if user is logged in
      if (currentUser) {
        messageChannel = supabase
          .channel(`realtime:messages:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              // Filter on the server-side for messages involving the current user
              filter: `sender_id=eq.${currentUser.id}`,
            },
            (payload) => {
              // Handle new message where current user is the sender
              console.log('New message from current user:', payload);
              const newMessage = payload.new as any; // Cast necessary because default types might not include all columns
              const mappedMessage: Message = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                text: newMessage.text,
                timestamp: newMessage.created_at,
              };
              // Add to state, preventing duplicates just in case
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
              // Filter on the server-side for messages received by the current user
              filter: `receiver_id=eq.${currentUser.id}`,
            },
            (payload) => {
              // Handle new message where current user is the receiver
              console.log('New message for current user:', payload);
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
              console.log('Subscribed to messages channel for user:', currentUser.id);
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

    // Cleanup function
    return () => {
      if (messageChannel) {
        console.log('Unsubscribing from messages channel');
        supabase.removeChannel(messageChannel);
        messageChannel = null;
      }
    };
  }, [currentUser]); // Re-run when user logs in/out

  const filteredSublets = sublets.filter((sublet) => {
    const priceFilter = sublet.price <= maxPrice;
    const distanceFilter = sublet.distanceFromNEU <= maxDistance;

    let dateFilter = true;
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const subletStart = new Date(sublet.startDate);
      const subletEnd = new Date(sublet.endDate);

      dateFilter = (
        (subletStart <= end && subletEnd >= start)
      );
    }

    const genderFilterMatch = genderFilter === "all" || sublet.genderPreference === genderFilter;
    const pricingTypeFilterMatch = pricingTypeFilter === "all" || sublet.pricingType === pricingTypeFilter;

    // Check if sublet has all selected amenities
    const amenitiesFilterMatch = amenitiesFilter.length === 0 ||
      (sublet.amenities && amenitiesFilter.every(amenity => sublet.amenities.includes(amenity)));

    return priceFilter && distanceFilter && dateFilter && genderFilterMatch && pricingTypeFilterMatch && amenitiesFilterMatch;
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email.endsWith('@northeastern.edu')) {
      toast({
        title: "Invalid Email",
        description: "You must use a northeastern.edu email address.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Login Successful",
        description: "Welcome back to SubletNU!",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string }): Promise<boolean> => {
    if (!email.endsWith('@northeastern.edu')) {
      toast({
        title: "Invalid Email",
        description: "You must use a northeastern.edu email address.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Registration Successful",
        description: "Welcome to SubletNU! Please check your email for verification.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const addSublet = async (subletData: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('sublets')
        .insert({
          user_id: currentUser.id,
          price: subletData.price,
          location: subletData.location,
          distance_from_neu: subletData.distanceFromNEU,
          description: subletData.description,
          start_date: subletData.startDate,
          end_date: subletData.endDate,
          photos: subletData.photos,
          gender_preference: subletData.genderPreference,
          pricing_type: subletData.pricingType,
          amenities: subletData.amenities,
          no_brokers_fee: subletData.noBrokersFee,
        });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to post your sublet",
          variant: "destructive",
        });
        throw error;
      }

      fetchSublets();

      toast({
        title: "Sublet Posted",
        description: "Your sublet has been posted successfully.",
      });
    } catch (error) {
      console.error("Error adding sublet:", error);
      throw error;
    }
  };

  const updateSublet = async (subletId: string, subletData: Partial<Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">>) => {
    if (!currentUser) return;

    try {
      const supabaseData: any = {};

      if (subletData.price !== undefined) supabaseData.price = subletData.price;
      if (subletData.location !== undefined) supabaseData.location = subletData.location;
      if (subletData.distanceFromNEU !== undefined) supabaseData.distance_from_neu = subletData.distanceFromNEU;
      if (subletData.description !== undefined) supabaseData.description = subletData.description;
      if (subletData.startDate !== undefined) supabaseData.start_date = subletData.startDate;
      if (subletData.endDate !== undefined) supabaseData.end_date = subletData.endDate;
      if (subletData.photos !== undefined) supabaseData.photos = subletData.photos;
      if (subletData.genderPreference !== undefined) supabaseData.gender_preference = subletData.genderPreference;
      if (subletData.pricingType !== undefined) supabaseData.pricing_type = subletData.pricingType;
      if (subletData.amenities !== undefined) supabaseData.amenities = subletData.amenities;
      if (subletData.noBrokersFee !== undefined) supabaseData.no_brokers_fee = subletData.noBrokersFee;

      const { error } = await supabase
        .from('sublets')
        .update(supabaseData)
        .eq('id', subletId)
        .eq('user_id', currentUser.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to update your sublet",
          variant: "destructive",
        });
        if (error instanceof Error) {
          throw error;
        } else {
          throw error;
        }
      } else {
        fetchSublets();
        toast({
          title: "Sublet Updated",
          description: "Your sublet has been updated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Error updating sublet in context:", error);
      throw error;
    }
  };

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
      // Don't send empty messages
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          text: text.trim(),
          // id and created_at are usually handled by Supabase defaults
        });

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message.",
          variant: "destructive",
        });
        throw error; // Re-throw the error if needed elsewhere
      }

      // Message sent successfully
      // console.log("Message sent successfully via Supabase");
      // No need to update local state or refetch manually anymore
      // setMessages((prev) => [...prev, newMessage]); // REMOVED
      // fetchMessages(); // REMOVED

    } catch (error) {
      console.error("Failed to send message:", error);
      // Toast might already be shown if error came from Supabase client call
      // Ensure a toast is shown if the error is different
      if (!(error instanceof Error && (error as any).details)) { // Check if it's likely a Supabase error already handled
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

  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    if (!file || !userId) {
      console.error("UploadPhoto: File or userId missing");
      return null;
    }

    // Create a unique file path, e.g., public/user_id/timestamp_filename.ext
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`; // Store under a folder named after the user ID

    try {
      // Upload file to the 'sublet-photos' bucket
      const { error: uploadError } = await supabase.storage
        .from('sublet-photos') // Use your bucket name here
        .upload(filePath, file, {
          cacheControl: '3600', // Optional: cache for 1 hour
          upsert: false, // Optional: don't overwrite existing file with same name
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}: ${uploadError.message}`,
          variant: "destructive",
        });
        return null;
      }

      // Get the public URL of the uploaded file
      const { data } = supabase.storage
        .from('sublet-photos') // Use your bucket name here
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        console.error('Error getting public URL for:', filePath);
        toast({
          title: "Upload Error",
          description: `Could not get public URL for ${file.name}.`,
          variant: "destructive",
        });
        return null;
      }

      console.log('Successfully uploaded:', data.publicUrl);
      return data.publicUrl;

    } catch (error: any) {
      console.error('Error in uploadPhoto function:', error);
      toast({
        title: "Upload Failed",
        description: error.message || `An unexpected error occurred uploading ${file.name}.`,
        variant: "destructive",
      });
      return null;
    }
  };

  const value = {
    currentUser,
    supabaseUser,
    session,
    isLoadingAuth,
    isLoadingSublets,
    isLoadingMessages,
    sublets,
    messages,
    filteredSublets,
    maxPrice,
    maxDistance,
    dateRange,
    genderFilter,
    pricingTypeFilter,
    amenitiesFilter,
    setMaxPrice,
    setMaxDistance,
    setDateRange,
    setGenderFilter,
    setPricingTypeFilter,
    setAmenitiesFilter,
    login,
    register,
    logout,
    addSublet,
    updateSublet,
    sendMessage,
    getMessagesForUser,
    uploadPhoto,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
