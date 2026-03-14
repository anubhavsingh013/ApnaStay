import type { PropertyDTO, UserInfoResponse } from "@/lib/api";

// ── Mock Properties ──
const defaultDto = {
  rating: null as number | null,
  reviewCount: null as number | null,
  furnishing: null as string | null,
  amenities: [] as string[],
  isFeatured: null as boolean | null,
  tenantUserName: null as string | null,
  latitude: null as number | null,
  longitude: null as number | null,
};

export const mockProperties: PropertyDTO[] = [
  { ...defaultDto, id: 1001, title: "Skyline Residency 2BHK", description: "Modern apartment with city view, fully furnished.", propertyType: "APARTMENT", price: 25000, bedrooms: 2, bathrooms: 2, area: 1100, address: "42, MG Road", city: "Bangalore", state: "Karnataka", pinCode: "560001", images: [], ownerUserName: "rajesh_owner", status: "RENTED", tenantUserName: "sneha_tenant", createdAt: "2026-02-15T10:00:00Z", updatedAt: "2026-03-01T12:00:00Z" },
  { ...defaultDto, id: 1002, title: "Green Valley Villa", description: "Spacious 3BHK villa with garden and private parking.", propertyType: "VILLA", price: 55000, bedrooms: 3, bathrooms: 3, area: 2200, address: "Plot 8, Whitefield", city: "Bangalore", state: "Karnataka", pinCode: "560066", images: [], ownerUserName: "rajesh_owner", status: "AVAILABLE", createdAt: "2026-01-10T08:00:00Z", updatedAt: "2026-02-20T14:00:00Z" },
  { ...defaultDto, id: 1003, title: "Budget PG for Students", description: "Affordable PG with meals, WiFi, and laundry.", propertyType: "HOUSE", price: 7500, bedrooms: 1, bathrooms: 1, area: 180, address: "HSR Layout Sector 2", city: "Bangalore", state: "Karnataka", pinCode: "560102", images: [], ownerUserName: "rajesh_owner", status: "AVAILABLE", createdAt: "2026-03-01T06:00:00Z", updatedAt: "2026-03-05T09:00:00Z" },
  { ...defaultDto, id: 1004, title: "Commercial Office Space", description: "Ready-to-move-in office space in IT corridor.", propertyType: "COMMERCIAL", price: 45000, bedrooms: 0, bathrooms: 2, area: 1500, address: "ORR Tech Park", city: "Hyderabad", state: "Telangana", pinCode: "500081", images: [], ownerUserName: "rajesh_owner", status: "AVAILABLE", createdAt: "2026-02-20T11:00:00Z", updatedAt: "2026-03-04T16:00:00Z" },
  { ...defaultDto, id: 1005, title: "Riverside Plot", description: "Premium residential plot near river, gated community.", propertyType: "PLOT", price: 0, bedrooms: 0, bathrooms: 0, area: 2400, address: "Devanahalli", city: "Bangalore", state: "Karnataka", pinCode: "562110", images: [], ownerUserName: "rajesh_owner", status: "PENDING", createdAt: "2026-03-06T07:00:00Z", updatedAt: "2026-03-06T07:00:00Z" },
];

// ── Mock Users (admin view) — Demo: 1 admin, 1 owner, 1 broker, 1 tenant ──
export const mockUsers = [
  { userId: 1, userName: "admin_user", email: "admin@apnastay.com", role: { roleId: 1, roleName: "ROLE_ADMIN" }, enabled: true, accountNonLocked: true, accountNonExpired: true, credentialsNonExpired: true, isTwoFactorEnabled: true, credentialsExpiryDate: "2027-01-01", accountExpiryDate: "2027-01-01" },
  { userId: 2, userName: "rajesh_owner", email: "rajesh@gmail.com", role: { roleId: 2, roleName: "ROLE_OWNER" }, enabled: true, accountNonLocked: true, accountNonExpired: true, credentialsNonExpired: true, isTwoFactorEnabled: false, credentialsExpiryDate: "2027-06-01", accountExpiryDate: "2027-06-01" },
  { userId: 3, userName: "amit_broker", email: "amit.broker@gmail.com", role: { roleId: 4, roleName: "ROLE_BROKER" }, enabled: true, accountNonLocked: true, accountNonExpired: true, credentialsNonExpired: true, isTwoFactorEnabled: false, credentialsExpiryDate: "2027-03-01", accountExpiryDate: "2027-03-01" },
  { userId: 4, userName: "sneha_tenant", email: "sneha@gmail.com", role: { roleId: 3, roleName: "ROLE_USER" }, enabled: true, accountNonLocked: true, accountNonExpired: true, credentialsNonExpired: true, isTwoFactorEnabled: false, credentialsExpiryDate: "2027-12-01", accountExpiryDate: "2027-12-01" },
];

// ── Mock Roles ──
export const mockRoles = [
  { roleId: 1, roleName: "ROLE_ADMIN" },
  { roleId: 2, roleName: "ROLE_OWNER" },
  { roleId: 3, roleName: "ROLE_USER" },
  { roleId: 4, roleName: "ROLE_BROKER" },
];

// ── Mock User Info (for profile) ──
export const mockUserInfo = (username: string, roleName: string): UserInfoResponse => ({
  id: 1,
  username,
  email: `${username}@apnastay.com`,
  accountNonLocked: true,
  accountNonExpired: true,
  credentialsNonExpired: true,
  enabled: true,
  credentialsExpiryDate: "2027-01-01",
  accountExpiryDate: "2027-01-01",
  isTwoFactorEnabled: false,
  roles: [roleName],
});
