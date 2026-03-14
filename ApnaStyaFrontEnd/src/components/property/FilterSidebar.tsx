import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

const amenitiesList = ["Wi-Fi", "Parking", "AC", "Food", "Security", "Gym", "Swimming Pool", "Laundry"];

export interface Filters {
  priceRange: [number, number];
  propertyType: string;
  furnishing: string;
  amenities: string[];
}

export const defaultFilters: Filters = {
  priceRange: [0, 10000000],
  propertyType: "all",
  furnishing: "all",
  amenities: [],
};

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const FilterSidebar = ({ filters, onChange }: FilterSidebarProps) => {
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

  const toggleAmenity = (amenity: string) => {
    const next = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    update({ amenities: next });
  };

  const hasActiveFilters =
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 10000000 ||
    filters.propertyType !== "all" ||
    filters.furnishing !== "all" ||
    filters.amenities.length > 0;

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-base font-bold text-card-foreground">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => onChange(defaultFilters)}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Price */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Price Range (₹/month)</Label>
        <Slider
          min={0}
          max={10000000}
          step={10000}
          value={filters.priceRange}
          onValueChange={(v) => update({ priceRange: v as [number, number] })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹{filters.priceRange[0].toLocaleString()}</span>
          <span>₹{filters.priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {/* Property type */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Property Type</Label>
        <Select value={filters.propertyType} onValueChange={(v) => update({ propertyType: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Flat">Flat</SelectItem>
            <SelectItem value="PG">PG</SelectItem>
            <SelectItem value="Co-living">Co-living</SelectItem>
            <SelectItem value="Hostel">Hostel</SelectItem>
            <SelectItem value="Villa">Villa</SelectItem>
            <SelectItem value="Room">Room</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Furnishing */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Furnishing</Label>
        <Select value={filters.furnishing} onValueChange={(v) => update({ furnishing: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Fully Furnished">Fully Furnished</SelectItem>
            <SelectItem value="Semi Furnished">Semi Furnished</SelectItem>
            <SelectItem value="Unfurnished">Unfurnished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Amenities</Label>
        <div className="space-y-2">
          {amenitiesList.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <Checkbox
                id={`amenity-${a}`}
                checked={filters.amenities.includes(a)}
                onCheckedChange={() => toggleAmenity(a)}
              />
              <Label htmlFor={`amenity-${a}`} className="text-sm font-normal text-muted-foreground cursor-pointer">
                {a}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
