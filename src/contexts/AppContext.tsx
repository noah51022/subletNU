import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sublet, User, Message } from "../types";
import { mockSublets, mockUsers, mockMessages } from "../services/mockData";
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
  addSublet: (sublet: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => void;
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForUser: (userId: string) => Message[];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sublets, setSublets] = useState<Sublet[]>(mockSublets);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  
  // Filters
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [genderFilter, setGenderFilter] = useState<"male" | "female" | "any" | "all">("all");
  const [pricingTypeFilter, setPricingTypeFilter] = useState<"firm" | "negotiable" | "all">("all");

  // Setup Supabase auth listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        // Update our app's user state
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      // Update our app's user state
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

  // Computed filtered sublets
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

  // Auth functions (using Supabase)
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

  // Sublet functions
  const addSublet = (subletData: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => {
    if (!currentUser) return;
    
    const newSublet: Sublet = {
      ...subletData,
      id: `sublet${sublets.length + 1}`,
      userId: currentUser.id,
      userEmail: currentUser.email,
      createdAt: new Date().toISOString(),
    };
    
    setSublets([newSublet, ...sublets]);
  };

  // Message functions
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
