import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useFilter } from "@/contexts/FilterContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AmenitiesSelector from "@/components/AmenitiesSelector";

const FilterBar = () => {
  const {
    maxPrice,
    maxDistance,
    dateRange,
    genderFilter,
    pricingTypeFilter,
    amenitiesFilter,
    setMaxPrice,
    setMaxDistance,
    setDateRange,
    setGenderFilter,
    setPricingTypeFilter,
    setAmenitiesFilter,
  } = useFilter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(dateRange.start ? new Date(dateRange.start) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(dateRange.end ? new Date(dateRange.end) : undefined);

  const handleMaxPriceChange = (newPrice: number[]) => {
    setMaxPrice(newPrice[0]);
  };

  const handleMaxDistanceChange = (newDistance: number[]) => {
    setMaxDistance(newDistance[0]);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setDateRange({
        ...dateRange,
        start: date.toISOString(),
      });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      setDateRange({
        ...dateRange,
        end: date.toISOString(),
      });
    }
  };

  const clearFilters = () => {
    setMaxPrice(1000);
    setMaxDistance(5);
    setStartDate(undefined);
    setEndDate(undefined);
    setDateRange({ start: null, end: null });
    setGenderFilter("all");
    setPricingTypeFilter("all");
    setAmenitiesFilter([]);
  };

  return (
    <div className="filters-bar">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-4 animate-fade-in">
          <div>
            <label className="text-sm font-medium">Max Price: ${maxPrice}</label>
            <Slider
              defaultValue={[maxPrice]}
              max={6000}
              min={300}
              step={50}
              onValueChange={handleMaxPriceChange}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Max Distance: {maxDistance} miles</label>
            <Slider
              defaultValue={[maxDistance]}
              max={10}
              min={0.5}
              step={0.5}
              onValueChange={handleMaxDistanceChange}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Gender Preference</label>
              <Select
                value={genderFilter}
                onValueChange={(value) => setGenderFilter(value as "male" | "female" | "any" | "all")}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="All preferences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All preferences</SelectItem>
                    <SelectItem value="male">For guys</SelectItem>
                    <SelectItem value="female">For girls</SelectItem>
                    <SelectItem value="any">Open to all</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Pricing Type</label>
              <Select
                value={pricingTypeFilter}
                onValueChange={(value) => setPricingTypeFilter(value as "firm" | "negotiable" | "all")}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="All pricing types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All pricing types</SelectItem>
                    <SelectItem value="firm">Firm price</SelectItem>
                    <SelectItem value="negotiable">Negotiable price</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amenities</label>
            <AmenitiesSelector
              selectedAmenities={amenitiesFilter}
              onChange={setAmenitiesFilter}
            />
          </div>

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <div className="flex-1">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="pt-2 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="w-full"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
