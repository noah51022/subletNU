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

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void; // Allow null for clearing
  initialValue?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ onPlaceSelect, initialValue = "" }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    // Specify the solution channel if required by Google's terms/warnings
    // solutionChannel: 'GMP_visdev_rgmfe_v1', // Example, check Google's docs if needed
  });

  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState(initialValue);

  // Effect to initialize the Autocomplete element once the script is loaded
  useEffect(() => {
    if (!isLoaded || !autocompleteRef.current) return;

    const autocompleteElement = autocompleteRef.current;
    const inputElement = autocompleteElement.querySelector('input');
    if (inputElement) {
      inputRef.current = inputElement;
      // Apply styling/classes to the underlying input if needed
      // For Shadcn UI Input, direct styling might be complex. We'll use the placeholder prop.
      inputElement.placeholder = "Enter address";
      inputElement.required = true;
      // Set initial value if provided
      if (initialValue) {
        inputElement.value = initialValue;
      }
    }

    // Add listener for place selection
    const handlePlaceSelect = (event: Event) => {
      // The event target *is* the autocomplete element
      const element = event.target as google.maps.places.PlaceAutocompleteElement;
      // HACK: Assuming @types/google.maps might be outdated for PlaceAutocompleteElement
      // The official documentation confirms element.getPlace() is correct.
      const place = (element as any).getPlace() as google.maps.places.PlaceResult | undefined;

      if (place?.formatted_address) {
        setInputValue(place.formatted_address); // Update local state if needed
        onPlaceSelect(place);
      } else {
        console.log("Place selected without formatted_address or selection cleared:", place);
        // If user clears input or selects something invalid, potentially clear parent state
        // setInputValue(''); // Optionally clear local input state
        onPlaceSelect(null); // Signal to parent that selection is invalid/cleared
        if (place && !place.formatted_address) {
          toast({
            title: "Invalid Place",
            description: "Selected place doesn't have a valid address.",
            variant: "destructive",
          });
        }
      }
    };

    autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelect);

    // Cleanup: remove event listener
    return () => {
      autocompleteElement.removeEventListener('gmp-placeselect', handlePlaceSelect);
    };
    // Rerun effect if isLoaded changes or if initialValue potentially requires resetting input
  }, [isLoaded, onPlaceSelect, initialValue]);

  // Handle manual input changes - This might conflict with the web component's own input handling
  // It's generally better to rely on the gmp-placeselect event for the final selected value.
  // const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setInputValue(event.target.value);
  //   if (!event.target.value) { // If user clears the input manually
  //       onPlaceSelect(null);
  //   }
  // };

  if (loadError) {
    console.error("Google Maps Load Error:", loadError);
    toast({
      title: "Map Error",
      description: "Could not load Google Maps Autocomplete. Please try again later.",
      variant: "destructive",
    });
    // Render a standard input as fallback, or just an error message
    return (
      <Input
        type="text"
        placeholder="Address lookup unavailable"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)} // Allow manual input if API fails
        disabled={true} // Indicate it's not the autocomplete
        required
      />
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

  // Render the Web Component
  // Note: Direct styling of the web component or its internal input via className might be limited.
  // The component renders its own input internally.
  return (
    <gmp-place-autocomplete
      ref={autocompleteRef}
      // Configure component via attributes
      // place-fields="formatted_address,geometry,name"
      // countries="us,ca" // Example: restrict to US and Canada
      // types="address" // Example: restrict to addresses
      class="w-full" // Apply width or other container styles here
    >
      {/* We don't need to render the Shadcn Input here anymore,
            as the web component provides its own input.
            We could potentially try to slot the Shadcn Input, but it's complex.
            Let's stick to the default input provided by the web component for now.
            If custom styling is crucial, it requires more advanced techniques (Shadow DOM styling).
        */}
    </gmp-place-autocomplete>
  );
};

export default LocationAutocomplete; 