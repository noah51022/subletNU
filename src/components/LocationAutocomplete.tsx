import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

// Define the custom element type if typescript doesn't know it
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { class?: string; };
    }
  }
  interface HTMLElementTagNameMap {
    'gmp-place-autocomplete': google.maps.places.PlaceAutocompleteElement;
  }
}

const libraries: ("places" | "routes")[] = ["places", "routes"];

interface LocationAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null, distanceInMiles: number | null) => void;
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
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    // Specify the solution channel if required by Google's terms/warnings
    // solutionChannel: 'GMP_visdev_rgmfe_v1', // Example, check Google's docs if needed
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  // State to hold the HIDDEN autocomplete DOM node
  const [autocompleteNode, setAutocompleteNode] = useState<google.maps.places.PlaceAutocompleteElement | null>(null);

  // Ref for the place select listener function
  const placeSelectListenerRef = useRef<((event: Event) => void) | null>(null);

  // Callback ref for the HIDDEN Google component
  const autocompleteCallbackRef = useCallback((node: google.maps.places.PlaceAutocompleteElement | null) => {
    setAutocompleteNode(node);
  }, []);

  // useEffect for attaching listener to the HIDDEN Google component
  useEffect(() => {
    if (autocompleteNode && isLoaded) {
      const autocompleteElement = autocompleteNode;
      // Set fields needed for getPlace()
      autocompleteElement.setAttribute('place-fields', 'formatted_address,geometry,name');

      // --- calculateDistance function (can stay here or be defined outside useEffect if stable) ---
      const calculateDistance = (origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): Promise<number | null> => {
        return new Promise((resolve) => {
          if (!google || !google.maps || !google.maps.DistanceMatrixService) {
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
              if (status === google.maps.DistanceMatrixStatus.OK && response && response.rows[0]?.elements[0]?.status === google.maps.DistanceMatrixElementStatus.OK) {
                const distanceInMeters = response.rows[0].elements[0].distance.value;
                const distanceInMiles = distanceInMeters * 0.000621371;
                resolve(distanceInMiles);
              } else {
                resolve(null);
              }
            }
          );
        });
      };
      // --- End calculateDistance ---

      // --- retrievePlaceAndCalculateDistance function ---
      const retrievePlaceAndCalculateDistance = async () => {
        if (!autocompleteElement) {
          return;
        }
        const place = (autocompleteElement as any).getPlace() as google.maps.places.PlaceResult | undefined;

        if (place?.formatted_address && place.geometry?.location) {
          setInputValue(place.formatted_address);
          const originCoords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          try {
            const distance = await calculateDistance(originCoords, destinationCoordinates);
            onPlaceSelect(place, distance);
          } catch (error) {
            onPlaceSelect(place, null);
          }
        } else {
          if (place && !place.formatted_address) {
            toast({ title: "Invalid Place", description: "Selected place doesn't have a valid address.", variant: "destructive" });
          }
          if (place) {
            onPlaceSelect(null, null);
          }
        }
      };
      // --- End retrievePlaceAndCalculateDistance ---

      // --- Define handleInputChange in the outer scope of the effect ---
      const handleInputChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        setInputValue(target.value);
      };
      // --- End handleInputChange definition ---

      // --- Event Listener Setup ---
      const handlePlaceSelectEvent = (event: Event) => {
        retrievePlaceAndCalculateDistance();
      };

      placeSelectListenerRef.current = handlePlaceSelectEvent;
      autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelectEvent);
      // --- End Event Listener Setup ---

      // --- Apply input setup and add input listener ---
      const inputElement = autocompleteElement.querySelector('input');
      if (inputElement) {
        inputRef.current = inputElement;
        inputElement.placeholder = "Enter address";
        inputElement.required = true;
        if (inputValue && !inputElement.value) {
          inputElement.value = inputValue;
        }

        // Add Input Event Listener 
        inputElement.addEventListener('input', handleInputChange);
      }
      // --- End Apply input setup ---

      // Return the cleanup function from useEffect
      return () => {
        if (placeSelectListenerRef.current) {
          autocompleteElement.removeEventListener('gmp-placeselect', placeSelectListenerRef.current);
          placeSelectListenerRef.current = null;
        }
        // Cleanup input listener - check inputElement again
        // Re-find inputElement or rely on closure? Relying on closure is safer here.
        if (inputElement) {
          inputElement.removeEventListener('input', handleInputChange);
        }
      };
    }
  }, [autocompleteNode, isLoaded, onPlaceSelect, setInputValue, destinationCoordinates, inputValue]);
  // --- End useEffect for Setup and Cleanup ---

  // --- Enhanced Error Handling ---
  if (loadError) {
    console.error("[LocationAutocomplete] Google Maps Load Error:", loadError); // Log the specific error
    toast({
      title: "Address Lookup Error",
      description: "Could not load Google Maps Autocomplete. Please check console or try again later.",
      variant: "destructive",
    });
    // Render a clear error message instead of just a disabled input
    return (
      <div className="p-2 border border-destructive bg-destructive/10 rounded-md text-destructive">
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
      />
    );
  }
  // --- End Enhanced Error Handling ---

  // --- End Error Handling --- 

  // --- Render the VISIBLE controlled input AND the HIDDEN Google component --- 
  return (
    <>
      <Input
        ref={inputRef} // Attach ref if needed elsewhere
        type="text"
        placeholder="Enter address"
        required
        value={inputValue} // Controlled by parent state
        onChange={(e) => setInputValue(e.target.value)} // Directly update parent state
        className="w-full" // Ensure it takes full width
      />
      {/* Render the Google component but hide it */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}> {/* Better hiding method */}
        <gmp-place-autocomplete
          ref={autocompleteCallbackRef}
        // No need for class="w-full" if hidden
        >
        </gmp-place-autocomplete>
      </div>
    </>
  );
};

export default LocationAutocomplete; 