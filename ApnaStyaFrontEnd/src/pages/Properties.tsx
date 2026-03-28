import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher from "@/features/demo/DemoRoleSwitcher";
import SearchBar from "@/components/property/SearchBar";
import { useDemoData } from "@/features/demo/DemoDataContext";
import FilterSidebar, { Filters, defaultFilters } from "@/components/property/FilterSidebar";
import PropertyCard from "@/components/property/PropertyCard";
import { properties, type Property } from "@/constants/properties";
import { getPublicPropertiesFromCache, loadPublicPropertiesCached } from "@/lib/publicListingCache";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Match location query against property location (city, state, area) */
function matchesLocation(prop: Property, locationQuery: string): boolean {
  if (!locationQuery.trim()) return true;
  const q = locationQuery.toLowerCase().trim();
  const loc = [prop.location, prop.city, prop.state].filter(Boolean).join(" ").toLowerCase();
  return loc.includes(q) || q.split(/[,\s]+/).every((part) => loc.includes(part));
}

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = searchParams.get("location") ?? "";
  const typeParam = searchParams.get("type") ?? "";

  const { demoMode } = useDemoData();
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    propertyType: typeParam || "all",
  }));
  const [sortBy, setSortBy] = useState("newest");
  const [searchLocation, setSearchLocation] = useState(locationParam);
  const buildApiParams = (): { city?: string } => {
    const params: { city?: string } = {};
    const parts = locationParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 1 && parts[0]) {
      params.city = parts[0];
    }
    return params;
  };

  const [allProperties, setAllProperties] = useState<Property[]>(() => getPublicPropertiesFromCache(buildApiParams()) ?? []);
  const [loading, setLoading] = useState(() =>
    demoMode ? false : getPublicPropertiesFromCache(buildApiParams()) === undefined,
  );

  useEffect(() => {
    setSearchLocation(locationParam);
    setFilters((f) => ({ ...f, propertyType: typeParam || "all" }));
  }, [locationParam, typeParam]);

  useEffect(() => {
    if (demoMode) {
      setAllProperties(properties);
      setLoading(false);
      return;
    }
    const params = buildApiParams();
    const cached = getPublicPropertiesFromCache(params);
    if (cached !== undefined) {
      setAllProperties(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPublicPropertiesCached(params)
      .then((list) => setAllProperties(list))
      .finally(() => setLoading(false));
  }, [demoMode, locationParam, typeParam]);

  const filtered = useMemo(() => {
    let result = allProperties.filter((p) => {
      if (!matchesLocation(p, searchLocation)) return false;
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (filters.propertyType !== "all" && p.type !== filters.propertyType) return false;
      if (filters.furnishing !== "all" && p.furnishing !== filters.furnishing) return false;
      if (filters.amenities.length > 0 && !filters.amenities.every((a) => p.amenities.some((pa) => pa.toLowerCase().includes(a.toLowerCase())))) return false;
      return true;
    });

    switch (sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      default:
        result = [...result].sort((a, b) => b.id - a.id);
    }

    return result;
  }, [allProperties, filters, sortBy, searchLocation]);

  const handleSearch = (params: { location: string; propertyType: string }) => {
    const next = new URLSearchParams(searchParams);
    if (params.location) next.set("location", params.location); else next.delete("location");
    if (params.propertyType) next.set("type", params.propertyType); else next.delete("type");
    setSearchParams(next, { replace: true });
    setSearchLocation(params.location);
    setFilters((f) => ({ ...f, propertyType: params.propertyType || "all" }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Browse Properties</h1>
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-4 md:p-6 mb-6">
          <SearchBar
            propertyType={filters.propertyType === "all" ? "" : filters.propertyType}
            onPropertyTypeChange={(v) => setFilters((f) => ({ ...f, propertyType: v || "all" }))}
            onSearch={handleSearch}
            initialLocation={searchLocation}
          />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 shrink-0">
            <FilterSidebar filters={filters} onChange={setFilters} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">{filtered.length} properties found</p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                <p className="text-sm text-muted-foreground">Loading properties…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg font-medium text-muted-foreground">No properties match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search to see more results</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filtered.map((p, i) => (
                  <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <PropertyCard property={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Properties;
