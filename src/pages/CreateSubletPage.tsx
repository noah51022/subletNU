
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, ImagePlus, Plus, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CreateSubletPage = () => {
  const { currentUser, addSublet } = useApp();
  const navigate = useNavigate();
  
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [distanceFromNEU, setDistanceFromNEU] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [genderPreference, setGenderPreference] = useState<"male" | "female" | "any">("any");
  const [pricingType, setPricingType] = useState<"firm" | "negotiable">("firm");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
    }
  }, [currentUser, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please add at least one photo.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      addSublet({
        price: parseFloat(price),
        location,
        distanceFromNEU: parseFloat(distanceFromNEU),
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        photos,
        genderPreference,
        pricingType,
        amenities,
      });
      
      toast({
        title: "Sublet Posted",
        description: "Your sublet has been posted successfully.",
      });
      
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post your sublet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPhoto = () => {
    // In a real app, we would upload a photo here
    // For this demo, we'll use placeholder images
    const demoPhotos = [
      "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1721322800607-8c38375eef04?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    ];
    
    if (photos.length < 5) {
      const randomIndex = Math.floor(Math.random() * demoPhotos.length);
      setPhotos([...photos, demoPhotos[randomIndex]]);
    } else {
      toast({
        title: "Maximum Photos",
        description: "You can only add up to 5 photos.",
        variant: "destructive",
      });
    }
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim() === "") return;
    
    if (amenities.includes(newAmenity.trim())) {
      toast({
        title: "Duplicate Amenity",
        description: "This amenity is already added.",
        variant: "destructive",
      });
      return;
    }
    
    setAmenities([...amenities, newAmenity.trim()]);
    setNewAmenity("");
  };

  const handleRemoveAmenity = (index: number) => {
    const updatedAmenities = [...amenities];
    updatedAmenities.splice(index, 1);
    setAmenities(updatedAmenities);
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
          <div>
            <h2 className="text-lg font-bold mb-4">Photos (1-5)</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded overflow-hidden">
                  <img src={photo} alt={`Sublet ${index}`} className="w-full h-full object-cover" />
                </div>
              ))}
              
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="aspect-square rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-neu-red"
                >
                  <ImagePlus className="text-gray-400" />
                </button>
              )}
            </div>
            {photos.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Add at least one photo (required)</p>
            )}
          </div>
          
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
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Huntington Ave"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="distance" className="text-sm font-medium">
              Distance from Northeastern (miles)
            </label>
            <Input
              id="distance"
              type="number"
              step="0.1"
              placeholder="e.g., 0.5"
              value={distanceFromNEU}
              onChange={(e) => setDistanceFromNEU(e.target.value)}
              required
            />
          </div>
          
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
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Amenities
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="e.g., High-speed WiFi, Gym access"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleAddAmenity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {amenities.map((amenity, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="flex items-center"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(index)}
                      className="ml-1 rounded-full hover:bg-gray-200 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
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
