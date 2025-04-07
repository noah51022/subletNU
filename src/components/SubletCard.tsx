
import { useState } from "react";
import { Sublet } from "../types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SubletCardProps {
  sublet: Sublet;
  expanded?: boolean;
}

const SubletCard = ({ sublet, expanded = false }: SubletCardProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const navigate = useNavigate();
  
  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex < sublet.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleCardClick = () => {
    if (!expanded) {
      navigate(`/sublet/${sublet.id}`);
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/messages/${sublet.userId}`, { state: { subletId: sublet.id } });
  };

  const formatDateRange = () => {
    const start = new Date(sublet.startDate);
    const end = new Date(sublet.endDate);
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  };

  const getGenderBadge = () => {
    const genderInfo = {
      male: {
        label: "For guys",
        className: "bg-soft-blue hover:bg-soft-blue"
      },
      female: {
        label: "For girls",
        className: "bg-soft-pink hover:bg-soft-pink"
      },
      any: {
        label: "Open to all",
        className: "bg-light-purple hover:bg-light-purple"
      }
    };

    const preference = sublet.genderPreference || "any";
    const info = genderInfo[preference];

    return (
      <Badge 
        variant="outline" 
        className={`${info.className} border-none text-gray-700 font-medium`}
      >
        {info.label}
      </Badge>
    );
  };

  const getPricingBadge = () => {
    return (
      <Badge 
        variant="outline" 
        className={`${sublet.pricingType === 'negotiable' ? 'bg-green-100 hover:bg-green-100' : 'bg-gray-100 hover:bg-gray-100'} border-none text-gray-700 font-medium ml-1`}
      >
        {sublet.pricingType === 'negotiable' ? 'Negotiable' : 'Firm'}
      </Badge>
    );
  };

  const getAmenityBadges = () => {
    if (!sublet.amenities || sublet.amenities.length === 0) {
      return null;
    }

    // Display up to 3 amenities
    const displayedAmenities = sublet.amenities.slice(0, 3);
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {displayedAmenities.map((amenity) => (
          <Badge 
            key={amenity} 
            variant="outline" 
            className="bg-gray-50 text-xs px-1.5 py-0.5 border-none"
          >
            {amenity}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Card 
      className={`sublet-card ${expanded ? 'w-full' : ''} cursor-pointer`}
      onClick={handleCardClick}
    >
      <div className="photo-carousel">
        <img 
          src={sublet.photos[currentPhotoIndex]}
          alt={`Sublet at ${sublet.location}`} 
          className="carousel-image"
        />
        
        {sublet.photos.length > 1 && (
          <>
            <button 
              onClick={handlePrevPhoto}
              disabled={currentPhotoIndex === 0}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-1"
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNextPhoto}
              disabled={currentPhotoIndex === sublet.photos.length - 1}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-1"
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
              {currentPhotoIndex + 1}/{sublet.photos.length}
            </div>
          </>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="text-xl font-bold text-neu-red">
                ${sublet.price}/mo
              </div>
              {getGenderBadge()}
              {getPricingBadge()}
            </div>
            <div className="text-sm text-gray-600">
              {sublet.distanceFromNEU} mi from NEU • {formatDateRange()}
            </div>
            <p className="mt-1 text-gray-800">{sublet.description}</p>
            
            {/* Display amenity badges */}
            {getAmenityBadges()}
          </div>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Posted by: {sublet.userEmail}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-neu-red border-neu-red hover:bg-neu-red hover:text-white"
            onClick={handleMessageClick}
          >
            <MessageSquare size={16} className="mr-1" />
            Message
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SubletCard;
