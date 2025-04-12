import React, { useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.Place | null, distanceInMiles: number | null) => void; // Use Place type
  inputValue: string;
  setInputValue: (value: string) => void;
  destinationCoordinates: google.maps.LatLngLiteral;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onPlaceSelect,
  inputValue,
  setInputValue,
  destinationCoordinates
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  console.log('Google Maps API Key Status:', {
    isDefined: !!apiKey,
    length: apiKey?.length,
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Log any load errors
  useEffect(() => {
    if (loadError) {
      console.error('Detailed Google Maps load error:', loadError);
    }
  }, [loadError]);

  // Calculate distance between two points
  const calculateDistance = (origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): Promise<number | null> => {
    return new Promise((resolve) => {
      if (!google?.maps?.DistanceMatrixService) {
        console.warn("DistanceMatrixService not loaded");
        resolve(null);
        return;
      }
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL, // Request miles
        },
        (response, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && response?.rows[0]?.elements[0]?.status === google.maps.DistanceMatrixElementStatus.OK) {
            const distanceInMeters = response.rows[0].elements[0].distance.value;
            const distanceInMiles = distanceInMeters * 0.000621371;
            resolve(distanceInMiles);
          } else {
            console.warn("DistanceMatrix request failed:", status, response);
            resolve(null);
          }
        }
      );
    });
  };

  // useEffect for creating and managing the autocomplete element
  useEffect(() => {
    if (isLoaded && google.maps) {
      try {
        // Create and configure the PlaceAutocompleteElement
        const placeAutocomplete = new (google.maps.places as any).PlaceAutocompleteElement({
          types: ['address']
        });

        // Style the element
        placeAutocomplete.className = 'w-full h-10 px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md';

        // Replace the current content with the new autocomplete element
        const currentContainer = document.getElementById('location-autocomplete-container');
        if (currentContainer) {
          currentContainer.innerHTML = '';
          currentContainer.appendChild(placeAutocomplete);
        }

        // Handle place selection
        placeAutocomplete.addEventListener('place_changed', async () => {
          try {
            const place = await (placeAutocomplete as any).getPlace() as google.maps.places.Place & {
              geometry?: { location: google.maps.LatLng };
              formatted_address?: string;
            };

            if (place.geometry?.location) {
              // Update input value with the formatted address
              const formattedAddress = place.formatted_address || place.formattedAddress;
              if (formattedAddress) {
                setInputValue(formattedAddress);

                // Calculate distance
                const originCoords = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                };
                const distance = await calculateDistance(originCoords, destinationCoordinates);
                onPlaceSelect(place, distance);
              }
            } else {
              console.warn("Selected place lacks location or address:", place);
              toast({
                title: "Invalid Selection",
                description: "Selected location lacks required details.",
                variant: "destructive"
              });
              onPlaceSelect(null, null);
            }
          } catch (error) {
            console.error("Error handling place selection:", error);
            toast({
              title: "Error",
              description: "Failed to process the selected location.",
              variant: "destructive"
            });
            onPlaceSelect(null, null);
          }
        });

        return () => {
          // Cleanup
          if (currentContainer) {
            currentContainer.innerHTML = '';
          }
        };
      } catch (error) {
        console.error("Error initializing PlaceAutocompleteElement:", error);
        toast({
          title: "Error",
          description: "Failed to initialize address lookup.",
          variant: "destructive"
        });
      }
    }
  }, [isLoaded, inputValue, onPlaceSelect, setInputValue, destinationCoordinates]);

  // Effect to sync input value when parent state changes
  useEffect(() => {
    if (inputValue !== inputValue) {
      setInputValue(inputValue);
    }
  }, [inputValue, setInputValue]);

  // --- Error & Loading States ---
  if (loadError) {
    console.error("[LocationAutocomplete] Google Maps Load Error:", loadError);
    toast({
      title: "Address Lookup Error",
      description: "Could not load Google Maps Autocomplete. Please check console or try again later.",
      variant: "destructive",
    });
    return (
      <div className="p-2 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm">
        Address lookup failed to load. Please try refreshing the page.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <Input
        type="text"
        placeholder="Loading address lookup..."
        disabled={true}
        required
        className="w-full"
      />
    );
  }
  // --- End Error & Loading States ---

  // --- Render Container ---
  // Apply Shadcn styles to the container div
  return (
    <div id="location-autocomplete-container" className="w-full">
      {/* PlaceAutocompleteElement will be mounted here */}
    </div>
  );
};

export default LocationAutocomplete; 