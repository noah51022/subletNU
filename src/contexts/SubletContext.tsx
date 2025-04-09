import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sublet } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "./AuthContext";

type SubletContextType = {
  sublets: Sublet[];
  isLoadingSublets: boolean;
  addSublet: (sublet: Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">) => Promise<void>;
  updateSublet: (subletId: string, sublet: Partial<Omit<Sublet, "id" | "userId" | "userEmail" | "createdAt">>) => Promise<void>;
  uploadPhoto: (file: File, userId: string) => Promise<string | null>;
};

const SubletContext = createContext<SubletContextType | undefined>(undefined);

export const SubletProvider = ({ children }: { children: ReactNode }) => {
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoadingSublets, setIsLoadingSublets] = useState(true);
  const { currentUser } = useAuth();

  const fetchSublets = async () => {
    setIsLoadingSublets(true);
    try {
      const { data, error } = await supabase
        .from('sublets')
        .select(`
          *,
          instagram_handle,
          snapchat_handle
        `)
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
              instagramHandle: item.instagram_handle,
              snapchatHandle: item.snapchat_handle,
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
          instagram_handle: subletData.instagramHandle,
          snapchat_handle: subletData.snapchatHandle,
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
      if (subletData.instagramHandle !== undefined) supabaseData.instagram_handle = subletData.instagramHandle;
      if (subletData.snapchatHandle !== undefined) supabaseData.snapchat_handle = subletData.snapchatHandle;

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
        throw error;
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

  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    if (!file || !userId) {
      console.error("UploadPhoto: File or userId missing");
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('sublet-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
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

      const { data } = supabase.storage
        .from('sublet-photos')
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
    sublets,
    isLoadingSublets,
    addSublet,
    updateSublet,
    uploadPhoto,
  };

  return <SubletContext.Provider value={value}>{children}</SubletContext.Provider>;
};

export const useSublet = () => {
  const context = useContext(SubletContext);
  if (context === undefined) {
    throw new Error("useSublet must be used within a SubletProvider");
  }
  return context;
}; 