import { disconnectComplaintStomp } from "@/lib/complaintStompClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let csrfToken: string | null = null;
let csrfHeaderName = "X-XSRF-TOKEN";
/** After first CSRF fetch finishes (even if token is null — e.g. backend has CSRF disabled). */
let csrfFetchCompleted = false;
let csrfFetchInFlight: Promise<string | null> | null = null;

function getJwt(): string | null {
  return localStorage.getItem("jwt");
}

export function setJwt(token: string) {
  localStorage.setItem("jwt", token);
}

export function clearJwt() {
  localStorage.removeItem("jwt");
}

export function getStoredUser(): { username: string; roles: string[] } | null {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: { username: string; roles: string[] }) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem("user");
}

function resetCsrfClientCache() {
  csrfToken = null;
  csrfFetchCompleted = false;
  csrfFetchInFlight = null;
}

export function logout() {
  clearJwt();
  clearStoredUser();
  resetCsrfClientCache();
  disconnectComplaintStomp();
}

/** Decoded JWT payload (from backend: sub, roles, email, userId, is2faEnabled, iat, exp). Use for Account display. */
export interface JwtPayload {
  sub?: string;
  email?: string;
  roles?: string;
  userId?: number;
  is2faEnabled?: boolean;
  iat?: number;
  exp?: number;
}

