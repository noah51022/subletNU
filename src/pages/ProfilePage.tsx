
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";
import ProfileListingCard from "@/components/ProfileListingCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { Sublet } from "../types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ProfilePage = () => {
  const { currentUser, logout } = useApp();
  const [myListings, setMyListings] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
    } else {
      fetchMyListings();
    }
  }, [currentUser, navigate]);

  const fetchMyListings = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sublets')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my listings:', error);
        toast({
          title: "Error",
          description: "Failed to load your listings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const mySublets: Sublet[] = data.map(item => ({
          id: item.id,
          userId: item.user_id,
          userEmail: currentUser.email,
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
        }));

        setMyListings(mySublets);
      }
    } catch (error) {
      console.error('Failed to fetch my listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = async (subletId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('sublets')
        .delete()
        .eq('id', subletId);
        
      if (error) {
        console.error('Error deleting listing:', error);
        toast({
          title: "Error",
          description: "Failed to delete listing",
          variant: "destructive",
        });
        return;
      }
      
      // Update local state
      setMyListings(myListings.filter(listing => listing.id !== subletId));
      
      toast({
        title: "Success",
        description: "Listing deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete listing:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  if (!currentUser) return null;

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <header className="bg-neu-red text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Profile</h1>
        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          className="text-white hover:bg-red-800"
        >
          <LogOut size={18} className="mr-2" />
          Log out
        </Button>
      </header>
      
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-gray-600">{currentUser.email}</p>
        </div>
        
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="listings" className="flex-1">My Listings</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Account Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="listings">
            <div className="my-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Your Sublet Listings</h3>
                <Button 
                  onClick={() => navigate('/create')}
                  className="bg-neu-red hover:bg-red-800"
                >
                  Create New Listing
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neu-red" />
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">You haven't posted any listings yet.</p>
                  <Button 
                    onClick={() => navigate('/create')}
                    className="mt-4 bg-neu-red hover:bg-red-800"
                  >
                    Create Your First Listing
                  </Button>
                </div>
              ) : (
                <div>
                  {myListings.map((listing) => (
                    <ProfileListingCard 
                      key={listing.id} 
                      sublet={listing} 
                      onDelete={handleDeleteListing}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Email Address</h3>
                <p className="text-sm text-gray-600 mb-3">{currentUser.email}</p>
                <p className="text-xs text-gray-500">
                  {currentUser.verified ? 
                    "Your email has been verified." : 
                    "Please check your inbox to verify your email address."
                  }
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Account Actions</h3>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
