
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Home, Users, Calendar } from "lucide-react";

const Index = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with login button */}
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neu-red">SubletNU</h1>
          <Button 
            onClick={() => navigate('/auth')} 
            className="bg-neu-red hover:bg-neu-red/90"
          >
            Log In
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-6">Find Your Perfect Northeastern Sublet</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          The easiest way for Northeastern students to find and post sublets
          with verified Northeastern email addresses.
        </p>
        <Button 
          onClick={() => navigate('/auth')} 
          size="lg" 
          className="bg-neu-red hover:bg-neu-red/90"
        >
          Get Started
        </Button>
      </section>

      {/* Features section */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold mb-10 text-center">How SubletNU Works</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="bg-neu-red/10 p-4 rounded-full mb-4">
                <Building className="h-8 w-8 text-neu-red" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Find Sublets</h4>
              <p className="text-gray-600">
                Browse verified listings from Northeastern students with detailed information and photos.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-neu-red/10 p-4 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-neu-red" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Flexible Dates</h4>
              <p className="text-gray-600">
                Find sublets that match your co-op or study abroad schedule, with flexible move-in dates.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-neu-red/10 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-neu-red" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Student Community</h4>
              <p className="text-gray-600">
                Connect directly with other Northeastern students in a secure, verified community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600">
            © {new Date().getFullYear()} SubletNU - Exclusively for Northeastern University Students
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
