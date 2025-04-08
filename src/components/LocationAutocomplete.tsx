import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

// No need for custom element declaration if using programmatic instantiation

const libraries: ("places" | "routes" | "marker")[] = ["places", "routes", "marker"]; // Added marker library based on example

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
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  // Ref for the container div
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Ref for the autocomplete instance
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  // Ref for the internal input element
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  // Refs for listeners to aid cleanup
  const placeSelectListenerRef = useRef<any | null>(null); // Using any for listener type due to potential SDK nuances
  const inputListenerRef = useRef<any | null>(null);


  // useEffect for creating and managing the autocomplete element
  useEffect(() => {
    // Ensure Google Maps API is loaded and container exists
    if (isLoaded && google.maps && google.maps.places && containerRef.current) {
      const container = containerRef.current;

      // Prevent re-initialization if already done
      if (autocompleteRef.current) return;

      // Programmatically create the Autocomplete Element with empty options
      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({});
      autocompleteRef.current = placeAutocomplete;

      // Append the element to the container
      container.innerHTML = ''; // Clear container first
      container.appendChild(placeAutocomplete);

      // --- Find the internal input element --- (Crucial step)
      // We need to wait briefly for the component to render its internals
      const findInputInterval = setInterval(() => {
        const inputElement = placeAutocomplete.querySelector('input');
        if (inputElement) {
          clearInterval(findInputInterval); // Stop polling
          internalInputRef.current = inputElement;

          // Apply necessary attributes & styles
          inputElement.placeholder = "Enter address";
          inputElement.required = true;
          inputElement.style.outline = 'none';
          inputElement.style.border = 'none';
          inputElement.style.backgroundColor = 'transparent';
          inputElement.style.width = '100%';
          inputElement.style.height = '100%';

          // Set initial value if provided
          if (inputValue && !inputElement.value) {
            inputElement.value = inputValue;
          }

          // --- Add Input Listener --- (Only after input is found)
          const handleInputChange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            setInputValue(target.value);
          };
          inputListenerRef.current = handleInputChange;
          inputElement.addEventListener('input', handleInputChange);
        }
      }, 50); // Poll every 50ms
      // --- End Find Internal Input --- 

      // --- Add Place Select Listener --- (Using gmp-select)
      const handlePlaceSelect = async (event: any) => { // Use 'any' for event type from custom element
        const placePrediction = event.placePrediction as google.maps.places.PlacePrediction | undefined;
        if (!placePrediction) return;

        const place = placePrediction.toPlace();
        try {
          await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] });

          // Validate required fields
          if (place.location && typeof place.formattedAddress === 'string' && place.formattedAddress.length > 0) {
            // Update parent state
            setInputValue(place.formattedAddress);

            // Update internal input visually (might be redundant if controlled pattern works)
            if (internalInputRef.current) {
              internalInputRef.current.value = place.formattedAddress;
            }

            // Calculate distance
            const originCoords = {
              lat: place.location.lat(),
              lng: place.location.lng(),
            };
            const distance = await calculateDistance(originCoords, destinationCoordinates);
            onPlaceSelect(place, distance); // Pass the fetched Place object

          } else {
            console.warn("Fetched place lacked location or formattedAddress:", place);
            toast({ title: "Invalid Selection", description: "Selected item lacks required details.", variant: "destructive" });
            onPlaceSelect(null, null);
          }
        } catch (error) {
          console.error("Error fetching place details or calculating distance:", error);
          toast({ title: "Error", description: "Could not retrieve place details.", variant: "destructive" });
          onPlaceSelect(null, null);
        }
      };
      placeSelectListenerRef.current = handlePlaceSelect;
      placeAutocomplete.addEventListener('gmp-select', handlePlaceSelect);
      // --- End Place Select Listener ---

      // --- calculateDistance function (nested or outside) ---
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
      // --- End calculateDistance ---

      // --- Cleanup function --- 
      return () => {
        clearInterval(findInputInterval); // Clear polling interval
        if (placeSelectListenerRef.current && autocompleteRef.current) {
          autocompleteRef.current.removeEventListener('gmp-select', placeSelectListenerRef.current);
        }
        if (inputListenerRef.current && internalInputRef.current) {
          internalInputRef.current.removeEventListener('input', inputListenerRef.current);
        }
        // Optional: Remove the element itself from the DOM if containerRef.current exists?
        // Usually React handles component unmount cleanup well, but explicit removal can be added.
        // if (containerRef.current && autocompleteRef.current) {
        //    containerRef.current.removeChild(autocompleteRef.current);
        // }
        autocompleteRef.current = null;
        internalInputRef.current = null;
        placeSelectListenerRef.current = null;
        inputListenerRef.current = null;
      };
    }
  }, [isLoaded]); // Run only when isLoaded changes

  // Effect to sync input value when parent state changes (Controlled Component Part)
  useEffect(() => {
    if (internalInputRef.current && internalInputRef.current.value !== inputValue) {
      internalInputRef.current.value = inputValue;
    }
  }, [inputValue]);


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
    <div ref={containerRef}>
      {/* Autocomplete element will be appended here by useEffect */}
    </div>
  );
};

export default LocationAutocomplete; 