/** Decode JWT payload without verification (frontend display only). Returns null if missing or invalid. */
export function getDecodedToken(): JwtPayload | null {
  const jwt = localStorage.getItem("jwt");
  if (!jwt?.trim()) return null;
  try {
    const parts = jwt.trim().split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Fetches CSRF once per page session (or until logout). When the backend disables CSRF,
 * `/api/csrf-token` returns null/empty — we still cache that so every PUT/GET does not
 * re-hit the endpoint.
 * Concurrent callers share one in-flight request.
 */
async function fetchCsrfTokenOnce(): Promise<string | null> {
  if (csrfFetchCompleted) return csrfToken;
  if (!csrfFetchInFlight) {
    csrfFetchInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/csrf-token`, { credentials: "include" });
        const data = (await res.json().catch(() => (null))) as { token?: string; headerName?: string } | null;
        if (data && typeof data === "object") {
          const raw = data.token;
          csrfToken = typeof raw === "string" && raw.length > 0 ? raw : null;
          if (data.headerName) csrfHeaderName = data.headerName;
        } else {
          csrfToken = null;
        }
        return csrfToken;
      } catch {
        csrfToken = null;
        return null;
      } finally {
        csrfFetchCompleted = true;
        csrfFetchInFlight = null;
      }
    })();
  }
  return csrfFetchInFlight;
}

async function getCsrf(): Promise<string | null> {
  if (csrfFetchCompleted) return csrfToken;
  return fetchCsrfTokenOnce();
}

/** Backend error response shape (4xx/5xx) */
export interface BackendErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    rejectedValue?: unknown;
  }> | null;
}

/** Build a user-friendly error message from backend error response */
export function getApiErrorMessage(data: BackendErrorResponse, fallback = "Something went wrong"): string {
  const msg = (data.message || (data as { error?: string }).error || "").trim().replace(/^Error:\s*/i, "");
  const knownMap: Record<string, string> = {
    "You cannot apply to your own property": "You cannot apply to your own property.",
    "This property is already rented": "This property is already rented.",
    "An active Rent already exists for this property": "This property already has an active Rent.",
    "You already have an active application for this property": "You already applied for this property.",
    "Move-in date must be today or a future date": "Please choose a valid move-in date.",
  };
  if (msg && knownMap[msg]) return knownMap[msg];
  const list = data.validationErrors?.filter((e) => e?.field && e?.message) ?? [];
  if (list.length === 0) return msg || fallback;
  const fieldLabels: Record<string, string> = {
    password: "Password",
    username: "Username",
    email: "Email",
    phoneNumber: "Phone number",
    verificationCode: "Verification code",
  };
  const details = list
    .map((e) => `${fieldLabels[e.field] ?? e.field}: ${e.message}`)
    .join(" • ");
  return msg ? `${msg} — ${details}` : details;
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    csrf?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", body, auth = true, csrf = true } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const jwt = getJwt();
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  }
  if (csrf) {
    const token = await getCsrf();
    if (token) headers[csrfHeaderName] = token;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // Send cookies (e.g. JSESSIONID, XSRF-TOKEN) when backend uses session/cookies
  });

  const text = await res.text();
  const data = (text && text.trim().length > 0
    ? (() => { try { return JSON.parse(text) as BackendErrorResponse & T; } catch { return {} as BackendErrorResponse & T; } })()
    : {}) as BackendErrorResponse & T;

  if (!res.ok) {
    // Only clear session on 401 when we had a token and it's a state-changing request.
    // GET 401 (e.g. "not authorized to view this resource") should not log the user out.
    if (res.status === 401 && auth && getJwt() && method !== "GET") {
      logout();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("apnastay:auth:401"));
      }
    }
    const userMessage = getApiErrorMessage(
      data as BackendErrorResponse,
      res.status === 401 ? "Invalid username or password." : `Request failed (${res.status})`
    );
    throw new Error(userMessage);
  }

  return data as T;
}

// ── Auth Endpoints ──

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  roles: string[];
  jwtToken: string;
}

/** When user has 2FA enabled, signin may return this instead of LoginResponse */
export interface Login2FARequiredResponse {
  requires2FA: boolean;
  temporaryToken: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  role?: string[];
}

export interface MessageResponse {
  message: string;
}

/** Backend signup/send-code response shape */
export interface BackendMessageResponse {
  data: string | null;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
}

export interface PhoneLoginRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface UserInfoResponse {
  id: number;
  username: string;
  email: string;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  enabled: boolean;
  credentialsExpiryDate: string;
  accountExpiryDate: string;
  isTwoFactorEnabled: boolean;
  roles: string[];
}

/** Backend can return 200 with { message, status: false } e.g. for locked account */
interface LoginErrorResponse {
  message?: string;
  status: false;
}

export type SigninResult = LoginResponse | Login2FARequiredResponse;

export async function signin(data: LoginRequest): Promise<SigninResult> {
  const res = await apiRequest<LoginResponse & Login2FARequiredResponse & LoginErrorResponse>("/api/auth/public/signin", {
    method: "POST",
    body: data,
    auth: false,
    csrf: false,
  });
  if (res.status === false && res.message) {
    throw new Error(res.message);
  }
  if ((res as Login2FARequiredResponse).requires2FA && (res as Login2FARequiredResponse).temporaryToken) {
    return { requires2FA: true, temporaryToken: (res as Login2FARequiredResponse).temporaryToken };
  }
  const loginRes = res as LoginResponse & { userName?: string };
  const username = loginRes.username ?? loginRes.userName ?? "";
  setJwt(loginRes.jwtToken);
  // Do not setStoredUser here — Login will check 2FA and only then complete login or show 2FA step
  return { ...loginRes, username: username || loginRes.username };
}

export async function signup(data: SignupRequest): Promise<BackendMessageResponse> {
  const res = await apiRequest<BackendMessageResponse>("/api/auth/public/signup", {
    method: "POST",
    body: data,
    auth: false,
    csrf: false,
  });
  return res;
}

export async function sendPhoneCode(data: PhoneVerificationRequest): Promise<BackendMessageResponse> {
  return apiRequest<BackendMessageResponse>("/api/auth/public/phone/send-code", {
    method: "POST",
    body: data,
    auth: false,
    csrf: false,
  });
}

export async function phoneVerifyAndLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
  const res = await apiRequest<LoginResponse & LoginErrorResponse>("/api/auth/public/phone/verify-and-login", {
    method: "POST",
    body: data,
    auth: false,
    csrf: false,
  });
  if (res.status === false && res.message) {
    throw new Error(res.message);
  }
  const loginRes = res as LoginResponse;
  setJwt(loginRes.jwtToken);
  setStoredUser({ username: loginRes.username, roles: loginRes.roles });
  return loginRes;
}

/** Forgot password: send reset link to email. */
export async function forgotPassword(email: string): Promise<BackendMessageResponse> {
  const path = `/api/auth/public/forgot-password?email=${encodeURIComponent(email)}`;
  return apiRequest<BackendMessageResponse>(path, {
    method: "POST",
    auth: false,
    csrf: true,
  });
}

/** Reset password with token from email link. */
export async function resetPassword(token: string, newPassword: string): Promise<BackendMessageResponse> {
  const path = `/api/auth/public/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`;
  return apiRequest<BackendMessageResponse>(path, {
    method: "POST",
    auth: false,
    csrf: true,
  });
}

export async function getUserDetails() {
  return apiRequest<{ success: boolean; data: UserInfoResponse }>("/api/auth/user");
}

export async function getUsername() {
  return apiRequest<{ success: boolean; data: string }>("/api/auth/username");
}

// ── Two-Factor Authentication ──

export interface TwoFactorStatusResponse {
  is2faEnabled: boolean;
}

/** GET /api/auth/user/2fa-status — Check if 2FA is enabled */
export async function get2faStatus(): Promise<TwoFactorStatusResponse> {
  const data = await apiRequest<TwoFactorStatusResponse>("/api/auth/user/2fa-status");
  return data;
}

/** POST /api/auth/enable-2fa — Get TOTP secret / QR URL (returns plain string or JSON) */
export async function enable2fa(): Promise<string> {
  const jwt = getJwt();
  if (!jwt) throw new Error("Not authenticated");
  const token = await getCsrf();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
  };
  if (token) headers[csrfHeaderName] = token;
  const res = await fetch(`${BASE_URL}/api/auth/enable-2fa`, {
    method: "POST",
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as BackendErrorResponse;
    throw new Error(getApiErrorMessage(err, "Failed to enable 2FA"));
  }
  const raw = (await res.text()).trim();
  // Backend may return: plain URL, JSON "url", or object with otpauth/secret (or QR image URL e.g. api.qrserver.com)
  if (raw.startsWith("{")) {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const url = (obj.otpauthUrl ?? obj.url ?? obj.data ?? obj.otpauth ?? obj.qrCodeUrl ?? obj.qrCode) as string | undefined;
    if (typeof url === "string" && (url.startsWith("otpauth://") || url.startsWith("http://") || url.startsWith("https://"))) return url.trim();
    const secret = (obj.secret ?? obj.totpSecret) as string | undefined;
    if (typeof secret === "string") {
      const issuer = String(obj.issuer ?? "HomeFinity").replace(/:/g, "");
      const account = String(obj.account ?? obj.username ?? "user").replace(/:/g, "");
      return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    }
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.slice(1, -1).replace(/\\"/g, '"');
    }
  }
  return raw;
}

/** POST /api/auth/verify-2fa?code=XXX — Verify 6-digit code and turn 2FA on */
export async function verify2fa(code: string): Promise<void> {
  const jwt = getJwt();
  if (!jwt) throw new Error("Not authenticated");
  const token = await getCsrf();
  const path = `/api/auth/verify-2fa?code=${encodeURIComponent(code)}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...(token ? { [csrfHeaderName]: token } : {}), Authorization: `Bearer ${jwt}` },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as BackendErrorResponse;
    throw new Error(getApiErrorMessage(err, "Invalid 2FA code"));
  }
}

/** POST /api/auth/disable-2fa — Turn 2FA off */
export async function disable2fa(): Promise<void> {
  const jwt = getJwt();
  if (!jwt) throw new Error("Not authenticated");
  const token = await getCsrf();
  const res = await fetch(`${BASE_URL}/api/auth/disable-2fa`, {
    method: "POST",
    headers: { ...(token ? { [csrfHeaderName]: token } : {}), Authorization: `Bearer ${jwt}` },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as BackendErrorResponse;
    throw new Error(getApiErrorMessage(err, "Failed to disable 2FA"));
  }
}

/** POST /api/auth/public/verify-2fa-login?code=XXX&jwtToken=XXX — Verify 2FA during login */
export async function verify2faLogin(code: string, jwtToken: string): Promise<LoginResponse> {
  const csrf = await getCsrf();
  const path = `/api/auth/public/verify-2fa-login?code=${encodeURIComponent(code)}&jwtToken=${encodeURIComponent(jwtToken)}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: csrfHeaderName && csrf ? { [csrfHeaderName]: csrf } : {},
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Invalid 2FA code");

  const loginPayload = (data: unknown): LoginResponse | null => {
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const username = (o.username as string) ?? (o.userName as string);
    const roles = o.roles as string[] | undefined;
    const jwt = (o.jwtToken as string) ?? (o.token as string) ?? jwtToken;
    if (username && Array.isArray(roles)) {
      return { username, roles, jwtToken: jwt };
    }
    const inner = o.data as Record<string, unknown> | undefined;
    if (inner && typeof inner === "object") {
      const u = (inner.username as string) ?? (inner.userName as string);
      const r = inner.roles as string[] | undefined;
      if (u && Array.isArray(r)) return { username: u, roles: r, jwtToken: (o.jwtToken as string) ?? (o.token as string) ?? jwtToken };
    }
    return null;
  };

  try {
    const data = JSON.parse(text) as unknown;
    const parsed = loginPayload(data);
    if (parsed) {
      setJwt(parsed.jwtToken);
      setStoredUser({ username: parsed.username, roles: parsed.roles });
      return parsed;
    }
  } catch {
    // Response is plain text (e.g. "2FA Verified") — use same JWT and fetch user with direct fetch to avoid 401 logout
  }

  setJwt(jwtToken);
  const csrfVal = await getCsrf();
  const userRes = await fetch(`${BASE_URL}/api/auth/user`, {
    method: "GET",
    headers: { Authorization: `Bearer ${jwtToken}`, ...(csrfHeaderName && csrfVal ? { [csrfHeaderName]: csrfVal } : {}) },
    credentials: "include",
  });
  const userJson = await userRes.json().catch(() => ({})) as { success?: boolean; data?: UserInfoResponse & { userName?: string } };
  if (userRes.ok && userJson?.data) {
    const d = userJson.data;
    const username = d?.username ?? d?.userName ?? "";
    const roles = d?.roles ?? [];
    setStoredUser({ username, roles });
    return { username, roles, jwtToken };
  }
  throw new Error("Could not complete login. Please try again.");
}

// ── Property Endpoints ──

export interface PropertyRequest {
  title: string;
  description: string;
  propertyType: string;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  furnishing?: string | null;
  amenities?: string[];
  isFeatured?: boolean | null;
  tenantUserName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  images?: string[];
}

export interface PropertyDTO {
  id: number;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  rating: number | null;
  reviewCount: number | null;
  furnishing: string | null;
  amenities: string[];
  isFeatured: boolean | null;
  tenantUserName: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  images: string[];
  ownerUserName: string;
  /** When present, use for complaint "against" (owner user id). */
  ownerId?: number | null;
  /** When present, use for complaint "against" (tenant user id). */
  tenantId?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  verifiedListing?: boolean;
  verifiedOwner?: boolean;
}

export async function getProperties() {
  return apiRequest<{ success: boolean; data: PropertyDTO[] }>("/api/property");
}

/** GET /api/property/public — list available properties for tenants/buyers (no auth required) */
export interface PublicPropertySearchParams {
  city?: string;
  pinCode?: string;
  furnishing?: string;
  amenities?: string[];
  minBedrooms?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
  sortBy?: "newest" | "price" | "rating";
  sortDir?: "asc" | "desc";
  page?: number;
  size?: number;
}
export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}
export async function searchPublicProperties(params?: PublicPropertySearchParams) {
  const search = new URLSearchParams();
  if (params?.city) search.set("city", params.city);
  if (params?.pinCode) search.set("pinCode", params.pinCode);
  if (params?.furnishing) search.set("furnishing", params.furnishing);
  if (params?.minBedrooms != null) search.set("minBedrooms", String(params.minBedrooms));
  if (params?.minBathrooms != null) search.set("minBathrooms", String(params.minBathrooms));
  if (params?.minPrice != null) search.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) search.set("maxPrice", String(params.maxPrice));
  if (params?.amenities?.length) params.amenities.forEach((a) => search.append("amenities", a));
  if (params?.minLatitude != null) search.set("minLatitude", String(params.minLatitude));
  if (params?.maxLatitude != null) search.set("maxLatitude", String(params.maxLatitude));
  if (params?.minLongitude != null) search.set("minLongitude", String(params.minLongitude));
  if (params?.maxLongitude != null) search.set("maxLongitude", String(params.maxLongitude));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const q = search.toString();
  return apiRequest<{ success: boolean; data: PagedResponse<PropertyDTO>; message?: string }>(
    `/api/property/public/search${q ? `?${q}` : ""}`,
    { auth: false }
  );
}

/** Backward-compatible wrapper used by existing cache/listing UI */
export async function getPublicProperties(params?: PublicPropertySearchParams) {
  const res = await searchPublicProperties(params);
  return { ...res, data: res.data?.items ?? [] };
}

/** GET /api/property/public/featured — featured properties for homepage */
export async function getFeaturedProperties() {
  return apiRequest<{ success: boolean; data: PropertyDTO[]; message?: string }>("/api/property/public/featured", { auth: false });
}

export async function getSimilarPublicProperties(propertyId: number, limit = 6) {
  return apiRequest<{ success: boolean; data: PropertyDTO[]; message?: string }>(
    `/api/property/public/${propertyId}/similar?limit=${encodeURIComponent(String(limit))}`,
    { auth: false }
  );
}

/** GET /api/property/admin/all — get all properties (admin view) */
export async function getPropertiesAdminAll() {
  return apiRequest<{ success: boolean; data: PropertyDTO[] }>("/api/property/admin/all");
}

/** GET /api/property/{userName}/all — get all properties for a user (e.g. owner's properties) */
export async function getPropertiesByUser(userName: string) {
  return apiRequest<{ success: boolean; data: PropertyDTO[] }>(`/api/property/${encodeURIComponent(userName)}/all`);
}

export async function getPropertyById(id: number) {
  return apiRequest<{ success: boolean; data: PropertyDTO }>(`/api/property/${id}`);
}

/** Fetch a single property from public/featured lists (no auth or ownership required). Use for detail view when getPropertyById returns 401. */
export async function getPublicPropertyById(id: number): Promise<PropertyDTO | null> {
  try {
    const featured = await apiRequest<{ success?: boolean; data?: PropertyDTO[] }>("/api/property/public/featured", { auth: false });
    const list = featured?.data;
    if (Array.isArray(list)) {
      const found = list.find((p: { id?: number }) => p.id === id);
      if (found) return found as PropertyDTO;
    }
    const publicList = await apiRequest<{ success?: boolean; data?: PropertyDTO[] }>("/api/property/public", { auth: false });
    const pub = publicList?.data;
    if (Array.isArray(pub)) {
      const found = pub.find((p: { id?: number }) => p.id === id);
      if (found) return found as PropertyDTO;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function createProperty(data: PropertyRequest) {
  return apiRequest<{ success: boolean; data: PropertyDTO }>("/api/property", {
    method: "POST",
    body: data,
  });
}

export async function updateProperty(id: number, data: PropertyRequest) {
  return apiRequest<{ success: boolean; data: PropertyDTO }>(`/api/property/${id}`, {
    method: "PUT",
    body: data,
  });
}

/** Max constraints — must match backend {@code PropertyImageUploadValidator}. */
export const PROPERTY_IMAGE_UPLOAD_MAX_FILES = 20;
export const PROPERTY_IMAGE_UPLOAD_MAX_BYTES = 7 * 1024 * 1024;

/** Strip server-generated DB image URLs before sending {@link PropertyRequest}; those rows are managed by multipart uploads. */
export function filterExternalPropertyImageUrlsOnly(urls: string[] | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((u) => {
    const s = (u ?? "").trim();
    if (!s) return false;
    if (s.includes("/api/property/image-file/")) return false;
    return true;
  });
}

/** Resolve relative API image paths for use in {@code <img src>}. */
export function resolvePropertyImageUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:") || u.startsWith("blob:")) return u;
  const base = BASE_URL.replace(/\/$/, "");
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/${u.replace(/^\//, "")}`;
}

async function apiRequestFormData<T>(
  path: string,
  options: { method: string; body: FormData; auth?: boolean; csrf?: boolean }
): Promise<T> {
  const { method, body, auth = true, csrf = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth) {
    const jwt = getJwt();
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
  }
  if (csrf) {
    const token = await getCsrf();
    if (token) headers[csrfHeaderName] = token;
  }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body, credentials: "include" });
  const text = await res.text();
  const data = (text && text.trim().length > 0
    ? (() => {
        try {
          return JSON.parse(text) as BackendErrorResponse & T;
        } catch {
          return {} as BackendErrorResponse & T;
        }
      })()
    : {}) as BackendErrorResponse & T;
  if (!res.ok) {
    if (res.status === 401 && auth && getJwt() && method !== "GET") {
      logout();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("apnastay:auth:401"));
    }
    const userMessage = getApiErrorMessage(data as BackendErrorResponse, `Request failed (${res.status})`);
    throw new Error(userMessage);
  }
  return data as T;
}

