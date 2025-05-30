import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sublet } from '@/types';

interface UseSavedListingsReturn {
  savedListings: Sublet[];
  isLoading: boolean;
  error: string | null;
  isSaved: (listingId: string) => boolean;
  toggleSave: (listingId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// Helper function to transform database sublet to frontend Sublet type
const transformSubletData = (dbSublet: any, savedAt?: string): Sublet => {
  return {
    id: dbSublet.id,
    userId: dbSublet.user_id,
    userEmail: '', // This would need to be joined if needed
    price: dbSublet.price,
    location: dbSublet.location,
    distanceFromNEU: dbSublet.distance_from_neu,
    description: dbSublet.description,
    startDate: dbSublet.start_date,
    endDate: dbSublet.end_date,
    photos: dbSublet.photos || [],
    genderPreference: dbSublet.gender_preference,
    pricingType: dbSublet.pricing_type,
    amenities: dbSublet.amenities || [],
    createdAt: dbSublet.created_at,
    noBrokersFee: dbSublet.no_brokers_fee || false,
    instagramHandle: dbSublet.instagram_handle,
    snapchatHandle: dbSublet.snapchat_handle,
    saved_at: savedAt,
  };
};

export const useSavedListings = (): UseSavedListingsReturn => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [savedListings, setSavedListings] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  // Fetch all saved listings for the current user
  const fetchSavedListings = useCallback(async () => {
    if (!currentUser) {
      setSavedListings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('saved_listings')
        .select(`
          created_at,
          sublets (*)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include saved_at timestamp
      const listings = data?.map(item => 
        transformSubletData(item.sublets, item.created_at)
      ) || [];

      setSavedListings(listings);
    } catch (err: any) {
      console.error('Error fetching saved listings:', err);
      setError(err.message || 'Failed to fetch saved listings');
      setSavedListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Check if a specific listing is saved
  const isSaved = useCallback((listingId: string): boolean => {
    return savedListings.some(listing => listing.id === listingId);
  }, [savedListings]);

  // Toggle save state for a listing with optimistic updates
  const toggleSave = useCallback(async (listingId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save listings.",
        variant: "default",
      });
      return;
    }

    if (savingStates[listingId]) {
      return; // Already processing this listing
    }

    const isCurrentlySaved = isSaved(listingId);
    
    // Optimistic update
    setSavingStates(prev => ({ ...prev, [listingId]: true }));
    
    if (isCurrentlySaved) {
      // Optimistically remove from saved listings
      setSavedListings(prev => prev.filter(listing => listing.id !== listingId));
    }

    try {
      if (isCurrentlySaved) {
        // Remove from saved listings
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('listing_id', listingId);

        if (error) throw error;

        toast({
          title: "Listing Unsaved",
          description: "This listing has been removed from your saved items.",
        });
      } else {
        // Add to saved listings
        const { error } = await supabase
          .from('saved_listings')
          .insert({
            user_id: currentUser.id,
            listing_id: listingId,
          });

        if (error) {
          // Handle unique constraint violation (already saved)
          if (error.code === '23505') {
            toast({
              title: "Already Saved",
              description: "This listing is already in your saved items.",
            });
            // Refresh to get current state
            await fetchSavedListings();
            return;
          }
          throw error;
        }

        // Fetch the listing details for optimistic update
        const { data: listingData } = await supabase
          .from('sublets')
          .select('*')
          .eq('id', listingId)
          .single();

        if (listingData) {
          const transformedListing = transformSubletData(listingData, new Date().toISOString());
          setSavedListings(prev => [transformedListing, ...prev]);
        }

        toast({
          title: "Listing Saved",
          description: "This listing has been added to your saved items.",
        });
      }
    } catch (err: any) {
      console.error('Error toggling save state:', err);
      
      // Revert optimistic update on error
      if (isCurrentlySaved) {
        // Re-add the listing back
        await fetchSavedListings();
      } else {
        // Remove the optimistically added listing
        setSavedListings(prev => prev.filter(listing => listing.id !== listingId));
      }

      toast({
        title: "Error",
        description: err.message || `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} listing`,
        variant: "destructive",
      });
    } finally {
      setSavingStates(prev => {
        const newState = { ...prev };
        delete newState[listingId];
        return newState;
      });
    }
  }, [currentUser, isSaved, toast, fetchSavedListings]);

  // Fetch saved listings when user changes
  useEffect(() => {
    fetchSavedListings();
  }, [fetchSavedListings]);

  return {
    savedListings,
    isLoading,
    error,
    isSaved,
    toggleSave,
    refetch: fetchSavedListings,
  };
}; 