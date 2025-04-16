import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import FilterBar from "@/components/FilterBar";
import SubletCard from "@/components/SubletCard";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const HomePage = () => {
  const { currentUser } = useAuth();
  const { filteredSublets } = useFilter();
  const navigate = useNavigate();

  useEffect(() => {
    // Remove redirect for unauthenticated users
    // if (!currentUser) {
    //   navigate('/auth');
    // }
  }, [currentUser, navigate]);

  return (
    <div className="mx-auto w-full max-w-[90%] md:max-w-4xl lg:max-w-6xl">
      <FilterBar />

      <div className="mt-4 pb-4">
        {filteredSublets === undefined ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neu-red" />
          </div>
        ) : filteredSublets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sublets match your filters.</p>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          filteredSublets.map((sublet) => (
            <SubletCard key={sublet.id} sublet={sublet} />
          ))
        )}
      </div>
    </div>
  );
};

export default HomePage;