/**
 * POST multipart {@code /api/property} — part {@code property}: JSON; part {@code imageFiles}: files (optional).
 * Replaces binary images only on create (none yet). See also {@link updatePropertyWithImages}.
 */
export async function createPropertyWithImages(data: PropertyRequest, imageFiles: File[]) {
  const fd = new FormData();
  fd.append("property", new Blob([JSON.stringify(data)], { type: "application/json" }));
  for (const f of imageFiles) fd.append("imageFiles", f, f.name);
  return apiRequestFormData<{ success: boolean; data: PropertyDTO }>("/api/property", { method: "POST", body: fd });
}

/**
 * PUT multipart — part {@code property}: JSON; part {@code imageFiles}: if present, **replaces** all DB-stored images
 * (empty list clears them). Omit {@code imageFiles} part entirely to leave uploaded images unchanged (use JSON {@link updateProperty}).
 */
export async function updatePropertyWithImages(id: number, data: PropertyRequest, imageFiles: File[]) {
  const fd = new FormData();
  fd.append("property", new Blob([JSON.stringify(data)], { type: "application/json" }));
  for (const f of imageFiles) fd.append("imageFiles", f, f.name);
  return apiRequestFormData<{ success: boolean; data: PropertyDTO }>(`/api/property/${id}`, { method: "PUT", body: fd });
}

