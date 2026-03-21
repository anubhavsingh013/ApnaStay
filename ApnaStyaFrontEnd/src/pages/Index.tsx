import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchBar, { SearchBarRef } from "@/components/property/SearchBar";
import PropertyCard from "@/components/property/PropertyCard";
import DemoRoleSwitcher from "@/features/demo/DemoRoleSwitcher";
import DemoModePopup from "@/features/demo/DemoModePopup";
import { useDemoData } from "@/features/demo/DemoDataContext";
import { HomeFeaturedLoadingNotice } from "@/components/home/HomeFeaturedLoadingNotice";
import { FeaturedPropertiesSkeleton } from "@/components/home/FeaturedPropertiesSkeleton";
import { Button } from "@/components/ui/button";
import { properties, type Property } from "@/constants/properties";
import { getFeaturedFromCache, loadFeaturedPropertiesCached } from "@/lib/publicListingCache";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const FEATURED_LOADING_NOTICE_SESSION_KEY = "apnastay_dismiss_featured_loading_notice";

const filterChips = [
  { label: "Flat", key: "type", value: "Flat" },
  { label: "PG", key: "type", value: "PG" },
  { label: "Fully Furnished", key: "furnishing", value: "Fully Furnished" },
  { label: "Semi Furnished", key: "furnishing", value: "Semi Furnished" },
  { label: "Unfurnished", key: "furnishing", value: "Unfurnished" },
];

const Index = () => {
  const navigate = useNavigate();
  const { demoMode } = useDemoData();
  const [activeFilter, setActiveFilter] = useState<{ key: string; value: string } | null>(null);
  const searchBarRef = useRef<SearchBarRef>(null);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>(() => getFeaturedFromCache() ?? []);
  const [featuredLoading, setFeaturedLoading] = useState(() =>
    demoMode ? false : getFeaturedFromCache() === null,
  );
  /** Persist dismiss for the browser tab so revisiting Home doesn’t reopen the toast */
  const [featuredLoadingNoticeDismissed, setFeaturedLoadingNoticeDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(FEATURED_LOADING_NOTICE_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const staticFeatured = properties.filter((p) => p.isFeatured);
  const apiFeatured = featuredProperties;
  const featured = demoMode ? staticFeatured : apiFeatured;

  useEffect(() => {
    if (demoMode) {
      setFeaturedLoading(false);
      return;
    }
    const cached = getFeaturedFromCache();
    if (cached !== null) {
      setFeaturedProperties(cached);
      setFeaturedLoading(false);
      return;
    }
    setFeaturedLoading(true);
    loadFeaturedPropertiesCached()
      .then((list) => setFeaturedProperties(list))
      .finally(() => setFeaturedLoading(false));
  }, [demoMode]);

  const displayProperties = activeFilter
    ? featured.filter((p) => {
        if (activeFilter.key === "type") return p.type === activeFilter.value;
        if (activeFilter.key === "furnishing") return p.furnishing === activeFilter.value;
        return true;
      })
    : featured;

  const handleChipClick = (chip: typeof filterChips[0]) => {
    if (activeFilter?.key === chip.key && activeFilter?.value === chip.value) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ key: chip.key, value: chip.value });
    }
  };

  const searchBarPropertyType = activeFilter?.key === "type" ? activeFilter.value : "";
  const handlePropertyTypeChange = (value: string) => {
    if (!value) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ key: "type", value });
    }
  };

  const handleSearchBarSearch = (params: { location: string; propertyType: string }) => {
    const search = new URLSearchParams();
    if (params.location) search.set("location", params.location);
    if (params.propertyType) search.set("type", params.propertyType);
    navigate(`/properties${search.toString() ? `?${search.toString()}` : ""}`);
  };

  const handleStartSearch = () => {
    const el = document.getElementById("search-bar-section");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setTimeout(() => {
      searchBarRef.current?.focusInput();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      {/* Hero with background image */}
      <section className="relative min-h-[420px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" fetchpriority="high" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-foreground/80" />
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-20 text-center space-y-5">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
          Your Home Your Way
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Subscribe to access premium flats, PGs, hostels, and co-living spaces
          </p>
          <Button
            size="lg"
            className="gradient-teal border-0 text-primary-foreground hover:opacity-90 rounded-full px-8 text-base"
            onClick={handleStartSearch}
          >
            Start Your Search
          </Button>
        </div>
      </section>

      {/* Search bar */}
      <section id="search-bar-section" className="relative -mt-10 md:-mt-12 z-20">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-4 md:p-6 max-w-4xl mx-auto">
            <SearchBar
              ref={searchBarRef}
              propertyType={searchBarPropertyType}
              onPropertyTypeChange={handlePropertyTypeChange}
              onSearch={handleSearchBarSearch}
            />
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs md:text-sm text-muted-foreground">Quick filters:</span>
              {filterChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleChipClick(chip)}
                  className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-all active:scale-95 ${
                    activeFilter?.key === chip.key && activeFilter?.value === chip.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="px-3 py-1.5 rounded-full border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Properties (featured) — id for Complaints / deep links */}
      <section id="featured-properties" className="py-16 md:py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {activeFilter ? `${activeFilter.value} Properties` : "Featured Properties"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {activeFilter
                ? `Showing ${displayProperties.length} ${activeFilter.value.toLowerCase()} properties`
                : "Discover our handpicked selection of premium rental properties"}
            </p>
          </div>
          {featuredLoading ? (
            <div className="space-y-6">
              <FeaturedPropertiesSkeleton count={6} />
              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
                Loading the latest listings…
              </p>
            </div>
          ) : displayProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium text-muted-foreground">No properties match this filter</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveFilter(null)}>Clear Filter</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {displayProperties.slice(0, 6).map((p, i) => (
                <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <PropertyCard property={p} />
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8 md:mt-10">
            <Button size="lg" className="gradient-teal border-0 text-primary-foreground hover:opacity-90 rounded-full px-8" asChild>
              <Link to="/properties">View All Properties</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Demo mode popup */}
      <DemoModePopup />

      {/* Production: friendly notice while featured API loads (dismissible) */}
      <HomeFeaturedLoadingNotice
        open={featuredLoading && !demoMode && !featuredLoadingNoticeDismissed}
        onDismiss={() => {
          setFeaturedLoadingNoticeDismissed(true);
          try {
            sessionStorage.setItem(FEATURED_LOADING_NOTICE_SESSION_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      />

      <Footer />
    </div>
  );
};

export default Index;
