import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { CalendarIcon, ArrowLeft, Loader2, Share2 } from "lucide-react";
import { CalendarIcon as CalendarIcon2 } from "lucide-react";
import AmenitiesSelector from "@/components/AmenitiesSelector";
import LocationAutocomplete from "@/components/LocationAutocomplete";

// Define Northeastern University coordinates
const NEU_COORDINATES = { lat: 42.3398, lng: -71.0892 };

const EditSubletPage = () => {
  const { subletId } = useParams<{ subletId: string }>();
  const { currentUser, sublets, updateSublet } = useApp();
  const navigate = useNavigate();

  const sublet = sublets.find(s => s.id === subletId);

  const [price, setPrice] = useState("");
  const [locationInputValue, setLocationInputValue] = useState("");
  const [distanceFromNEU, setDistanceFromNEU] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [genderPreference, setGenderPreference] = useState<"male" | "female" | "any">("any");
  const [pricingType, setPricingType] = useState<"firm" | "negotiable">("firm");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noBrokersFee, setNoBrokersFee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load sublet data
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (sublet) {
      setPrice(String(sublet.price));
      setLocationInputValue(sublet.location);
      setDistanceFromNEU(String(sublet.distanceFromNEU));
      setDescription(sublet.description);
      setStartDate(new Date(sublet.startDate));
      setEndDate(new Date(sublet.endDate));
      setPhotos(sublet.photos);
      setGenderPreference(sublet.genderPreference);
      setPricingType(sublet.pricingType);
      setAmenities(sublet.amenities || []);
      setNoBrokersFee(sublet.noBrokersFee || false);
      setIsLoading(false);
    } else {
      // Sublet not found or doesn't belong to user
      toast({
        title: "Error",
        description: "Listing not found or you don't have permission to edit it",
        variant: "destructive",
      });
      navigate('/profile');
    }
  }, [currentUser, navigate, sublet]);

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

  // Add handlePlaceSelect callback (similar to CreateSubletPage)
  const handlePlaceSelect = useCallback((place: google.maps.places.Place | null, distanceInMiles: number | null) => {
    // LocationAutocomplete calls setLocationInputValue internally via prop
    if (place && place.formattedAddress) {
      if (distanceInMiles !== null) {
        const roundedDistance = distanceInMiles.toFixed(1);
        setDistanceFromNEU(roundedDistance);
        toast({
          title: "Distance Calculated",
          description: `Set distance to approx. ${roundedDistance} miles from NEU.`, // Simplified toast
          variant: "default",
        });
      } else {
        setDistanceFromNEU("0"); // Reset distance if calculation failed
        toast({
          title: "Distance Calculation Failed",
          description: "Could not automatically calculate distance. Using 0 miles.",
          variant: "default",
        });
      }
    } else {
      // Place is null or invalid, reset distance
      setDistanceFromNEU("0");
      if (place) { // Only toast error if place existed but was invalid
        toast({
          title: "Address Error",
          description: "Could not get a valid address from the selection.",
          variant: "destructive",
        });
      }
      // No toast if place was null (input cleared)
    }
  }, [setDistanceFromNEU]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !sublet) return;

    if (isSubmitting) return;

    // Basic validation
    if (!price || !locationInputValue || !distanceFromNEU || !description || !startDate || !endDate || photos.length === 0) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields (including selecting a valid location) and upload at least one photo",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parseFloat(distanceFromNEU)) || parseFloat(distanceFromNEU) <= 0) {
      toast({
        title: "Invalid Distance",
        description: "Please enter a valid distance from NEU",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Use updateSublet from context
      await updateSublet(sublet.id, {
        price: parseFloat(price),
        location: locationInputValue,
        distanceFromNEU: parseFloat(distanceFromNEU),
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        photos,
        genderPreference: genderPreference,
        pricingType: pricingType,
        amenities,
        noBrokersFee: noBrokersFee,
      });

      toast({
        title: "Listing Updated",
        description: "Your listing has been successfully updated",
      });

      navigate('/profile');
    } catch (error: any) {
      console.error("Error updating sublet:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update your listing",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle copying the link
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "The listing link has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy link: ", err);
      toast({
        title: "Error",
        description: "Could not copy the link.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neu-red" />
        <p className="mt-4 text-gray-600">Loading listing details...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <header className="bg-neu-red text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-neu-red/80"
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-bold ml-2">Edit Listing</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-neu-red/80"
          onClick={handleShare}
        >
          <Share2 />
        </Button>
      </header>

      <form className="p-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-medium">
            Monthly Price ($) *
          </label>
          <Input
            id="price"
            type="number"
            placeholder="1000"
            min="1"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium">
            Location *
          </label>
          <LocationAutocomplete
            onPlaceSelect={handlePlaceSelect}
            inputValue={locationInputValue}
            setInputValue={setLocationInputValue}
            destinationCoordinates={NEU_COORDINATES}
          />
          <p className="text-xs text-gray-500 mt-1">
            Start typing and select an address from the suggestions.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="distanceFromNEU" className="text-sm font-medium">
            Distance from NEU (miles) *
          </label>
          <Input
            id="distanceFromNEU"
            type="number"
            placeholder="0.5"
            min="0"
            step="0.1"
            value={distanceFromNEU}
            onChange={(e) => setDistanceFromNEU(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Availability Period *</label>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon2 className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon2 className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>End date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) =>
                      startDate ? date < startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Gender Preference</label>
          <Select
            value={genderPreference}
            onValueChange={(value) => setGenderPreference(value as "male" | "female" | "any")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">For males</SelectItem>
              <SelectItem value="female">For females</SelectItem>
              <SelectItem value="any">No preference</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pricing Type</label>
          <Select
            value={pricingType}
            onValueChange={(value) => setPricingType(value as "firm" | "negotiable")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Firm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="firm">Firm Price</SelectItem>
              <SelectItem value="negotiable">Negotiable Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        <div className="space-y-2">
          <label className="text-sm font-medium">Amenities</label>
          <AmenitiesSelector
            selectedAmenities={amenities}
            onChange={setAmenities}
          />
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

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description (max 200 characters) *
          </label>
          <Textarea
            id="description"
            placeholder="Describe your sublet..."
            maxLength={200}
            className="h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="text-xs text-gray-500 text-right">
            {description.length}/200
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/profile')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            className="bg-neu-red hover:bg-red-800"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Listing"
            )}
          </Button>
        </div>
      </form>

      <BottomNav />
    </div>
  );
};

export default EditSubletPage;