export async function deleteProperty(id: number) {
  return apiRequest<{ success: boolean; message: string }>(`/api/property/${id}`, {
    method: "DELETE",
  });
}

// ── Admin Property Actions ──
export type PropertyStatus = "AVAILABLE" | "SOLD" | "RENTED" | "PENDING" | "UNDER_MAINTENANCE" | "REJECTED";

/** PUT /api/property/admin/{id}/approve */
export async function adminApproveProperty(id: number) {
  return apiRequest<{ success: boolean; data: PropertyDTO; message?: string }>(
    `/api/property/admin/${id}/approve`,
    { method: "PUT" }
  );
}

/** PUT /api/property/admin/{id}/reject */
export async function adminRejectProperty(id: number) {
  return apiRequest<{ success: boolean; data: PropertyDTO; message?: string }>(
    `/api/property/admin/${id}/reject`,
    { method: "PUT" }
  );
}

/** PUT /api/property/admin/{id}/status?status= */
export async function adminUpdatePropertyStatus(id: number, status: PropertyStatus) {
  return apiRequest<{ success: boolean; data: PropertyDTO; message?: string }>(
    `/api/property/admin/${id}/status?status=${encodeURIComponent(status)}`,
    { method: "PUT" }
  );
}

// ── Admin Endpoints ──

