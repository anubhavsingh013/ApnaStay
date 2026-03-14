import { Heart, Star, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@/constants/properties";
import { DEFAULT_PROPERTY_IMAGE } from "@/constants/properties";
import { useAuth } from "@/contexts/AuthContext";

const PropertyCard = ({ property }: { property: Property }) => {
  const [liked, setLiked] = useState(false);
  const [imgSrc, setImgSrc] = useState(property.image || DEFAULT_PROPERTY_IMAGE);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCardClick = () => {
    if (!user) {
      navigate("/login", { state: { from: `/property/${property.id}`, message: "Please sign in to see property details" } });
      return;
    }
    navigate(`/property/${property.id}`);
  };

  const displayBedrooms = property.bedrooms != null && property.bedrooms > 0 ? `${property.bedrooms} BHK` : "—";
  const displayArea = property.area != null && property.area > 0 ? `${property.area} sq ft` : "—";
  const displayFurnishing = property.furnishing || "—";

  return (
    <div className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover-lift cursor-pointer" onClick={handleCardClick}>
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={imgSrc}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgSrc(DEFAULT_PROPERTY_IMAGE)}
        />
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-card"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
          />
        </button>
        <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground border-0 text-xs rounded-md px-3 py-1">
          {property.type}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-semibold text-card-foreground text-lg line-clamp-1">{property.title}</h3>

        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm">{property.location || "—"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-primary">₹{(property.price ?? 0).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          {(property.rating != null && property.rating > 0) || (property.reviews != null && property.reviews > 0) ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-card-foreground">{property.rating ?? 0}</span>
              <span className="text-sm text-muted-foreground">({property.reviews ?? 0})</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{displayBedrooms}</span>
          <span className="text-border">•</span>
          <span>{displayArea}</span>
          <span className="text-border">•</span>
          <span>{displayFurnishing}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {(property.amenities ?? []).slice(0, 3).map((a) => (
            <span key={a} className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground">
              {a}
            </span>
          ))}
          {(property.amenities ?? []).length > 3 && (
            <span className="text-xs px-2.5 py-1 rounded-md border border-border text-primary font-medium">
              +{(property.amenities ?? []).length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
