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

  // New state for file handling
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  if (!currentUser) return null;

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <header className="bg-neu-red text-white p-4 flex items-center">
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

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <LocationAutocomplete
              onPlaceSelect={handlePlaceSelect}
              inputValue={locationInputValue} // Pass state value
              setInputValue={setLocationInputValue} // Pass state setter
              destinationCoordinates={NEU_COORDINATES}
            />
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
              Description (max 200 characters)
            </label>
            <Textarea
              id="description"
              placeholder="Describe your sublet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {description.length}/200
            </p>
          </div>
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-neu-red hover:bg-neu-red/90"
            disabled={isSubmitting}
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