export async function adminGetUsers() {
  return apiRequest<{ success: boolean; data: unknown[] }>("/api/admin/getusers");
}

export async function adminGetUserById(id: number) {
  return apiRequest<{ success: boolean; data: unknown }>(`/api/admin/user/${id}`);
}

export async function adminGetRoles() {
  return apiRequest<{ success: boolean; data: { roleId: number; roleName: string }[] }>("/api/admin/roles");
}

export async function adminUpdateRole(userId: number, roleName: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-role?userId=${userId}&roleName=${roleName}`, {
    method: "PUT",
  });
}

export async function adminUpdateLockStatus(userId: number, lock: boolean) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-lock-status?userId=${userId}&lock=${lock}`, {
    method: "PUT",
  });
}

export async function adminUpdateExpiryStatus(userId: number, expire: boolean) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-expiry-status?userId=${userId}&expire=${expire}`, {
    method: "PUT",
  });
}

export async function adminUpdateEnabledStatus(userId: number, enabled: boolean) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-enabled-status?userId=${userId}&enabled=${enabled}`, {
    method: "PUT",
  });
}

export async function adminUpdateCredentialsExpiry(userId: number, expire: boolean) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-credentials-expiry-status?userId=${userId}&expire=${expire}`, {
    method: "PUT",
  });
}

export async function adminUpdatePassword(userId: number, password: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/update-password?userId=${userId}&password=${encodeURIComponent(password)}`, {
    method: "PUT",
  });
}

// ── Profile API (current user: get, update, submit for review, approval status) ──

export type ProfileRole = "ROLE_OWNER" | "ROLE_BROKER" | "ROLE_USER";

