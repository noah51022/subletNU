import { useState, useEffect } from "react";
import { Sublet } from "../types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css"; // Import lightbox styles

interface SubletCardProps {
  sublet: Sublet;
  expanded?: boolean;
}

const SubletCard = ({ sublet, expanded = false }: SubletCardProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false); // State for lightbox
  const [aspectRatioClass, setAspectRatioClass] = useState('aspect-video'); // Default to landscape
  const navigate = useNavigate();

  useEffect(() => {
    setAspectRatioClass('aspect-video');
  }, [currentPhotoIndex]);

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

  // Open lightbox when image is clicked
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking image
    setIsLightboxOpen(true);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const ratio = naturalWidth / naturalHeight;

    if (ratio > 1.2) { // Wider than 5:4 -> Landscape
      setAspectRatioClass('aspect-video'); // 16:9
    } else if (ratio < 0.8) { // Taller than 4:5 -> Portrait
      setAspectRatioClass('aspect-[3/4]'); // 3:4
    } else { // Close to square
      setAspectRatioClass('aspect-square'); // 1:1
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
        {sublet.pricingType === 'negotiable' ? 'Negotiable Price' : 'Firm Price'}
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

  // Prepare slides for the lightbox
  const lightboxSlides = sublet.photos.map(photoUrl => ({ src: photoUrl }));

  // Define the content to be rendered
  const cardContent = (
    <>
      <div className={`photo-carousel relative w-full overflow-hidden ${aspectRatioClass} ${expanded ? 'rounded-t-lg' : 'rounded-t-md'} bg-gray-100 flex items-center justify-center`}>
        <div onClick={handleImageClick} className="cursor-pointer w-full h-full flex items-center justify-center">
          <img
            key={sublet.photos[currentPhotoIndex]}
            src={sublet.photos[currentPhotoIndex]}
            alt={`Sublet at ${sublet.location}`}
            className={`carousel-image object-contain max-w-full max-h-full`}
            onLoad={handleImageLoad}
          />
        </div>

        {sublet.photos.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              disabled={currentPhotoIndex === 0}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 disabled:opacity-50"
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextPhoto}
              disabled={currentPhotoIndex === sublet.photos.length - 1}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 disabled:opacity-50"
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
              {currentPhotoIndex + 1}/{sublet.photos.length}
            </div>
          </>
        )}
      </div>

      <div className={expanded ? "p-4" : "p-4"}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
              <div className="text-xl font-bold text-neu-red">
                ${sublet.price}/mo
              </div>
              {getGenderBadge()}
              {getPricingBadge()}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {sublet.distanceFromNEU} mi from NU • {formatDateRange()}
            </div>
            <p className="mt-2 text-gray-800">{sublet.description}</p>

            {/* Display amenity badges */}
            {getAmenityBadges()}
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
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
    </>
  );

  // Conditionally wrap content in Card or a simple div
  return (
    <>
      {expanded ? (
        <div className="sublet-card-expanded bg-white rounded-lg shadow overflow-hidden">
          {cardContent}
        </div>
      ) : (
        <Card
          className="sublet-card cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          onClick={handleCardClick}
        >
          {cardContent}
        </Card>
      )}

      {/* Render Lightbox */}
      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={lightboxSlides}
        index={currentPhotoIndex} // Start lightbox at the currently viewed photo
        on={{ view: ({ index: currentIndex }) => setCurrentPhotoIndex(currentIndex) }} // Sync card index with lightbox
      />
    </>
  );
};

export default SubletCard;
