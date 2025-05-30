
import { useState } from "react";
import { Check, Search, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Categorized amenities
const AMENITIES_OPTIONS = {
  "🛏 Room Amenities": [
    "Furnished",
    "Private Bedroom",
    "Private Bathroom",
    "Closet / Storage",
    "Desk & Chair",
    "Air Conditioning",
    "Heating",
    "Ceiling Fan",
  ],
  "🏠 Home Features": [
    "Kitchen Access",
    "Shared Living Room",
    "Laundry (In-Unit)",
    "Laundry (In-Building)",
    "Dishwasher",
    "Balcony / Patio",
    "TV",
    "High-Speed Wi-Fi",
    "Utilities Included",
  ],
  "🛡️ Safety & Access": [
    "Keyless Entry",
    "Gated Entry",
    "Smoke Detectors",
    "Security Cameras",
    "On-site Maintenance",
  ],
  "🅿️ Transportation / Parking": [
    "Free Parking",
    "Street Parking",
    "Garage Parking",
    "Bike Storage",
    "Near Public Transit",
  ],
  "🐶 Pets": [
    "Pets Allowed",
    "Cat Friendly",
    "Dog Friendly",
  ],
  "💼 Extra Perks": [
    "Gym",
    "Pool",
    "Study Lounge",
    "Rooftop / Courtyard",
    "Elevator Access",
    "Cleaning Service",
  ],
};

// Flatten the categories for search functionality
const ALL_AMENITIES = Object.values(AMENITIES_OPTIONS).flat();

// Common amenities that users frequently select
const COMMON_AMENITIES = [
  "Furnished",
  "Private Bathroom",
  "Air Conditioning",
  "Laundry (In-Unit)",
  "High-Speed Wi-Fi",
  "Utilities Included",
  "Free Parking",
  "Pets Allowed"
];

type AmenitiesSelectorProps = {
  selectedAmenities: string[];
  onChange: (amenities: string[]) => void;
};

const AmenitiesSelector = ({ selectedAmenities, onChange }: AmenitiesSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      onChange(selectedAmenities.filter(item => item !== amenity));
    } else {
      onChange([...selectedAmenities, amenity]);
    }
  };

  const filteredAmenities = searchQuery
    ? ALL_AMENITIES.filter(amenity => 
        amenity.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="space-y-4">
      {/* Quick select common amenities */}
      <div className="flex flex-wrap gap-2">
        {COMMON_AMENITIES.map(amenity => (
          <Badge
            key={amenity}
            variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
            className={`
              cursor-pointer px-2 py-1 text-sm
              ${selectedAmenities.includes(amenity) 
                ? "bg-neu-red hover:bg-neu-red/90" 
                : "hover:bg-gray-100"}
            `}
            onClick={() => toggleAmenity(amenity)}
          >
            {selectedAmenities.includes(amenity) && (
              <Check className="mr-1 h-3 w-3" />
            )}
            {amenity}
          </Badge>
        ))}
      </div>

      {/* Selected amenities list */}
      <div className="flex flex-wrap gap-2 my-2">
        {selectedAmenities
          .filter(amenity => !COMMON_AMENITIES.includes(amenity))
          .map(amenity => (
            <Badge 
              key={amenity} 
              variant="secondary"
              className="px-2 py-1 text-sm"
            >
              {amenity}
              <button 
                className="ml-1 rounded-full hover:bg-gray-200 p-1"
                onClick={() => toggleAmenity(amenity)}
              >
                ×
              </button>
            </Badge>
          ))}
      </div>

      {/* Search more amenities */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-left font-normal"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Add more amenities...</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <Command>
            <CommandInput 
              placeholder="Search amenities..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            <ScrollArea className="h-[300px]">
              <CommandList>
                {searchQuery ? (
                  <>
                    <CommandEmpty>No amenities found</CommandEmpty>
                    {filteredAmenities.length > 0 && (
                      <CommandGroup heading="Search Results">
                        {filteredAmenities.map(amenity => (
                          <CommandItem
                            key={amenity}
                            value={amenity}
                            onSelect={() => toggleAmenity(amenity)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{amenity}</span>
                              {selectedAmenities.includes(amenity) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                ) : (
                  <>
                    {Object.entries(AMENITIES_OPTIONS).map(([category, amenities]) => (
                      <CommandGroup key={category} heading={category}>
                        {amenities.map(amenity => (
                          <CommandItem
                            key={amenity}
                            value={amenity}
                            onSelect={() => toggleAmenity(amenity)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{amenity}</span>
                              {selectedAmenities.includes(amenity) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </>
                )}
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AmenitiesSelector;
