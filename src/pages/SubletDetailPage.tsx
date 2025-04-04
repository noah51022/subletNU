
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import SubletCard from "@/components/SubletCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wifi, Dumbbell, Shield, Check } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const SubletDetailPage = () => {
  const { subletId } = useParams<{ subletId: string }>();
  const { sublets, currentUser } = useApp();
  const navigate = useNavigate();
  
  const sublet = sublets.find(s => s.id === subletId);
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;
  
  if (!sublet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold mb-4">Sublet Not Found</h1>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  // Demo amenities if none exist on the sublet
  const amenities = sublet.amenities || ["High-speed WiFi", "Gym access", "24/7 security"];

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
      <header className="bg-neu-red text-white p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-neu-red/80" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold ml-2">Sublet Details</h1>
      </header>
      
      <div className="p-4">
        <SubletCard sublet={sublet} expanded={true} />
        
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-3">Amenities</h2>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="flex items-center justify-start px-3 py-2 bg-gray-50"
              >
                {getAmenityIcon(amenity)}
                <span>{amenity}</span>
              </Badge>
            ))}
            
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