/** Backend profile DTO (GET /api/profile, POST review, PUT update responses) */
export interface ProfileDTO {
  id: number;
  userId: number;
  userName: string;
  profileRole: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber: string | null;
  mobile: string;
  email: string | null;
  firmName: string | null;
  licenseNumber: string | null;
  idType: string | null;
  idNumber: string | null;
  address: string;
  city: string;
  district?: string | null;
  state: string;
  pinCode: string;
  village?: string | null;
  postOffice?: string | null;
  policeStation?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
  submittedAt: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /api/profile/review (submit for review) */
export interface ProfileReviewRequest {
  role: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber?: string | null;
  mobile: string;
  firmName?: string | null;
  licenseNumber?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  address: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  village?: string | null;
  postOffice?: string | null;
  policeStation?: string | null;
}

/** Request body for PUT /api/profile (update profile, no submission) */
export interface ProfileUpdateRequest {
  role: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber?: string | null;
  mobile: string;
  firmName?: string | null;
  licenseNumber?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  address: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  village?: string | null;
  postOffice?: string | null;
  policeStation?: string | null;
}

/** GET /api/profile — pass role as query param */
export async function getProfile(role: ProfileRole) {
  return apiRequest<{ success: boolean; data: ProfileDTO; message?: string; timestamp?: string }>(
    `/api/profile?role=${encodeURIComponent(role)}`
  );
}

/** POST /api/profile/review — submit profile for admin review (role in request body) */
export async function submitProfileForReview(role: ProfileRole, body: ProfileReviewRequest) {
  return apiRequest<{ success: boolean; data: ProfileDTO; message: string; timestamp?: string }>(
    "/api/profile/review",
    { method: "POST", body: { ...body, role } }
  );
}

/** PUT /api/profile — update profile (no submission) */
export async function updateProfile(body: ProfileUpdateRequest) {
  return apiRequest<{ success: boolean; data: ProfileDTO; message: string; timestamp?: string }>(
    "/api/profile",
    { method: "PUT", body }
  );
}

/** Approval status from GET /api/profile/approval-status */
export type ProfileApprovalStatus = "APPROVED" | "PENDING" | "REJECTED";

/** GET /api/profile/approval-status — pass role as query param; returns approved and status. */
export async function getProfileApprovalStatus(role: ProfileRole) {
  return apiRequest<{
    success: boolean;
    data: { approved: boolean; status?: ProfileApprovalStatus };
    message?: string;
    timestamp?: string;
  }>(`/api/profile/approval-status?role=${encodeURIComponent(role)}`);
}

// ── Admin Profile (list all, approve, reject) ──

/** GET /api/profile/list — list all profiles (admin only). Returns ProfileDTO[]. */
export async function adminGetProfileList() {
  return apiRequest<{ success: boolean; data: ProfileDTO[]; message?: string; timestamp?: string }>(
    "/api/profile/list"
  );
}

/** PUT /api/profile/{role}/{id}/approve — approve profile. Body: { adminNote?: string }. */
export async function adminApproveProfile(profileRole: ProfileRole, id: number, adminNote?: string) {
  return apiRequest<{ success: boolean; message?: string; data?: null }>(
    `/api/profile/${profileRole}/${id}/approve`,
    { method: "PUT", body: adminNote != null && adminNote !== "" ? { adminNote } : {} }
  );
}

/** PUT /api/profile/{role}/{id}/reject — reject profile. Body: { adminNote?: string }. */
export async function adminRejectProfile(profileRole: ProfileRole, id: number, adminNote?: string) {
  return apiRequest<{ success: boolean; message?: string; data?: null }>(
    `/api/profile/${profileRole}/${id}/reject`,
    { method: "PUT", body: adminNote != null && adminNote !== "" ? { adminNote } : {} }
  );
}

// ── Complaints API ──

export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ComplaintDTO {
  id: number;
  raisedByUserId: number;
  raisedByUserName: string;
  assignedToUserId: number | null;
  assignedToUserName: string | null;
  relatedUserId: number;
  relatedUserName: string;
  propertyId: number;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category?: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolvedByUserName: string | null;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string | null;
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;
  csatScore?: number | null;
  messages: ComplaintMessageDTO[] | null;
}

export interface ComplaintMessageDTO {
  id: number | null;
  complaintId: number;
  senderId: number;
  senderUserName: string;
  messageText: string;
  deleted?: boolean;
  createdAt: string | null;
}

/** POST /api/complaints — raise complaint. relatedUserId is optional (complaint can be raised without specifying "against"). */
export async function createComplaint(body: {
  subject: string;
  description: string;
  priority: ComplaintPriority;
  propertyId: number;
  relatedUserId?: number | null;
}) {
  const { relatedUserId, ...rest } = body;
  const payload = relatedUserId != null && relatedUserId > 0 ? { ...rest, relatedUserId } : rest;
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    "/api/complaints",
    { method: "POST", body: payload }
  );
}

/** GET /api/complaints — list (admin: all or by status; user: raised/assigned/related). Optional ?status= */
export async function getComplaints(status?: ComplaintStatus) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<{ success: boolean; data: ComplaintDTO[]; message?: string; timestamp?: string }>(
    `/api/complaints${q}`
  );
}

/** GET /api/complaints/:id */
export async function getComplaintById(id: number) {
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${id}`
  );
}

/** PUT /api/complaints/:id/assign — admin only. Body: { assignToUserId } */
export async function assignComplaint(complaintId: number, assignToUserId: number) {
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/assign`,
    { method: "PUT", body: { assignToUserId } }
  );
}

/** PUT /api/complaints/:id/resolve — Body: { resolutionNote } */
export async function resolveComplaint(complaintId: number, resolutionNote: string) {
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/resolve`,
    { method: "PUT", body: { resolutionNote } }
  );
}

/** PUT /api/complaints/:id/status?status= */
export async function updateComplaintStatus(complaintId: number, status: ComplaintStatus) {
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/status?status=${encodeURIComponent(status)}`,
    { method: "PUT" }
  );
}

