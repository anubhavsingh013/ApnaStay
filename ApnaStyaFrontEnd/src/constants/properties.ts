import type { PropertyDTO } from "@/lib/api";

export const DEFAULT_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop";

const PROPERTY_TYPE_MAP: Record<string, "Flat" | "PG" | "Co-living" | "Hostel" | "Villa" | "Room"> = {
  APARTMENT: "Flat",
  FLAT: "Flat",
  HOUSE: "Villa",
  VILLA: "Villa",
  PG: "PG",
  "CO-LIVING": "Co-living",
  HOSTEL: "Hostel",
  ROOM: "Room",
  PLOT: "Villa",
  COMMERCIAL: "Flat",
  GUEST_HOUSE: "Room",
};

const FURNISHING_MAP: Record<string, "Fully Furnished" | "Semi Furnished" | "Unfurnished"> = {
  FURNISHED: "Fully Furnished",
  SEMI_FURNISHED: "Semi Furnished",
  UNFURNISHED: "Unfurnished",
};

export interface Property {
  id: number;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: "Fully Furnished" | "Semi Furnished" | "Unfurnished";
  type: "Flat" | "PG" | "Co-living" | "Hostel" | "Villa" | "Room";
  amenities: string[];
  image: string;
  isFeatured?: boolean;
  ownerUserName: string;
  tenantUserName?: string;
  lat?: number;
  lng?: number;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  images?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Map backend PropertyDTO to frontend Property for listing/cards/detail. Handles partial API response (e.g. from public listing). */
export function mapPropertyDtoToProperty(dto: PropertyDTO | Record<string, unknown>): Property {
  const d = dto as PropertyDTO;
  const location = [d.address, d.city, d.state].filter(Boolean).join(", ") || [d.city, d.state].filter(Boolean).join(", ") || "—";
  const type = ((d.propertyType && PROPERTY_TYPE_MAP[String(d.propertyType)]) || "Flat") as Property["type"];
  const furnishing = ((d.furnishing && FURNISHING_MAP[String(d.furnishing)]) || "Fully Furnished") as Property["furnishing"];
  return {
    id: d.id,
    title: d.title ?? "—",
    location,
    price: d.price ?? 0,
    rating: d.rating ?? 0,
    reviews: d.reviewCount ?? 0,
    area: d.area ?? 0,
    bedrooms: d.bedrooms ?? 0,
    bathrooms: d.bathrooms ?? 0,
    furnishing,
    type,
    amenities: d.amenities ?? [],
    image: (d.images && Array.isArray(d.images) && d.images[0]) ? d.images[0] : DEFAULT_PROPERTY_IMAGE,
    isFeatured: d.isFeatured ?? false,
    ownerUserName: d.ownerUserName ?? "",
    tenantUserName: d.tenantUserName ?? undefined,
    lat: d.latitude ?? undefined,
    lng: d.longitude ?? undefined,
    description: d.description,
    address: d.address,
    city: d.city,
    state: d.state,
    pinCode: d.pinCode,
    images: d.images,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const properties: Property[] = [
  {
    id: 1,
    title: "Modern Luxury Apartment",
    location: "Koramangala, Bangalore",
    price: 35000,
    rating: 4.8,
    reviews: 124,
    area: 1500,
    bedrooms: 2,
    bathrooms: 2,
    furnishing: "Fully Furnished",
    type: "Flat",
    amenities: ["Wi-Fi", "Parking", "AC", "Gym", "Pool"],
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "rajesh_owner",
    tenantUserName: "sneha_tenant",
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    id: 2,
    title: "Cozy PG Room for Students",
    location: "HSR Layout, Bangalore",
    price: 8500,
    rating: 4.5,
    reviews: 89,
    area: 200,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "Fully Furnished",
    type: "PG",
    amenities: ["Wi-Fi", "Food", "Laundry", "Security", "AC"],
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "rajesh_owner",
    tenantUserName: "vikram_tenant",
    lat: 12.9116,
    lng: 77.6474,
  },
  {
    id: 3,
    title: "Premium Co-living Space",
    location: "Indiranagar, Bangalore",
    price: 18000,
    rating: 4.7,
    reviews: 156,
    area: 2000,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "Fully Furnished",
    type: "Co-living",
    amenities: ["Wi-Fi", "Parking", "AC", "Gym", "Pool", "Garden"],
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "priya_owner",
    tenantUserName: "sneha_tenant",
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    id: 4,
    title: "Budget Friendly Hostel",
    location: "BTM Layout, Bangalore",
    price: 6000,
    rating: 4.2,
    reviews: 67,
    area: 150,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "Fully Furnished",
    type: "Hostel",
    amenities: ["Wi-Fi", "Security", "Common Kitchen", "Laundry"],
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "priya_owner",
    lat: 12.9166,
    lng: 77.6101,
  },
  {
    id: 5,
    title: "Executive Studio Apartment",
    location: "MG Road, Bangalore",
    price: 22000,
    rating: 4.4,
    reviews: 45,
    area: 450,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "Fully Furnished",
    type: "Room",
    amenities: ["Wi-Fi", "AC", "Security", "Parking", "Gym"],
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "amit_owner",
    tenantUserName: "vikram_tenant",
    lat: 12.9758,
    lng: 77.6045,
  },
  {
    id: 6,
    title: "Riverside Modern Flat",
    location: "Powai, Mumbai",
    price: 35000,
    rating: 4.6,
    reviews: 98,
    area: 950,
    bedrooms: 2,
    bathrooms: 2,
    furnishing: "Semi Furnished",
    type: "Flat",
    amenities: ["Wi-Fi", "Parking", "Gym", "Garden"],
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=400&fit=crop",
    isFeatured: true,
    ownerUserName: "rajesh_owner",
    lat: 19.1176,
    lng: 72.9060,
  },
];

export const categories = [
  { name: "Flat", icon: "🏢", count: 1240 },
  { name: "PG", icon: "🏠", count: 860 },
  { name: "Co-living", icon: "🤝", count: 430 },
  { name: "Hostel", icon: "🛏️", count: 320 },
];
