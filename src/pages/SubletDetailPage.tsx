import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSublet } from "@/contexts/SubletContext";
import SubletCard from "@/components/SubletCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wifi, Dumbbell, Shield, Check, Share2, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const SubletDetailPage = () => {
  const { subletId } = useParams<{ subletId: string }>();
  const { currentUser, isLoadingAuth } = useAuth();
  const { sublets, isLoadingSublets } = useSublet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sublet = !isLoadingSublets ? sublets.find(s => s.id === subletId) : undefined;

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      navigate('/auth');
    }
  }, [currentUser, isLoadingAuth, navigate]);

  // Function to handle copying the link
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "The listing link has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy link: ", err);
      toast({
        title: "Error",
        description: "Could not copy the link.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingAuth || isLoadingSublets) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neu-red" />
        <p className="mt-4 text-gray-600">Loading details...</p>
      </div>
    );
  }

  if (!sublet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold mb-4">Sublet Not Found</h1>
        <p className="text-gray-600 mb-4">The listing might have been removed or the link is incorrect.</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  // Demo amenities if none exist on the sublet
  const amenities = sublet.amenities && sublet.amenities.length > 0
    ? sublet.amenities
    : ["High-speed WiFi", "Gym access", "24/7 security"];

  // Map amenities to corresponding icons
  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase();
    if (lowerAmenity.includes('wifi') || lowerAmenity.includes('internet')) {
      return <Wifi className="h-4 w-4 mr-2" />;
    } else if (lowerAmenity.includes('gym') || lowerAmenity.includes('fitness')) {
      return <Dumbbell className="h-4 w-4 mr-2" />;
    } else if (lowerAmenity.includes('security') || lowerAmenity.includes('safe')) {
      return <Shield className="h-4 w-4 mr-2" />;
    }
    return null;
  };

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <header className="bg-neu-red text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-neu-red/80"
            onClick={() => navigate('/')}
          >
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-bold ml-2">Sublet Details</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-neu-red/80"
          onClick={handleShare}
        >
          <Share2 />
        </Button>
      </header>

      <div className="p-4">
        <SubletCard sublet={sublet} expanded={true} />

        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-3">Amenities</h2>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity, index) => {
              const icon = getAmenityIcon(amenity);
              return (
                <Badge
                  key={index}
                  variant="outline"
                  className="flex items-center justify-start px-3 py-2 bg-gray-50"
                >
                  {icon ? icon : <Check className="h-4 w-4 mr-2 text-gray-400" />}
                  <span>{amenity}</span>
                </Badge>
              );
            })}

            {/* No Broker's Fee Badge */}
            {sublet.noBrokersFee && (
              <Badge
                variant="outline"
                className="flex items-center justify-start px-3 py-2 bg-green-50 text-green-800 border-green-200"
              >
                <Check className="h-4 w-4 mr-2" />
                <span>No Broker's Fee</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">Location Details</h2>
          <p className="text-gray-700 mb-3">
            {sublet.location}, {sublet.distanceFromNEU} miles from Northeastern University
          </p>
          <div className="mt-4 h-64 bg-gray-200 rounded overflow-hidden">
            <img
              src="/lovable-uploads/00e76d61-7cdc-40b9-8203-95d37c2a1f06.png"
              alt="Map showing location near Northeastern University"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SubletDetailPage;
