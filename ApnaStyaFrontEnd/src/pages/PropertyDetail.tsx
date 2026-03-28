import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { properties, mapPropertyDtoToProperty, DEFAULT_PROPERTY_IMAGE, type Property } from "@/constants/properties";
import { CachedPropertyImg } from "@/components/property/CachedPropertyImg";
import { createPropertyReview, createRentalApplication, getPropertyById, getPropertyReviews, getPublicPropertyById, getSimilarPublicProperties, removeSavedProperty, saveProperty, type PropertyReviewDTO } from "@/lib/api";
import { useDemoData } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import DemoRoleSwitcher from "@/features/demo/DemoRoleSwitcher";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerCalendar } from "@/components/common/DatePickerCalendar";
import { toastSuccess, toastError } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Star, Heart, Share2, Bed, Bath, Maximize,
  Sofa, MessageSquare, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Building2,
  Shield, Clock, Navigation, IndianRupee, Users, Zap, Eye, TrendingUp, LogIn, Bookmark,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const galleryImages = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
];

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
];

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { demoMode, requestBooking } = useDemoData();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<PropertyReviewDTO[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const numId = Number(id);
    if (!numId || isNaN(numId)) {
      setProperty(null);
      setLoading(false);
      return;
    }
    if (demoMode) {
      setProperty(properties.find((p) => p.id === numId) ?? null);
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPropertyById(numId)
      .then((res) => {
        const raw = res as { data?: unknown };
        const d = raw?.data;
        if (d && typeof d === "object" && "id" in d) {
          setProperty(mapPropertyDtoToProperty(d as Parameters<typeof mapPropertyDtoToProperty>[0]));
        } else {
          setProperty(null);
        }
      })
      .catch(() => {
        // Owner-only endpoint returns 401 for non-owners; fetch from public/featured so any user can view
        return getPublicPropertyById(numId)
          .then((d) => {
            if (d && typeof d === "object" && "id" in d) {
              setProperty(mapPropertyDtoToProperty(d as Parameters<typeof mapPropertyDtoToProperty>[0]));
            } else {
              setProperty(null);
            }
          })
          .catch(() => setProperty(null));
      })
      .finally(() => setLoading(false));
  }, [id, demoMode, user]);

  useEffect(() => {
    const pid = Number(id);
    if (!pid || demoMode) return;
    getSimilarPublicProperties(pid, 4)
      .then((res) => {
        const list = (res?.data ?? []).map((x) => mapPropertyDtoToProperty(x));
        setSimilarProperties(list);
      })
      .catch(() => setSimilarProperties([]));
    getPropertyReviews(pid)
      .then((res) => setReviews(res?.data ?? []))
      .catch(() => setReviews([]));
  }, [id, demoMode]);

  useEffect(() => {
    if (demoMode || user) return;
    if (id) {
      navigate("/login", { state: { from: `/property/${id}`, message: "Please sign in to see property details" } });
    }
  }, [demoMode, user, id, navigate]);

  const [liked, setLiked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const [rentApplyOpen, setRentApplyOpen] = useState(false);
  const [rentApplySubmitting, setRentApplySubmitting] = useState(false);
  const [leaseMonths, setLeaseMonths] = useState(11);
  const [moveInDate, setMoveInDate] = useState("");
  const [proposedRent, setProposedRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [rentNote, setRentNote] = useState("");

  const handleSaveToggle = () => {
    if (!property) return;
    setSavingProperty(true);
    const op = saved ? removeSavedProperty(property.id) : saveProperty(property.id);
    op
      .then(() => {
        setSaved((s) => !s);
        toastSuccess(saved ? "Removed from saved" : "Property saved");
      })
      .catch((err) => toastError("Action failed", (err as Error).message))
      .finally(() => setSavingProperty(false));
  };

  const handleSubmitReview = () => {
    if (!property || !reviewComment.trim()) {
      toastError("Add a review comment");
      return;
    }
    createPropertyReview(property.id, { rating: reviewRating, comment: reviewComment.trim() })
      .then((res) => {
        const next = res?.data;
        if (next) setReviews((prev) => [next, ...prev]);
        setReviewComment("");
        setReviewRating(5);
        toastSuccess("Review submitted");
      })
      .catch((err) => toastError("Review failed", (err as Error).message));
  };

  useEffect(() => {
    if (!property || !mapRef.current || mapInstanceRef.current) return;
    const lat = property.lat || 12.9716;
    const lng = property.lng || 77.5946;

    const map = L.map(mapRef.current).setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([lat, lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: `<div style="background:hsl(var(--primary));color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map).bindPopup(`<b>${property.title}</b><br/>${property.location}`);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [property]);

  if (!user && !demoMode && id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
            <p className="text-sm text-muted-foreground">Loading property…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Property currently unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This property may be removed, private, or not visible on public listing right now.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
              <Button onClick={() => navigate("/properties")}>Browse Properties</Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const mainImage = property.image || property.images?.[0] || DEFAULT_PROPERTY_IMAGE;
  const extraImages = (property.images ?? []).filter((_, i) => i > 0);
  const images = [mainImage, ...extraImages, ...galleryImages].filter(Boolean).slice(0, 6);
  const lat = property.lat || 12.9716;
  const lng = property.lng || 77.5946;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const requireLogin = () => {
    if (!user) {
      setLoginRequiredOpen(true);
      return true;
    }
    return false;
  };

  const handleGoToLogin = () => {
    setLoginRequiredOpen(false);
    navigate("/login", { state: { from: location.pathname } });
  };

  const handleScheduleVisit = () => {
    const selectedVisitDate = visitDate ? new Date(visitDate) : null;
    if (requireLogin()) return;
    if (!selectedVisitDate || Number.isNaN(selectedVisitDate.getTime())) {
      toastError("Select a date", "Please pick a visit date.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthMax = new Date(today);
    oneMonthMax.setMonth(oneMonthMax.getMonth() + 1);
    if (selectedVisitDate < today || selectedVisitDate > oneMonthMax) {
      toastError("Invalid date", "Visits can only be scheduled up to 1 month from today.");
      return;
    }
    if (!visitTime) {
      toastError("Select a time", "Please pick a time slot.");
      return;
    }
    requestBooking({
      propertyId: property.id,
      propertyTitle: property.title,
      tenantName: user!.username,
      ownerName: property.ownerUserName,
      visitDate: selectedVisitDate.toISOString(),
      type: "VISIT",
    });
    toastSuccess("Visit requested!", `Scheduled for ${format(selectedVisitDate, "PPP")} at ${visitTime}`);
    setVisitDate("");
    setVisitTime("");
  };

  const handleContactOwner = () => {
    if (requireLogin()) return;
    if (!contactMsg.trim()) {
      toastError("Enter a message");
      return;
    }
    toastSuccess("Message sent!", "The owner will be notified.");
    setContactMsg("");
    setContactOpen(false);
  };

  const handleContactClick = () => {
    if (requireLogin()) return;
    setContactOpen(true);
  };

  const handleGetDirections = () => {
    window.open(googleMapsUrl, "_blank");
  };

  const handleOpenRentApply = () => {
    if (requireLogin()) return;
    if (user?.username && property.ownerUserName && user.username.trim().toLowerCase() === property.ownerUserName.trim().toLowerCase()) {
      toastError("You cannot apply to your own property");
      return;
    }
    setProposedRent(String(property.price || ""));
    setSecurityDeposit(String((property.price || 0) * 2));
    setMoveInDate(new Date().toISOString().slice(0, 10));
    setLeaseMonths(11);
    setRentNote("");
    setRentApplyOpen(true);
  };

  const handleSubmitRentApply = () => {
    if (!property?.id) return;
    const rent = Number(proposedRent);
    const deposit = securityDeposit.trim() ? Number(securityDeposit) : undefined;
    if (!Number.isFinite(rent) || rent <= 0) {
      toastError("Invalid rent amount");
      return;
    }
    if (!moveInDate) {
      toastError("Select move-in date");
      return;
    }
    const selectedMoveInDate = new Date(`${moveInDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!(selectedMoveInDate > today)) {
      toastError("Invalid move-in date", "Please choose a future date for move-in.");
      return;
    }
    setRentApplySubmitting(true);
    createRentalApplication({
      propertyId: property.id,
      proposedRent: rent,
      moveInDate,
      leaseMonths,
      securityDeposit: deposit && Number.isFinite(deposit) && deposit >= 0 ? deposit : undefined,
      message: rentNote.trim() || undefined,
    })
      .then(() => {
        toastSuccess("Rental request sent", "Owner will review your application.");
        setRentApplyOpen(false);
      })
      .catch((err) => toastError("Could not submit request", (err as Error)?.message))
      .finally(() => setRentApplySubmitting(false));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      {/* Sign in required dialog */}
      <Dialog open={loginRequiredOpen} onOpenChange={setLoginRequiredOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Sign in to continue</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  You need to sign in to contact the owner or schedule a visit for this property.
                </p>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create an account or sign in to message the owner and book property visits. You&apos;ll be brought back here after signing in.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setLoginRequiredOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto gap-2" onClick={handleGoToLogin}>
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {galleryOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center">
          <button onClick={() => setGalleryOpen(false)} className="absolute top-6 right-6 text-background hover:text-primary transition-colors">
            <X className="h-8 w-8" />
          </button>
          <button onClick={() => setGalleryIdx((prev) => (prev - 1 + images.length) % images.length)} className="absolute left-6 text-background hover:text-primary transition-colors">
            <ChevronLeft className="h-10 w-10" />
          </button>
          <CachedPropertyImg
            src={images[galleryIdx] || DEFAULT_PROPERTY_IMAGE}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
          />
          <button onClick={() => setGalleryIdx((prev) => (prev + 1) % images.length)} className="absolute right-6 text-background hover:text-primary transition-colors">
            <ChevronRight className="h-10 w-10" />
          </button>
          <div className="absolute bottom-8 flex gap-2">
            {images.map((_, i) => (
              <button key={i} onClick={() => setGalleryIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === galleryIdx ? "bg-primary" : "bg-background/40"}`} />
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 rounded-2xl overflow-hidden cursor-pointer" onClick={() => setGalleryOpen(true)}>
          <div className="md:col-span-2 md:row-span-2 relative">
            <CachedPropertyImg
              src={images[0]}
              alt={property.title}
              className="w-full h-full object-cover min-h-[300px] md:min-h-[400px]"
            />
            <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground border-0">{property.type}</Badge>
          </div>
          {images.slice(1, 5).map((img, i) => (
            <div key={i} className="relative hidden md:block">
              <CachedPropertyImg src={img} alt="" className="w-full h-[195px] object-cover" />
              {i === 3 && images.length > 5 && (
                <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                  <span className="text-background font-semibold text-lg">+{images.length - 5} more</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{property.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>
                {property.ownerUserName && (
                  <p className="text-xs text-muted-foreground mt-1">Listed by: {property.ownerUserName}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setLiked(!liked)}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-destructive text-destructive" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSaveToggle}
                  disabled={savingProperty}
                  title={saved ? "Saved" : "Save property"}
                >
                  <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(window.location.href); toastSuccess("Link copied!"); }}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {property.verifiedListing && <Badge className="bg-emerald-600 text-white">Verified listing</Badge>}
              {property.verifiedOwner && <Badge variant="secondary">Verified owner</Badge>}
            </div>

            {/* Price & rating */}
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-3xl font-bold text-primary">₹{(property.price ?? 0).toLocaleString()}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              {((property.rating != null && property.rating > 0) || (property.reviews != null && property.reviews > 0)) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-secondary-foreground">{property.rating ?? 0}</span>
                  <span className="text-muted-foreground text-sm">({property.reviews ?? 0} reviews)</span>
                </div>
              )}
            </div>

            {/* Key details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Bed, label: "Bedrooms", value: (property.bedrooms != null && property.bedrooms > 0) ? `${property.bedrooms} BHK` : "—" },
                { icon: Bath, label: "Bathrooms", value: (property.bathrooms != null && property.bathrooms > 0) ? `${property.bathrooms}` : "—" },
                { icon: Maximize, label: "Area", value: (property.area != null && property.area > 0) ? `${property.area} sq ft` : "—" },
                { icon: Sofa, label: "Furnishing", value: property.furnishing || "—" },
              ].map((d) => (
                <Card key={d.label} className="text-center">
                  <CardContent className="p-4 space-y-1">
                    <d.icon className="h-5 w-5 mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="font-semibold text-foreground text-sm">{d.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Description */}
            <Card>
              <CardHeader><CardTitle className="text-lg">About this property</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {property.description || `This ${(property.furnishing || "fully furnished").toLowerCase()} ${(property.type || "flat").toLowerCase()} is located in ${property.location}. The property comes with modern fittings and is perfect for professionals and families looking for a comfortable stay.`}
                </p>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Amenities</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary text-sm">
                      <Shield className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-secondary-foreground">{a}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Math.max(1, Math.min(5, Number(e.target.value) || 5)))}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <Textarea
                    className="sm:col-span-2"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                  />
                </div>
                <Button size="sm" onClick={handleSubmitReview}>Submit review</Button>
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-md border p-3">
                        <div className="text-sm font-medium">{r.reviewerUserName} - {r.rating}/5 {r.verifiedStay ? "(Verified stay)" : ""}</div>
                        <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                        {r.ownerResponse ? <p className="text-xs mt-2">Owner reply: {r.ownerResponse}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Similar Properties</CardTitle></CardHeader>
              <CardContent>
                {similarProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No similar listings found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {similarProperties.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(`/property/${p.id}`)}
                        className="text-left rounded-md border p-3 hover:bg-secondary/40"
                      >
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.location}</p>
                        <p className="text-sm text-primary mt-1">₹{(p.price ?? 0).toLocaleString()}/month</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map with Google Maps */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Location</CardTitle>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleGetDirections}>
                    <Navigation className="h-3.5 w-3.5" /> Get Directions
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={mapRef} className="rounded-xl h-64 w-full z-0" />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {property.location}
                  </p>
                  <Button size="sm" variant="ghost" className="text-xs text-primary gap-1" onClick={handleGetDirections}>
                    <Navigation className="h-3 w-3" /> Open in Google Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" /> Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Interested in this property? Send a message to the owner directly.
                </p>
                <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                  <Button className="w-full gap-2" onClick={handleContactClick}>
                    <MessageSquare className="h-4 w-4" /> Contact Owner
                  </Button>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Message the Owner</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">Regarding: <strong>{property.title}</strong></p>
                      <Textarea
                        placeholder="Hi, I'm interested in this property and would like to know more about..."
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                        rows={4}
                      />
                      <Button className="w-full" onClick={handleContactOwner}>Send Message</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Schedule visit - Enhanced */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Apply for Rent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Submit a rental application with proposed rent, move-in date, and Rent duration.
                </p>
                <Button className="w-full" onClick={handleOpenRentApply}>
                  Apply for Rent
                </Button>
                <Dialog open={rentApplyOpen} onOpenChange={setRentApplyOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rental Application</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Proposed monthly rent</p>
                        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={proposedRent} onChange={(e) => setProposedRent(e.target.value)} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Security deposit</p>
                        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Move-in date</p>
                        <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Lease months</p>
                        <input type="number" min={1} max={60} className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={leaseMonths} onChange={(e) => setLeaseMonths(Number(e.target.value) || 1)} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Message (optional)</p>
                        <Textarea rows={3} value={rentNote} onChange={(e) => setRentNote(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRentApplyOpen(false)}>Cancel</Button>
                      <Button onClick={handleSubmitRentApply} disabled={rentApplySubmitting}>
                        {rentApplySubmitting ? "Submitting..." : "Submit application"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Schedule visit - Enhanced */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" /> Schedule Visit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date picker */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Select Date</p>
                  <DatePickerCalendar
                    value={visitDate}
                    onChange={setVisitDate}
                    minDate={new Date()}
                    maxDate={(() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      return d;
                    })()}
                    hideLabel
                    useMonthYearDropdowns
                    placeholder="Pick a preferred date"
                    iconPosition="left"
                  />
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Select Time Slot</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setVisitTime(slot)}
                        className={`px-2 py-2 rounded-lg text-[11px] font-medium border transition-all ${
                          visitTime === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleScheduleVisit} disabled={!visitDate || !visitTime}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {visitDate && visitTime ? `Book for ${format(new Date(visitDate), "MMM d")} at ${visitTime}` : "Select date & time to book"}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Facts - Interactive redesign */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Quick Facts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: Clock, label: "Listed", value: "2 weeks ago", color: "text-primary" },
                  { icon: IndianRupee, label: "Deposit", value: `₹${(property.price * 2).toLocaleString()}`, color: "text-primary" },
                  { icon: Zap, label: "Available from", value: "Immediately", color: "text-emerald-500" },
                  { icon: Users, label: "Preferred tenants", value: "Family / Professionals", color: "text-amber-500" },
                  { icon: Eye, label: "Parking", value: property.amenities.includes("Parking") ? "Available" : "Not available", color: property.amenities.includes("Parking") ? "text-emerald-500" : "text-destructive" },
                  { icon: TrendingUp, label: "Price trend", value: "Stable", color: "text-primary" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
                    <div className="h-8 w-8 rounded-lg bg-card flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