export async function submitComplaintCsat(complaintId: number, score: number) {
  return apiRequest<{ success: boolean; data: ComplaintDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/csat?score=${encodeURIComponent(String(score))}`,
    { method: "PUT" }
  );
}

/** GET /api/user/id-by-username?username= — resolve username to user id (for complaint "against" dropdown). Returns null if not found. */
export async function getUserIdByUsername(username: string): Promise<number | null> {
  if (!username?.trim()) return null;
  try {
    const res = await apiRequest<{ success?: boolean; data?: number; userId?: number }>(
      `/api/user/id-by-username?username=${encodeURIComponent(username.trim())}`
    );
    const id = (res as { data?: number }).data ?? (res as { userId?: number }).userId;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

/** GET /api/complaints/:id/messages */
export async function getComplaintMessages(complaintId: number) {
  return apiRequest<{ success: boolean; data: ComplaintMessageDTO[]; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/messages`
  );
}

/** POST /api/complaints/:id/messages — Body: { messageText } */
export async function sendComplaintMessage(complaintId: number, messageText: string) {
  return apiRequest<{ success: boolean; data: ComplaintMessageDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/messages`,
    { method: "POST", body: { messageText } }
  );
}

/** DELETE /api/complaints/:id/messages/:messageId — soft-delete own message (admin can delete any). */
export async function deleteComplaintMessage(complaintId: number, messageId: number) {
  return apiRequest<{ success: boolean; data: ComplaintMessageDTO; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/messages/${messageId}`,
    { method: "DELETE" }
  );
}

export interface ComplaintReadReceiptDTO {
  userName: string;
  lastReadMessageId: number;
}

