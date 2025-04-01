
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import SubletCard from "@/components/SubletCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

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
          <h2 className="text-lg font-bold mb-2">Location Details</h2>
          <p className="text-gray-700">
            {sublet.location}, {sublet.distanceFromNEU} miles from Northeastern University
          </p>
          <div className="mt-4 h-48 bg-gray-200 rounded flex items-center justify-center">
            <p className="text-gray-500">Map would appear here with Google Maps API</p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default SubletDetailPage;
