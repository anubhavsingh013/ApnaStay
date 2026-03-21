import type { PropertyRequest } from "@/lib/api";

export const PROPERTY_TYPES = ["APARTMENT", "FLAT", "HOUSE", "VILLA", "PG", "CO-LIVING", "HOSTEL", "ROOM", "PLOT", "COMMERCIAL", "GUEST_HOUSE"] as const;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const COMMON_AMENITIES = ["Parking", "Gym", "Lift", "Power Backup", "Security", "Water Backup", "Garden", "Swimming Pool", "Clubhouse", "AC", "Wi-Fi", "24/7 Water"];

/** Returns true if form has all required fields filled for submit. */
export function isPropertyFormValid(form: PropertyRequest): boolean {
  return Boolean(
    form.title?.trim() &&
    form.description?.trim() &&
    Number(form.price) > 0 &&
    form.address?.trim() &&
    form.city?.trim() &&
    form.state &&
    /^\d{6}$/.test((form.pinCode ?? "").trim())
  );
}

export const EMPTY_PROPERTY_FORM: PropertyRequest = {
  title: "",
  description: "",
  propertyType: "APARTMENT",
  price: 0,
  bedrooms: null,
  bathrooms: null,
  area: null,
  rating: null,
  reviewCount: null,
  furnishing: null,
  amenities: [],
  isFeatured: false,
  tenantUserName: null,
  latitude: null,
  longitude: null,
  address: "",
  city: "",
  state: "",
  pinCode: "",
  images: [],
};