/** GET /api/complaints/:id/read-receipts */
export async function getComplaintReadReceipts(complaintId: number) {
  return apiRequest<{ success: boolean; data: ComplaintReadReceiptDTO[]; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/read-receipts`
  );
}

/** PUT /api/complaints/:id/read — Body: { lastReadMessageId } */
export async function markComplaintThreadRead(complaintId: number, lastReadMessageId: number) {
  return apiRequest<{ success: boolean; data?: string; message?: string; timestamp?: string }>(
    `/api/complaints/${complaintId}/read`,
    { method: "PUT", body: { lastReadMessageId } }
  );
}

export type RentalApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaseStatus = "ACTIVE" | "ENDED" | "TERMINATED";
export type LeasePaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
export type LeasePaymentMode = "CASH" | "BANK" | "UPI" | "OTHER";

export interface RentalApplicationDTO {
  id: number;
  propertyId: number;
  propertyTitle: string;
  tenantId: number;
  tenantUserName: string;
  ownerId: number;
  ownerUserName: string;
  proposedRent: number;
  moveInDate: string;
  leaseMonths: number;
  securityDeposit?: number | null;
  message?: string | null;
  status: RentalApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeasePaymentDTO {
  id: number;
  leaseId: number;
  periodMonth: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paidAt?: string | null;
  status: LeasePaymentStatus;
  paymentMode?: LeasePaymentMode | null;
  referenceNote?: string | null;
  recordedByUserId?: number | null;
  recordedByUserName?: string | null;
}

export interface LeaseDTO {
  id: number;
  propertyId: number;
  propertyTitle: string;
  tenantId: number;
  tenantUserName: string;
  ownerId: number;
  ownerUserName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit?: number | null;
  dueDayOfMonth: number;
  status: LeaseStatus;
  createdAt: string;
  updatedAt: string;
  payments?: LeasePaymentDTO[];
}

export interface RentalApplicationTimelineEventDTO {
  stage: string;
  occurredAt: string;
}

export interface LeaseDashboardDTO {
  leaseId: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  overdueAmount: number;
  totalPaid: number;
  totalDue: number;
  recentPayments: LeasePaymentDTO[];
}

export interface AuditLogDTO {
  id: number;
  action: string;
  username: string;
  propertyId?: number | null;
  propertyContent?: string | null;
  timestamp: string;
}

export interface RentalApplicationCreateRequest {
  propertyId: number;
  proposedRent: number;
  moveInDate: string;
  leaseMonths: number;
  securityDeposit?: number;
  message?: string;
}

export async function createRentalApplication(body: RentalApplicationCreateRequest) {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO; message?: string; timestamp?: string }>(
    "/api/rentals/applications",
    { method: "POST", body }
  );
}

export async function getMyRentalApplications() {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO[]; message?: string; timestamp?: string }>(
    "/api/rental/my-application"
  );
}

/** Clear naming alias for tenant-side submitted applications */
export async function getSubmittedRentalApplicationsForCurrentUser() {
  return getMyRentalApplications();
}

export async function getIncomingRentalApplications() {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO[]; message?: string; timestamp?: string }>(
    "/api/rentals/applications/incoming"
  );
}

/** Clear naming alias for owner/admin incoming applications */
export async function getIncomingRentalApplicationsForOwner() {
  return getIncomingRentalApplications();
}

export async function approveRentalApplication(applicationId: number) {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO; message?: string; timestamp?: string }>(
    `/api/rentals/applications/${applicationId}/approve`,
    { method: "PUT" }
  );
}

export async function rejectRentalApplication(applicationId: number) {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO; message?: string; timestamp?: string }>(
    `/api/rentals/applications/${applicationId}/reject`,
    { method: "PUT" }
  );
}

export async function cancelRentalApplication(applicationId: number) {
  return apiRequest<{ success: boolean; data: RentalApplicationDTO; message?: string; timestamp?: string }>(
    `/api/rentals/applications/${applicationId}/cancel`,
    { method: "PUT" }
  );
}

export async function getMyLeases() {
  return apiRequest<{ success: boolean; data: LeaseDTO[]; message?: string; timestamp?: string }>(
    "/api/rentals/rented"
  );
}

/** Clear naming alias for tenant-side active leases */
export async function getActiveLeasesForCurrentUser() {
  return getMyLeases();
}

export async function getLeaseById(leaseId: number) {
  return apiRequest<{ success: boolean; data: LeaseDTO; message?: string; timestamp?: string }>(
    `/api/rentals/leases/${leaseId}`
  );
}

export async function getRentalApplicationTimeline(applicationId: number) {
  return apiRequest<{ success: boolean; data: RentalApplicationTimelineEventDTO[]; message?: string; timestamp?: string }>(
    `/api/rentals/applications/${applicationId}/timeline`
  );
}

export async function getLeaseDashboard(leaseId: number) {
  return apiRequest<{ success: boolean; data: LeaseDashboardDTO; message?: string; timestamp?: string }>(
    `/api/rentals/leases/${leaseId}/dashboard`
  );
}

export interface SavedPropertyDTO {
  id: number;
  propertyId: number;
  propertyTitle: string;
  price: number;
  city: string;
  state: string;
  savedAt: string;
}

export interface SavedSearchDTO {
  id: number;
  name: string;
  city?: string | null;
  pinCode?: string | null;
  minBedrooms?: number | null;
  minBathrooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  furnishing?: string | null;
  alertsEnabled: boolean;
  lastAlertCheckedAt?: string | null;
  createdAt: string;
}

export interface SavedSearchRequest {
  name: string;
  city?: string;
  pinCode?: string;
  minBedrooms?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  furnishing?: string;
  alertsEnabled?: boolean;
}

export async function saveProperty(propertyId: number) {
  return apiRequest<{ success: boolean; data: SavedPropertyDTO; message?: string }>(`/api/engagement/saved-properties/${propertyId}`, { method: "POST" });
}
export async function getSavedProperties() {
  return apiRequest<{ success: boolean; data: SavedPropertyDTO[]; message?: string }>("/api/engagement/saved-properties");
}
export async function removeSavedProperty(propertyId: number) {
  return apiRequest<{ success: boolean; message?: string }>(`/api/engagement/saved-properties/${propertyId}`, { method: "DELETE" });
}
export async function createSavedSearch(body: SavedSearchRequest) {
  return apiRequest<{ success: boolean; data: SavedSearchDTO; message?: string }>("/api/engagement/saved-searches", { method: "POST", body });
}
export async function getSavedSearches() {
  return apiRequest<{ success: boolean; data: SavedSearchDTO[]; message?: string }>("/api/engagement/saved-searches");
}
export async function runSavedSearchAlertCheck(searchId: number) {
  return apiRequest<{ success: boolean; data: { newMatches: number }; message?: string }>(`/api/engagement/saved-searches/${searchId}/run-alert-check`, { method: "POST" });
}

export interface PropertyReviewDTO {
  id: number;
  propertyId: number;
  reviewerUserName: string;
  rating: number;
  comment: string;
  verifiedStay: boolean;
  ownerResponse?: string | null;
  createdAt: string;
}

export async function getPropertyReviews(propertyId: number) {
  return apiRequest<{ success: boolean; data: PropertyReviewDTO[]; message?: string }>(`/api/property-reviews/property/${propertyId}`, { auth: false });
}
export async function createPropertyReview(propertyId: number, body: { rating: number; comment: string }) {
  return apiRequest<{ success: boolean; data: PropertyReviewDTO; message?: string }>(`/api/property-reviews/property/${propertyId}`, { method: "POST", body });
}
export async function ownerRespondToPropertyReview(reviewId: number, ownerResponse: string) {
  return apiRequest<{ success: boolean; data: PropertyReviewDTO; message?: string }>(
    `/api/property-reviews/${reviewId}/owner-response`,
    { method: "PUT", body: { ownerResponse } }
  );
}

export async function getLeasePayments(leaseId: number) {
  return apiRequest<{ success: boolean; data: LeasePaymentDTO[]; message?: string; timestamp?: string }>(
    `/api/rentals/leases/${leaseId}/payments`
  );
}

export async function recordLeasePayment(
  leaseId: number,
  payload: { paymentId: number; amountPaid: number; paymentMode?: LeasePaymentMode; referenceNote?: string }
) {
  return apiRequest<{ success: boolean; data: LeasePaymentDTO; message?: string; timestamp?: string }>(
    `/api/rentals/leases/${leaseId}/payments`,
    { method: "POST", body: payload }
  );
}

export async function getAuditLogs() {
  return apiRequest<AuditLogDTO[]>("/api/audit");
}
