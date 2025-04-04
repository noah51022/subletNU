
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sublet, User, Message } from "../types";
import { mockMessages } from "../services/mockData";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

type AppContextType = {
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  sublets: Sublet[];
  messages: Message[];
  filteredSublets: Sublet[];
  maxPrice: number;
  maxDistance: number;
  dateRange: { start: string | null; end: string | null };
  genderFilter: "male" | "female" | "any" | "all";
  pricingTypeFilter: "firm" | "negotiable" | "all";
  setMaxPrice: (price: number) => void;
  setMaxDistance: (distance: number) => void;
  setDateRange: (range: { start: string | null; end: string | null }) => void;
  setGenderFilter: (gender: "male" | "female" | "any" | "all") => void;
  setPricingTypeFilter: (type: "firm" | "negotiable" | "all") => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addSublet: (sublet: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => Promise<void>;
  updateSublet: (subletId: string, sublet: Partial<Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">>) => Promise<void>;
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForUser: (userId: string) => Message[];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [genderFilter, setGenderFilter] = useState<"male" | "female" | "any" | "all">("all");
  const [pricingTypeFilter, setPricingTypeFilter] = useState<"firm" | "negotiable" | "all">("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user) {
        const appUser: User = {
          id: session.user.id,
          email: session.user.email || "",
          verified: session.user.email_confirmed_at !== null
        };
        setCurrentUser(appUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSublets = async () => {
    try {
      const { data, error } = await supabase
        .from('sublets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sublets:', error);
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
      }
    } catch (error) {
      console.error('Failed to fetch sublets:', error);
    }
  };

  useEffect(() => {
    fetchSublets();
    
    const channel = supabase
      .channel('public:sublets')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sublets' }, 
        () => {
          fetchSublets();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

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
    
    return priceFilter && distanceFilter && dateFilter && genderFilterMatch && pricingTypeFilterMatch;
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

  const register = async (email: string, password: string): Promise<boolean> => {
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
        password
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
      // Convert to snake_case for Supabase
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
        .eq('user_id', currentUser.id);  // Ensure the user owns this sublet

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to update your sublet",
          variant: "destructive",
        });
        throw error;
      }

      fetchSublets();
      
      toast({
        title: "Sublet Updated",
        description: "Your sublet has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating sublet:", error);
      throw error;
    }
  };

  const sendMessage = (receiverId: string, text: string) => {
    if (!currentUser) return;
    
    const newMessage: Message = {
      id: `msg${messages.length + 1}`,
      senderId: currentUser.id,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([...messages, newMessage]);
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
    currentUser,
    supabaseUser,
    session,
    sublets,
    messages,
    filteredSublets,
    maxPrice,
    maxDistance,
    dateRange,
    genderFilter,
    pricingTypeFilter,
    setMaxPrice,
    setMaxDistance,
    setDateRange,
    setGenderFilter,
    setPricingTypeFilter,
    login,
    register,
    logout,
    addSublet,
    updateSublet,
    sendMessage,
    getMessagesForUser,
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
