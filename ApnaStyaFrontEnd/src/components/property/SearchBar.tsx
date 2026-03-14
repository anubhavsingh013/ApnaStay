import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Search, MapPin, Home, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const locationSuggestions = [
  "Mumbai, Maharashtra", "Pune, Maharashtra", "Bangalore, Karnataka", "Chennai, Tamil Nadu",
  "Hyderabad, Telangana", "Delhi NCR", "Noida, Uttar Pradesh", "Gurgaon, Haryana",
  "Kolkata, West Bengal", "Ahmedabad, Gujarat", "Jaipur, Rajasthan", "Lucknow, Uttar Pradesh",
  "Whitefield, Bangalore", "Koramangala, Bangalore", "Andheri, Mumbai", "Bandra, Mumbai",
  "Indiranagar, Bangalore", "HSR Layout, Bangalore", "Powai, Mumbai", "Hinjewadi, Pune",
];

const trendingLocations = ["Koramangala, Bangalore", "Bandra, Mumbai", "Hinjewadi, Pune", "Gurgaon, Haryana"];

/** Canonical property types matching Property.type in data */
export const PROPERTY_TYPE_OPTIONS = [
  { value: "Flat", label: "Flat" },
  { value: "PG", label: "PG" },
  { value: "Co-living", label: "Co-living" },
  { value: "Hostel", label: "Hostel" },
  { value: "Villa", label: "Villa" },
] as const;

export interface SearchBarRef {
  focusInput: () => void;
}

export interface SearchBarProps {
  /** Controlled property type filter; empty string = all */
  propertyType?: string;
  /** Called when user selects a property type (empty string = clear) */
  onPropertyTypeChange?: (value: string) => void;
  /** Called when user clicks the search button (e.g. to apply filters / scroll) */
  onSearch?: (params: { location: string; propertyType: string }) => void;
  /** Initial location value (e.g. from URL) */
  initialLocation?: string;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(({ propertyType = "", onPropertyTypeChange, onSearch, initialLocation = "" }, ref) => {
  const [location, setLocation] = useState(initialLocation);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    },
  }));

  const filtered = location.length > 0
    ? locationSuggestions.filter(s => s.toLowerCase().includes(location.toLowerCase()))
    : [];

  const displayList = location.length > 0 ? filtered : trendingLocations;
  const listLabel = location.length > 0 ? null : "Trending locations";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setHighlightIdx(-1);
  }, [location]);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || displayList.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % displayList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + displayList.length) % displayList.length);
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      setLocation(displayList[highlightIdx]);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectLocation = (s: string) => {
    setLocation(s);
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full" ref={wrapperRef}>
      {/* Row: location + type + search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        {/* Location input */}
        <div className="flex-1 relative">
          <div className={`flex items-center gap-2 h-11 px-3 rounded-xl bg-background border transition-all duration-200 ${
            showSuggestions ? "border-primary ring-2 ring-primary/20" : "border-border/50"
          }`}>
            <MapPin className={`h-4 w-4 shrink-0 transition-colors ${showSuggestions ? "text-primary" : "text-muted-foreground"}`} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter city, area, or locality..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
            />
            {location && (
              <button onClick={() => { setLocation(""); inputRef.current?.focus(); }} className="p-0.5 rounded-full hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && displayList.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {listLabel && (
                <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <TrendingUp className="h-3 w-3" />
                  {listLabel}
                </div>
              )}
              {displayList.map((s, i) => (
                <button
                  key={s}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    i === highlightIdx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onClick={() => selectLocation(s)}
                >
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property type select */}
        <Select
          value={propertyType || "all"}
          onValueChange={(v) => onPropertyTypeChange?.(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl bg-background border border-border/50 hover:border-primary/50 transition-all">
            <Home className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search button */}
        <Button
          type="button"
          className="gradient-teal border-0 text-primary-foreground rounded-xl h-11 px-5 hover:opacity-90 transition-all w-full sm:w-auto"
          onClick={() => onSearch?.({ location, propertyType: propertyType || "" })}
        >
          <Search className="h-4 w-4 sm:mr-0 mr-2" />
          <span className="sm:hidden">Search</span>
        </Button>
      </div>
    </div>
  );
});

SearchBar.displayName = "SearchBar";

export default SearchBar;
