import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSublet } from "@/contexts/SubletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, ImagePlus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import BottomNav from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { format, differenceInCalendarMonths } from "date-fns";
import AmenitiesSelector from "@/components/AmenitiesSelector";
import LocationAutocomplete from "@/components/LocationAutocomplete";

// Define Northeastern University coordinates
const NEU_COORDINATES = { lat: 42.3398, lng: -71.0892 };

// Add custom element type for Google Maps Place Autocomplete Element
// @ts-ignore
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmpx-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { placeholder?: string };
    }
  }
}

const CreateSubletPage = () => {
  const { currentUser } = useAuth();
  const { addSublet, uploadPhoto } = useSublet();
  const navigate = useNavigate();

  const [price, setPrice] = useState("");
  const [locationInputValue, setLocationInputValue] = useState("");
  const [distanceFromNEU, setDistanceFromNEU] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [genderPreference, setGenderPreference] = useState<"male" | "female" | "any">("any");
  const [pricingType, setPricingType] = useState<"firm" | "negotiable">("firm");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noBrokersFee, setNoBrokersFee] = useState(false);
  // CAPTCHA: Commented out for development
  // const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Add state for social media handles
  const [instagramHandle, setInstagramHandle] = useState("");
  const [snapchatHandle, setSnapchatHandle] = useState("");

  // New state for file handling
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // CAPTCHA: Commented out for development
  // const turnstileRef = useRef<HTMLDivElement>(null);
  // const widgetIdRef = useRef<string | null>(null);

  // Ref for the Google Places input
  const googlePlacesInputRef = useRef<HTMLInputElement | null>(null);

  // Add state to track if Google Maps and the custom element are ready
  const [mapsReady, setMapsReady] = useState(false);

  // Flag to toggle new autocomplete (set to true for production, false for localhost fallback)
  const useNewAutocomplete = !(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Ref for classic input
  const classicInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
    }
  }, [currentUser, navigate]);

  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    const previews = photoPreviews; // Capture current previews
    return () => {
      previews.forEach(URL.revokeObjectURL);
    };
  }, [photoFiles]); // Depend on photoFiles to trigger cleanup when files change

  // Calculate total cost based on price and date range
  const totalCost = useMemo(() => {
    if (!startDate || !endDate || !price || isNaN(parseFloat(price))) {
      return null;
    }

    // Calculate number of months (rounded up for partial months)
    const months = differenceInCalendarMonths(endDate, startDate) + 1;

    // Calculate total
    return parseFloat(price) * months;
  }, [startDate, endDate, price]);

  // Classic Autocomplete fallback effect
  useEffect(() => {
    if (useNewAutocomplete) return;
    function loadScript(src: string, id: string) {
      if (document.getElementById(id)) return;
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.async = true;
      document.body.appendChild(script);
    }
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    loadScript(
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
      'google-maps-script-classic'
    );
    function initClassicAutocomplete() {
      if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) {
        setTimeout(initClassicAutocomplete, 300);
        return;
      }
      const input = classicInputRef.current;
      if (!input) return;
      const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
        types: ['geocode'],
        componentRestrictions: { country: 'us' },
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address && place.geometry && place.geometry.location) {
          setLocationInputValue(place.formatted_address);
          // Calculate distance from NEU
          const placeLat = place.geometry.location.lat();
          const placeLng = place.geometry.location.lng();
          const R = 3958.8; // Radius of Earth in miles
          const dLat = (NEU_COORDINATES.lat - placeLat) * Math.PI / 180;
          const dLng = (NEU_COORDINATES.lng - placeLng) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(placeLat * Math.PI / 180) *
            Math.cos(NEU_COORDINATES.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          setDistanceFromNEU(distance.toFixed(1));
        }
      });
    }
    setTimeout(initClassicAutocomplete, 500);
  }, [useNewAutocomplete]);

  // Update handlePlaceSelect to accept the newer Place type
  const handlePlaceSelect = useCallback((place: google.maps.places.Place | null, distanceInMiles: number | null) => {
    // LocationAutocomplete already called setInputValue with the formatted address.
    // This function now only needs to handle the distance calculation result.
    // Use place.formattedAddress (available on Place type)
    if (place && place.formattedAddress) {
      // REMOVED: setLocationInputValue(place.formatted_address);

      if (distanceInMiles !== null) {
        const roundedDistance = distanceInMiles.toFixed(1);
        setDistanceFromNEU(roundedDistance);
        toast({
          title: "Distance Calculated",
          description: `Set distance to approx. ${roundedDistance} miles from NEU. You can adjust if needed.`,
          variant: "default",
        });
      } else {
        // If distance calculation failed for a valid place, set to "0" or "N/A"
        setDistanceFromNEU("0");
        toast({
          title: "Distance Calculation Failed",
          description: "Could not automatically calculate distance. Using 0 miles. Please adjust if needed.",
          variant: "default",
        });
      }
    } else {
      // If place is null or invalid, also set distance to "0" or "N/A"
      // Keep the potentially manually typed locationInputValue
      setDistanceFromNEU("0");
      if (place) { // Only toast error if place existed but was invalid
        toast({
          title: "Address Error",
          description: "Could not get a valid address from the selection. The place object was incomplete.",
          variant: "destructive",
        });
      }
      // No toast if place was null (likely just cleared input)
    }
  }, [setDistanceFromNEU]); // Remove setLocationInputValue from dependencies

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    const currentPhotoCount = photoFiles.length;
    const remainingSlots = 5 - currentPhotoCount;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Photos",
        description: `You can only add ${remainingSlots} more photo(s).`,
        variant: "destructive",
      });
    }

    filesToProcess.forEach(file => {
      // Basic validation (e.g., type and size)
      if (file.type.startsWith('image/')) { // Check if it's an image
        if (photoFiles.length + newFiles.length < 5) {
          newFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      } else {
        toast({
          title: "Invalid File Type",
          description: `File "${file.name}" is not a supported image type.`,
          variant: "destructive",
        });
      }
    });

    setPhotoFiles(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);

    // Clear the input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle photo removal
  const handleRemovePhoto = (indexToRemove: number) => {
    // Revoke the object URL before removing the preview
    URL.revokeObjectURL(photoPreviews[indexToRemove]);

    setPhotoFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // CAPTCHA: Commented out for development
  /*
  // Handle Turnstile callback
  const handleCaptchaCallback = useCallback((token: string) => {
    console.log("Captcha callback received");
    setCaptchaToken(token);
  }, []);

  // Initialize or reset Turnstile
  const initTurnstile = useCallback(() => {
    if (turnstileRef.current) {
      try {
        // Clean up previous widget if it exists
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
          setCaptchaToken(null);
        }

        const initWidget = () => {
          if (!window.turnstile) {
            console.log("Waiting for Turnstile to load...");
            setTimeout(initWidget, 500);
            return;
          }

          if (!turnstileRef.current || widgetIdRef.current) {
            return; // Don't initialize if ref is gone or widget already exists
          }

          console.log("Initializing Turnstile with site key:", import.meta.env.VITE_CAPTCHA_SITE_KEY);

          try {
            widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
              sitekey: import.meta.env.VITE_CAPTCHA_SITE_KEY,
              callback: (token) => {
                console.log("Turnstile verification successful");
                setCaptchaToken(token);
              },
              'refresh-expired': 'manual',
              theme: 'light',
              'error-callback': (error) => {
                console.error("Turnstile error:", error);
                setCaptchaToken(null);
                // Only reset if the widget still exists
                if (widgetIdRef.current && window.turnstile) {
                  try {
                    window.turnstile.reset(widgetIdRef.current);
                  } catch (e) {
                    console.error("Error resetting widget:", e);
                    // If reset fails, remove and reinit
                    window.turnstile.remove(widgetIdRef.current);
                    widgetIdRef.current = null;
                    setTimeout(initWidget, 1000);
                  }
                }
              },
              'expired-callback': () => {
                console.log("Turnstile token expired");
                setCaptchaToken(null);
                if (widgetIdRef.current && window.turnstile) {
                  window.turnstile.reset(widgetIdRef.current);
                }
              }
            });
          } catch (error) {
            console.error("Error during widget render:", error);
            widgetIdRef.current = null;
            setTimeout(initWidget, 1000);
          }
        };

        // Start initialization process
        initWidget();
      } catch (error) {
        console.error("Error in initTurnstile:", error);
        widgetIdRef.current = null;
        setTimeout(initTurnstile, 1000);
      }
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
        setCaptchaToken(null);
      } catch (error) {
        console.error("Error cleaning up Turnstile:", error);
      }
    }
  }, []);

  // Initialize Turnstile when component mounts
  useEffect(() => {
    // Initial delay to ensure script has started loading
    const timer = setTimeout(initTurnstile, 1000);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [initTurnstile, cleanup]);
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CAPTCHA: Commented out for development
    /*
    // Add check for captcha token
    if (!captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the captcha verification.",
        variant: "destructive",
      });
      return;
    }
    */

    // Add check for distance field being filled (either auto or manual)
    if (!distanceFromNEU) {
      toast({
        title: "Missing Distance",
        description: "Please enter or calculate the distance from Northeastern.",
        variant: "destructive",
      });
      return;
    }

    // Validate using the input value state
    if (!locationInputValue) {
      toast({
        title: "Missing Location",
        description: "Please enter or select a valid address.", // Updated message
        variant: "destructive",
      });
      return;
    }
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    if (photoFiles.length === 0) {
      toast({
        title: "No Photos",
        description: "Please add at least one photo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // CAPTCHA: Commented out for development
      /*
      // Verify captcha token
      const verifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          token: captchaToken,
        }),
      });

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.success) {
        toast({
          title: "Verification Failed",
          description: "Please complete the captcha verification again.",
          variant: "destructive",
        });
        if (window.turnstile) {
          window.turnstile.reset();
        }
        setIsSubmitting(false);
        return;
      }
      */

      // Add user check
      if (!currentUser) {
        toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      // ... photo upload logic ...
      const uploadedPhotoUrls: string[] = [];
      for (const file of photoFiles) {
        try {
          const publicUrl = await uploadPhoto(file, currentUser.id);
          if (publicUrl) {
            uploadedPhotoUrls.push(publicUrl);
          } else {
            throw new Error(`Failed to upload ${file.name}.`);
          }
        } catch (uploadError) {
          console.error("Error uploading photo:", uploadError);
          toast({
            title: "Photo Upload Error",
            description: (uploadError as Error)?.message || `Failed to upload ${file.name}. Please try again.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      // --- End Upload Photos ---

      // Use locationInputValue for the submission
      const distanceToSend = parseFloat(distanceFromNEU) || 0; // Default to 0 if parsing fails or it was "0"

      await addSublet({
        price: parseFloat(price),
        location: locationInputValue, // Use the input value state
        distanceFromNEU: distanceToSend, // Send the parsed number
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        photos: uploadedPhotoUrls,
        genderPreference,
        pricingType,
        amenities,
        noBrokersFee,
        // Add handles to submission data
        instagramHandle: instagramHandle.trim() || undefined, // Send undefined if empty
        snapchatHandle: snapchatHandle.trim() || undefined,   // Send undefined if empty
      });

      navigate('/');
    } catch (error) {
      console.error("Error posting sublet:", error);
      toast({
        title: "Error",
        description: "Failed to post your sublet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    function checkReady() {
      if (
        (window as any).google &&
        (window as any).google.maps &&
        customElements.get('gmpx-place-autocomplete')
      ) {
        setMapsReady(true);
      } else {
        setTimeout(checkReady, 200);
      }
    }
    checkReady();
  }, []);

  if (!currentUser) return null;

  return (
    <div className="pb-20 mx-auto w-full max-w-[90%] md:max-w-4xl lg:max-w-6xl">
      <header className="bg-neu-red text-white p-4 flex items-center rounded-b-lg">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-neu-red/80"
          onClick={() => navigate('/')}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold ml-2">Post a Sublet</h1>
      </header>

      <div className="p-4 md:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
          {/* ... photos, price ... */}
          {/* Photos Div */}
          <div>
            <h2 className="text-lg font-bold mb-4">Photos (1-5)</h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              id="photo-upload"
            />
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((previewUrl, index) => (
                <div key={index} className="relative aspect-square rounded overflow-hidden group">
                  <img src={previewUrl} alt={`Sublet Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {photoFiles.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-neu-red cursor-pointer"
                >
                  <ImagePlus className="text-gray-400" />
                </button>
              )}
            </div>
            {photoFiles.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Add at least one photo (required)</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {photoFiles.length}/5 photos added.
            </p>
          </div>
          {/* Price Div */}
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price ($/month)
            </label>
            <Input
              id="price"
              type="number"
              placeholder="e.g., 750"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              max="6000"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <div className="w-full">
              {useNewAutocomplete && mapsReady ? (
                <gmpx-place-autocomplete
                  id="google-places-autocomplete-element"
                  placeholder="Start typing and select an address from the suggestions."
                ></gmpx-place-autocomplete>
              ) : (
                <input
                  ref={classicInputRef}
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neu-red"
                  placeholder="Start typing and select an address from the suggestions."
                  value={locationInputValue}
                  onChange={e => setLocationInputValue(e.target.value)}
                  autoComplete="off"
                />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Start typing and select an address from the suggestions.
            </p>
          </div>

          {/* ... distance, gender, etc. ... */}
          {/* Distance Div */}
          <div className="space-y-2">
            <label htmlFor="distance" className="text-sm font-medium">
              Distance from Northeastern (miles)
            </label>
            <Input
              id="distance"
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g., 0.5 (auto-calculates)"
              value={distanceFromNEU}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || parseFloat(value) >= 0) {
                  setDistanceFromNEU(value);
                }
              }}
              required
            />
            <p className="text-xs text-gray-500">Calculated automatically. Adjust if needed.</p>
          </div>
          {/* Gender Preference Div */}
          <div className="space-y-2">
            <label htmlFor="genderPreference" className="text-sm font-medium">
              Gender Preference
            </label>
            <Select
              value={genderPreference}
              onValueChange={(value) => setGenderPreference(value as "male" | "female" | "any")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Open to All</SelectItem>
                <SelectItem value="male">For Guys</SelectItem>
                <SelectItem value="female">For Girls</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Pricing Type Div */}
          <div className="space-y-2">
            <label htmlFor="pricingType" className="text-sm font-medium">
              Pricing Type
            </label>
            <Select
              value={pricingType}
              onValueChange={(value) => setPricingType(value as "firm" | "negotiable")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select pricing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firm">Firm Price</SelectItem>
                <SelectItem value="negotiable">Negotiable Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Broker's Fee Div */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="brokersFee"
              checked={noBrokersFee}
              onCheckedChange={() => setNoBrokersFee(!noBrokersFee)}
            />
            <label
              htmlFor="brokersFee"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              No Broker's Fee
            </label>
          </div>
          {/* Amenities Div */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Amenities
            </label>
            <AmenitiesSelector
              selectedAmenities={amenities}
              onChange={setAmenities}
            />
          </div>
          {/* Dates Div */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Total Cost Display */}
          {totalCost !== null && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-sm text-gray-600">Estimated Total Cost:</div>
              <div className="text-xl font-bold text-neu-red">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-gray-500">
                Based on ${price}/month for {differenceInCalendarMonths(endDate!, startDate!) + 1} month(s)
              </div>
            </div>
          )}
          {/* Description Div */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (max 600 characters)
            </label>
            <Textarea
              id="description"
              placeholder="Describe your sublet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {description.length}/600
            </p>
          </div>
          {/* Add Social Media Inputs */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-md font-semibold text-gray-700">Social Media (Optional)</h3>
            <p className="text-xs text-gray-500">Add your Instagram or Snapchat so interested people can reach out.</p>
            <div className="space-y-2">
              <label htmlFor="instagramHandle" className="text-sm font-medium">
                Instagram Username
              </label>
              <Input
                id="instagramHandle"
                placeholder="e.g., northeastern"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))} // Basic validation
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="snapchatHandle" className="text-sm font-medium">
                Snapchat Username
              </label>
              <Input
                id="snapchatHandle"
                placeholder="e.g., northeasternu"
                value={snapchatHandle}
                onChange={(e) => setSnapchatHandle(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} // Basic validation
                maxLength={15}
              />
            </div>
          </div>
          {/* CAPTCHA: Commented out for development */}
          {/* <div className="flex justify-center mb-4">
            <div ref={turnstileRef} className="cf-turnstile-sublet" />
          </div> */}
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-neu-red hover:bg-neu-red/90"
            disabled={isSubmitting /* || !captchaToken */}
          >
            {isSubmitting ? "Posting..." : "Post Sublet"}
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default CreateSubletPage;
