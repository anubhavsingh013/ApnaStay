import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher, { getDemoUser, subscribeDemoUser } from "@/features/demo/DemoRoleSwitcher";
import { useDemoData, type Complaint } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { PropertyRequest, PropertyDTO } from "@/lib/api";
import {
  getProfile,
  get2faStatus,
  updateProfile,
  submitProfileForReview,
  getProperties,
  getComplaints,
  getComplaintMessages,
  sendComplaintMessage,
  createComplaint,
  resolveComplaint,
  updateComplaintStatus as apiUpdateComplaintStatus,
  getUserIdByUsername,
  getDecodedToken,
  type ProfileDTO,
  type ComplaintDTO,
  type ComplaintMessageDTO,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/lib/api";
import { VerificationBadge, type VerificationStatus } from "@/components/auth/VerificationBadge";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";
import {
  Building2, Users, IndianRupee, Plus, User, Bell, FileText, CreditCard,
  Trash2, Pencil, X, AlertCircle, CheckCircle, ChevronRight, Clock, Eye, MapPin, Check, XCircle, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { indianStates, getCitiesForState, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { DatePickerSelects } from "@/components/common/DatePickerSelects";
import { StatusFilterDropdown } from "@/components/common/StatusFilterDropdown";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { SubmitProfileForReviewDialog } from "@/components/auth/SubmitProfileForReviewDialog";
import { DemoModeLoginPrompt } from "@/features/demo/DemoModeLoginPrompt";

const OWNERS = ["rajesh_owner"];

const COMPLAINT_NONE_VALUE = "__none__";

const tabs = [
  { label: "Overview", icon: Building2, id: "overview" },
  { label: "Account", icon: User, id: "profile" },
  { label: "My Assets", icon: Building2, id: "assets" },
  { label: "My Tenants", icon: Users, id: "requests" },
  { label: "Complaints", icon: FileText, id: "complaints" },
  { label: "Payments", icon: CreditCard, id: "payments" },
  { label: "Alerts", icon: Bell, id: "notifications" },
];

const propertyTypes = ["APARTMENT", "FLAT", "HOUSE", "VILLA", "PG", "CO-LIVING", "HOSTEL", "ROOM", "PLOT", "COMMERCIAL", "GUEST_HOUSE"] as const;
const DESCRIPTION_MAX_LENGTH = 2000;
const COMMON_AMENITIES = ["Parking", "Gym", "Lift", "Power Backup", "Security", "Water Backup", "Garden", "Swimming Pool", "Clubhouse", "AC", "Wi-Fi", "24/7 Water"];

function mapApiProfileToOwnerForm(d: ProfileDTO) {
  const stateCode = indianStates.find((s) => s.name === d.state)?.code ?? d.state;
  const parts = d.address?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return {
    fullName: d.fullName || "",
    gender: d.gender || "Male",
    dateOfBirth: d.dateOfBirth || "",
    aadharNumber: d.aadharNumber || "",
    mobile: (() => { const { countryCode, mobile: m } = parseMobileValue(d.mobile || ""); return m ? `${countryCode}|${m}` : ""; })(),
    email: d.email || "",
    village: parts[0] || d.city || "",
    postOffice: parts[1] || "",
    policeStation: parts[2] || "",
    state: stateCode,
    district: d.city || "",
    pincode: d.pinCode || "",
  };
}

const emptyForm: PropertyRequest = {
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

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, dashboardPath } = useAuth();
  const { toast } = useToast();
  const {
    demoMode, properties, addProperty, updateProperty, deleteProperty,
    bookings, updateBookingStatus, payments, complaints, raiseComplaint, updateComplaintStatus,
    notifications, markNotificationRead, getNotificationsFor, ownerProfiles,
    isOwnerProfileApproved, submitOwnerProfile,
  } = useDemoData();
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState<PropertyRequest>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState<"add" | "edit" | null>(null);
  const [demoOwner, setDemoOwner] = useState(getDemoUser);

  useEffect(() => subscribeDemoUser(() => setDemoOwner(getDemoUser())), []);

  useEffect(() => {
    if ((location.state as { openProfile?: boolean })?.openProfile) {
      navigate("/owner/dashboard", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (user && dashboardPath && dashboardPath !== "/owner/dashboard") {
      navigate(dashboardPath, { replace: true });
    }
  }, [user, dashboardPath, navigate]);

  const currentOwner = demoMode ? (OWNERS.includes(demoOwner) ? demoOwner : OWNERS[0]) : (user?.username?.trim() || "Owner");

  const [apiOwnerProperties, setApiOwnerProperties] = useState<PropertyDTO[]>([]);
  const [apiOwnerPropertiesLoading, setApiOwnerPropertiesLoading] = useState(false);

  const [complaintDialog, setComplaintDialog] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    againstUser: "",
    propertyId: 0,
    relatedUserId: 0,
    priority: "MEDIUM" as Complaint["priority"],
  });
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; id: number }>({ open: false, id: 0 });
  const [resolveNote, setResolveNote] = useState("");
  const [detailItem, setDetailItem] = useState<{ type: string; data: any } | null>(null);
  const [apiComplaints, setApiComplaints] = useState<ComplaintDTO[]>([]);
  const [apiComplaintsLoading, setApiComplaintsLoading] = useState(false);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | "">("");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string | null>(null);
  const [againstOptions, setAgainstOptions] = useState<{ userId: number; userName: string }[]>([]);
  const [againstOptionsLoading, setAgainstOptionsLoading] = useState(false);
  const [complaintMessages, setComplaintMessages] = useState<ComplaintMessageDTO[]>([]);
  const [complaintMessageText, setComplaintMessageText] = useState("");
  const [complaintMessageSending, setComplaintMessageSending] = useState(false);
  const [complaintStatusUpdating, setComplaintStatusUpdating] = useState(false);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{ open: boolean; complaintId: number | null; newStatus: ComplaintStatus | null; currentStatus: ComplaintStatus | null; message: string }>({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" });

  const [apiApproved, setApiApproved] = useState<boolean | null>(null);
  const [apiProfile, setApiProfile] = useState<ProfileDTO | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUpdateDialogOpen, setProfileUpdateDialogOpen] = useState(false);
  const [profileSubmitDialogOpen, setProfileSubmitDialogOpen] = useState(false);
  const [verifySubmitDialogOpen, setVerifySubmitDialogOpen] = useState(false);
  const [demoLoginPromptOpen, setDemoLoginPromptOpen] = useState(false);
  const [ownerProfileForm, setOwnerProfileForm] = useState({
    fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", email: "",
    village: "", postOffice: "", policeStation: "", state: "", district: "", pincode: "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profile2faEnabled, setProfile2faEnabled] = useState<boolean | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  /** When profile is verified (APPROVED), "Submit for review" is only enabled after user has updated profile. */
  const [profileUpdatedAfterLoad, setProfileUpdatedAfterLoad] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });

  const useRealApi = !demoMode && user;

  const openConfirm = (title: string, description: string, confirmLabel: string, variant: "default" | "destructive", onConfirm: () => void) => {
    setConfirmAction({ open: true, title, description, confirmLabel, variant, onConfirm });
  };
  const runConfirm = () => {
    confirmAction.onConfirm();
    setConfirmAction((p) => ({ ...p, open: false }));
  };

  const fetchProfileFromDb = () => {
    if (!useRealApi) return;
    setProfileLoading(true);
    setProfileError(null);
    getProfile("ROLE_OWNER")
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data && typeof data.id === "number") {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
        } else {
          setApiProfile(null);
          setApiApproved(false);
        }
        setProfileUpdatedAfterLoad(false);
      })
      .catch((err) => {
        const msg = err?.message || "";
        const isNotFound = /not found|profile not found|404/i.test(msg);
        setApiProfile(null);
        setApiApproved(false);
        setProfileUpdatedAfterLoad(false);
        if (isNotFound) {
          setProfileError(null);
        } else {
          setProfileError("Could not load profile");
        }
        if (!isNotFound && msg) {
          toast({ title: "Profile load failed", description: "Please try again later.", variant: "destructive" });
        }
      })
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    if (useRealApi) fetchProfileFromDb();
  }, [useRealApi]);

  useEffect(() => {
    if (!useRealApi) return;
    get2faStatus()
      .then((res) => setProfile2faEnabled(res.is2faEnabled))
      .catch(() => setProfile2faEnabled(false));
  }, [useRealApi]);
  useEffect(() => {
    if (demoMode && profile2faEnabled === null) setProfile2faEnabled(false);
  }, [demoMode, profile2faEnabled]);

  useEffect(() => {
    if (!detailItem || detailItem.type !== "complaint" || !useRealApi || !("id" in detailItem.data)) return;
    const id = (detailItem.data as ComplaintDTO).id;
    getComplaintMessages(id)
      .then((res) => {
        const list = (res as { data?: ComplaintMessageDTO[] }).data;
        if (Array.isArray(list)) setComplaintMessages(list);
      })
      .catch(() => setComplaintMessages([]));
    setComplaintMessageText("");
  }, [detailItem, useRealApi]);

  const handleSendComplaintMessage = () => {
    if (!detailItem || detailItem.type !== "complaint" || !complaintMessageText.trim()) return;
    const id = (detailItem.data as ComplaintDTO).id;
    setComplaintMessageSending(true);
    sendComplaintMessage(id, complaintMessageText.trim())
      .then(() => {
        setComplaintMessageText("");
        return getComplaintMessages(id);
      })
      .then((res) => {
        const list = (res as { data?: ComplaintMessageDTO[] }).data;
        if (Array.isArray(list)) setComplaintMessages(list);
        toast({ title: "Message sent" });
      })
      .catch((err) => toast({ title: "Failed to send", description: (err as Error)?.message, variant: "destructive" }))
      .finally(() => setComplaintMessageSending(false));
  };

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch (status) {
      case "OPEN": return "border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300";
      case "IN_PROGRESS": return "border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300";
      case "RESOLVED": return "border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300";
      case "CLOSED": return "border-slate-500/60 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300";
      default: return "border-slate-500/60 bg-slate-100 text-slate-700";
    }
  };

  const handleStatusUpdateDialogConfirm = () => {
    const { complaintId, newStatus, message } = statusUpdateDialog;
    if (!complaintId || !newStatus) return;
    setComplaintStatusUpdating(true);
    const done = (res: { data?: ComplaintDTO }) => {
      const updated = res?.data;
      if (updated && detailItem?.type === "complaint" && (detailItem.data as ComplaintDTO).id === complaintId) {
        setDetailItem({ type: "complaint", data: updated });
      }
      setApiComplaints((prev) => prev.map((c) => (c.id === complaintId ? updated : c)).filter(Boolean));
      setStatusUpdateDialog({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" });
      setComplaintStatusUpdating(false);
    };
    if (newStatus === "RESOLVED" && message.trim()) {
      resolveComplaint(complaintId, message.trim())
        .then((res) => { toast({ title: "Complaint resolved", description: res?.message }); done(res); })
        .catch((err) => { toast({ title: "Failed to resolve", description: (err as Error)?.message, variant: "destructive" }); setComplaintStatusUpdating(false); });
    } else {
      apiUpdateComplaintStatus(complaintId, newStatus)
        .then((res) => { toast({ title: "Status updated", description: res?.message }); done(res); })
        .catch((err) => { toast({ title: "Failed to update status", description: (err as Error)?.message, variant: "destructive" }); setComplaintStatusUpdating(false); });
    }
  };

  const handleUpdateComplaintStatusInDetail = (complaintId: number, newStatus: ComplaintStatus) => {
    setComplaintStatusUpdating(true);
    apiUpdateComplaintStatus(complaintId, newStatus)
      .then((res) => {
        const updated = res?.data;
        if (updated && detailItem?.type === "complaint" && (detailItem.data as ComplaintDTO).id === complaintId) {
          setDetailItem({ type: "complaint", data: updated });
        }
        setApiComplaints((prev) => prev.map((c) => (c.id === complaintId ? updated : c)).filter(Boolean));
        toast({ title: "Status updated", description: res?.message });
      })
      .catch((err) => toast({ title: "Failed to update status", description: (err as Error)?.message, variant: "destructive" }))
      .finally(() => setComplaintStatusUpdating(false));
  };

  useEffect(() => {
    if (!useRealApi) return;
    setApiOwnerPropertiesLoading(true);
    getProperties()
      .then((res) => {
        const raw = res as { data?: PropertyDTO[]; content?: PropertyDTO[] };
        const all = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.content) ? raw.content : Array.isArray(res) ? (res as PropertyDTO[]) : [];
        setApiOwnerProperties(all);
      })
      .catch(() => setApiOwnerProperties([]))
      .finally(() => setApiOwnerPropertiesLoading(false));
  }, [useRealApi]);

  useEffect(() => {
    if (!useRealApi) return;
    setApiComplaintsLoading(true);
    getComplaints()
      .then((res) => {
        const list = (res as { data?: ComplaintDTO[] }).data;
        if (Array.isArray(list)) setApiComplaints(list);
      })
      .catch(() => setApiComplaints([]))
      .finally(() => setApiComplaintsLoading(false));
  }, [useRealApi]);

  const propertiesForAgainst = useRealApi ? apiOwnerProperties : properties.filter((p) => p.ownerUserName === currentOwner);
  useEffect(() => {
    if (!complaintForm.propertyId || !useRealApi) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    const prop = propertiesForAgainst.find((p) => p.id === complaintForm.propertyId);
    if (!prop?.tenantUserName?.trim()) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    setAgainstOptionsLoading(true);
    const tenantId = (prop as PropertyDTO & { tenantId?: number }).tenantId;
    if (typeof tenantId === "number" && tenantId > 0) {
      setAgainstOptions([{ userId: tenantId, userName: prop.tenantUserName }]);
      setComplaintForm((f) => ({ ...f, relatedUserId: tenantId }));
      setAgainstOptionsLoading(false);
      return;
    }
    getUserIdByUsername(prop.tenantUserName)
      .then((id) => {
        if (id != null) {
          setAgainstOptions([{ userId: id, userName: prop.tenantUserName! }]);
          setComplaintForm((f) => ({ ...f, relatedUserId: id }));
        } else {
          setAgainstOptions([]);
          setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
        }
      })
      .catch(() => {
        setAgainstOptions([]);
        setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      })
      .finally(() => setAgainstOptionsLoading(false));
  }, [useRealApi, complaintForm.propertyId, propertiesForAgainst]);

  const ownerProfileApproved = demoMode ? isOwnerProfileApproved(currentOwner) : (apiApproved === true || apiProfile?.status === "APPROVED");
  const verificationStatus: VerificationStatus = demoMode
    ? (ownerProfiles.find((p) => p.ownerUser === currentOwner)?.status ?? null)
    : ((apiProfile?.status as VerificationStatus) ?? null);
  const myProperties = useRealApi ? apiOwnerProperties : properties.filter(p => p.ownerUserName === currentOwner);
  const filteredMyProperties = assetStatusFilter ? myProperties.filter((p) => (p.status ?? "") === assetStatusFilter) : myProperties;
  const myBookings = bookings.filter(b => b.ownerName === currentOwner);
  const myPayments = payments.filter(p => p.ownerName === currentOwner);
  const displayPayments = demoMode ? [] : myPayments;
  const myComplaintsDemo = complaints.filter(c => c.raisedBy === currentOwner || c.againstUser === currentOwner);
  const myComplaintsAll = useRealApi ? apiComplaints : myComplaintsDemo;
  const myComplaints = complaintStatusFilter ? myComplaintsAll.filter((c) => c.status === complaintStatusFilter) : myComplaintsAll;
  const openComplaintsCount = myComplaintsAll.filter((c) => c.status === "OPEN").length;
  const tenantComplaints = useRealApi
    ? apiComplaints.filter(c => c.relatedUserName === currentOwner && c.status !== "RESOLVED" && c.status !== "CLOSED")
    : complaints.filter(c => c.againstUser === currentOwner && c.raisedByRole === "TENANT" && c.status !== "RESOLVED" && c.status !== "CLOSED");
  const myNotifications = demoMode ? [] : getNotificationsFor(currentOwner, "OWNER");
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const pendingRequests = myBookings.filter(b => b.status === "REQUESTED");
  const decodedToken = getDecodedToken();

  // Form state for location
  const selectedFormState = useMemo(() => indianStates.find(s => s.code === form.state), [form.state]);
  const formCities = useMemo(() => form.state ? getCitiesForState(form.state) : [], [form.state]);
  const formPincodes = useMemo(() => form.state ? (statePincodeRanges[form.state]?.samples || []) : [], [form.state]);

  const openPropertyAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setPropertyDialogOpen("add");
  };

  const openPropertyEdit = (p: typeof properties[0]) => {
    const stateCode = typeof p.state === "string" && p.state.length === 2 ? p.state : (indianStates.find(s => s.name === p.state)?.code ?? form.state);
    setForm({
      title: p.title,
      description: p.description ?? "",
      propertyType: p.propertyType,
      price: p.price ?? 0,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      area: p.area ?? null,
      rating: (p as { rating?: number | null }).rating ?? null,
      reviewCount: (p as { reviewCount?: number | null }).reviewCount ?? null,
      furnishing: (p as { furnishing?: string | null }).furnishing ?? null,
      amenities: Array.isArray((p as { amenities?: string[] }).amenities) ? (p as { amenities: string[] }).amenities : [],
      isFeatured: (p as { isFeatured?: boolean }).isFeatured ?? false,
      tenantUserName: null,
      latitude: (p as { latitude?: number | null }).latitude ?? null,
      longitude: (p as { longitude?: number | null }).longitude ?? null,
      address: p.address ?? "",
      city: p.city ?? "",
      state: stateCode,
      pinCode: p.pinCode ?? "",
      images: Array.isArray(p.images) ? p.images : [],
    });
    setEditingId(p.id);
    setPropertyDialogOpen("edit");
  };

  const handleDelete = (id: number) => { deleteProperty(id); toast({ title: "Property deleted" }); };

  const buildPropertyPayload = (): Omit<typeof properties[0], "id" | "createdAt" | "updatedAt"> => {
    const stateName = indianStates.find(s => s.code === form.state)?.name ?? form.state;
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      price: Number(form.price) || 0,
      bedrooms: form.bedrooms != null ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms != null ? Number(form.bathrooms) : null,
      area: form.area != null ? Number(form.area) : null,
      rating: form.rating != null ? Number(form.rating) : null,
      reviewCount: form.reviewCount != null ? Number(form.reviewCount) : null,
      furnishing: form.furnishing || null,
      amenities: Array.isArray(form.amenities) ? form.amenities : [],
      isFeatured: form.isFeatured ?? false,
      tenantUserName: null,
      latitude: form.latitude != null ? Number(form.latitude) : null,
      longitude: form.longitude != null ? Number(form.longitude) : null,
      address: form.address.trim(),
      city: form.city.trim(),
      state: stateName,
      pinCode: form.pinCode.trim(),
      images: Array.isArray(form.images) ? form.images.filter(Boolean) : [],
      ownerUserName: currentOwner,
      status: editingId ? (properties.find(pr => pr.id === editingId)?.status ?? "PENDING") : "PENDING",
    };
  };

  const handleSubmitProperty = () => {
    if (form.state && form.pinCode.length === 6 && !isPincodeValidForState(form.pinCode, form.state)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
      return;
    }
    const payload = buildPropertyPayload();
    if (editingId) {
      updateProperty(editingId, payload);
      toast({ title: "Updated" });
    } else {
      addProperty(payload);
      toast({ title: "Created — pending approval" });
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setPropertyDialogOpen(null);
    setActiveTab("assets");
  };

  const handleBookingAction = (id: number, status: "APPROVED" | "REJECTED") => { updateBookingStatus(id, status); toast({ title: `Booking ${status.toLowerCase()}` }); };

  const refetchComplaints = () => {
    if (!useRealApi) return;
    getComplaints()
      .then((res) => {
        const list = (res as { data?: ComplaintDTO[] }).data;
        if (Array.isArray(list)) setApiComplaints(list);
      })
      .catch(() => {});
  };

  const handleRaiseComplaint = () => {
    if (useRealApi) {
      if (!complaintForm.title?.trim() || !complaintForm.propertyId) {
        toast({ title: "Missing fields", description: "Property and subject are required.", variant: "destructive" });
        return;
      }
      createComplaint({
        subject: complaintForm.title.trim(),
        description: complaintForm.description.trim(),
        priority: complaintForm.priority as ComplaintPriority,
        propertyId: complaintForm.propertyId,
        ...(complaintForm.relatedUserId > 0 && { relatedUserId: complaintForm.relatedUserId }),
      })
        .then(() => {
          toast({ title: "Complaint raised", description: "Your complaint has been submitted." });
          setComplaintDialog(false);
          setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
          refetchComplaints();
        })
        .catch((err) => toast({ title: "Failed to raise complaint", description: (err as Error)?.message, variant: "destructive" }));
      return;
    }
    if (!complaintForm.title || !complaintForm.propertyId) return;
    const prop = properties.find(p => p.id === complaintForm.propertyId);
    raiseComplaint({ title: complaintForm.title, description: complaintForm.description, raisedBy: currentOwner, raisedByRole: "OWNER", againstUser: complaintForm.againstUser || "tenant", againstRole: "TENANT", propertyId: complaintForm.propertyId, propertyTitle: prop?.title || "", priority: complaintForm.priority });
    toast({ title: "Complaint raised" }); setComplaintDialog(false);
    setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
  };

  const handleResolveComplaint = () => {
    if (useRealApi) {
      resolveComplaint(resolveDialog.id, resolveNote || `Resolved by ${currentOwner}`)
        .then(() => {
          toast({ title: "Complaint resolved" });
          setResolveDialog({ open: false, id: 0 });
          setResolveNote("");
          refetchComplaints();
        })
        .catch((err) => toast({ title: "Failed to resolve", description: (err as Error)?.message, variant: "destructive" }));
      return;
    }
    updateComplaintStatus(resolveDialog.id, "RESOLVED", resolveNote || `Resolved by ${currentOwner}`);
    toast({ title: "Complaint resolved" });
    setResolveDialog({ open: false, id: 0 }); setResolveNote("");
  };

  const formatDob = (dob: string) => {
    if (!dob) return "";
    const d = new Date(dob);
    return isNaN(d.getTime()) ? dob : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const buildOwnerProfileBody = () => {
    const { countryCode, mobile: m } = parseMobileValue(ownerProfileForm.mobile);
    const stateName = indianStates.find((s) => s.code === ownerProfileForm.state)?.name ?? ownerProfileForm.state;
    const address = [ownerProfileForm.village, ownerProfileForm.postOffice, ownerProfileForm.policeStation].filter(Boolean).join(", ") || ownerProfileForm.village;
    return {
      role: "ROLE_OWNER",
      fullName: ownerProfileForm.fullName,
      gender: ownerProfileForm.gender,
      dateOfBirth: ownerProfileForm.dateOfBirth,
      aadharNumber: ownerProfileForm.aadharNumber || null,
      mobile: formatMobileForApi(countryCode, m),
      firmName: null,
      licenseNumber: null,
      idType: null,
      idNumber: null,
      address,
      city: ownerProfileForm.district,
      state: stateName,
      pinCode: ownerProfileForm.pincode,
    };
  };

  const handleUpdateOwnerProfile = () => {
    if (ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
      return;
    }
    if (demoMode) {
      const { countryCode, mobile: m } = parseMobileValue(ownerProfileForm.mobile);
      submitOwnerProfile({
        ownerUser: currentOwner,
        name: ownerProfileForm.fullName.trim(),
        gender: ownerProfileForm.gender,
        dob: ownerProfileForm.dateOfBirth || "",
        aadhar: (ownerProfileForm.aadharNumber || "").trim(),
        mobile: formatMobileForApi(countryCode, m),
        email: ownerProfileForm.email?.trim() || "",
        village: ownerProfileForm.village?.trim() || "",
        postOffice: ownerProfileForm.postOffice?.trim() || "",
        policeStation: ownerProfileForm.policeStation?.trim() || "",
        state: ownerProfileForm.state || "",
        district: ownerProfileForm.district?.trim() || "",
        pincode: ownerProfileForm.pincode?.trim() || "",
      });
      toast({ title: "Profile updated", description: "Click the Verify badge to submit for review." });
      setProfileUpdateDialogOpen(false);
      setProfileUpdatedAfterLoad(true);
      return;
    }
    setUpdatingProfile(true);
    updateProfile(buildOwnerProfileBody())
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data) setApiProfile(data);
        setProfileUpdatedAfterLoad(true);
        toast({ title: "Profile updated" });
        setProfileUpdateDialogOpen(false);
        fetchProfileFromDb();
      })
      .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }))
      .finally(() => setUpdatingProfile(false));
  };

  const handleSubmitOwnerProfileForReview = () => {
    if (ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
      return;
    }
    if (demoMode) {
      const { countryCode, mobile: m } = parseMobileValue(ownerProfileForm.mobile);
      submitOwnerProfile({
        ownerUser: currentOwner,
        name: ownerProfileForm.fullName.trim(),
        gender: ownerProfileForm.gender,
        dob: ownerProfileForm.dateOfBirth || "",
        aadhar: (ownerProfileForm.aadharNumber || "").trim(),
        mobile: formatMobileForApi(countryCode, m),
        email: ownerProfileForm.email?.trim() || "",
        village: ownerProfileForm.village?.trim() || "",
        postOffice: ownerProfileForm.postOffice?.trim() || "",
        policeStation: ownerProfileForm.policeStation?.trim() || "",
        state: ownerProfileForm.state || "",
        district: ownerProfileForm.district?.trim() || "",
        pincode: ownerProfileForm.pincode?.trim() || "",
      });
      toast({ title: "Profile submitted for review", description: "Your profile will be reviewed by admin." });
      setProfileSubmitDialogOpen(false);
      return;
    }
    setSubmittingProfile(true);
    submitProfileForReview("ROLE_OWNER", buildOwnerProfileBody())
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data) setApiProfile(data);
        setProfileUpdatedAfterLoad(false);
        toast({ title: "Profile submitted for review", description: "Your profile will be reviewed by admin." });
        setProfileSubmitDialogOpen(false);
        fetchProfileFromDb();
      })
      .catch((err) => toast({ title: "Submission failed", description: err?.message, variant: "destructive" }))
      .finally(() => setSubmittingProfile(false));
  };

  const getPropertyCardBorderClass = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700";
      case "RENTED": return "border-l-4 border-l-sky-500 border-slate-200 dark:border-slate-700";
      case "SOLD": return "border-l-4 border-l-slate-500 dark:border-l-slate-400 border-slate-200 dark:border-slate-700";
      case "PENDING": return "border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700";
      case "REJECTED": return "border-l-4 border-l-red-500 border-slate-200 dark:border-slate-700";
      case "UNDER_MAINTENANCE": return "border-l-4 border-l-orange-500 border-slate-200 dark:border-slate-700";
      default: return "border border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      <div className="container mx-auto px-4 py-4 md:py-8">
        {demoMode && (
          <div className="mb-4 p-3 bg-accent/50 border border-accent rounded-xl flex items-center gap-2 text-sm text-accent-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span><strong>Demo Mode</strong> — Viewing as <strong>{currentOwner}</strong></span>
          </div>
        )}
        {!ownerProfileApproved && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between gap-2 text-sm text-amber-900 dark:text-amber-200 flex-wrap">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Your profile is pending approval. You cannot add properties until an admin approves your profile.
            </span>
            <Button size="sm" variant="outline" className="border-amber-600 text-amber-800 dark:text-amber-200 shrink-0" asChild>
              <Link to="/owner/profile">Complete profile</Link>
            </Button>
          </div>
        )}

        <div className="mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500/70 dark:border-l-sky-400/50 pl-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome, {currentOwner || "Owner"} — Manage your properties</p>
        </div>

        {/* Mobile horizontal tabs */}
        <div className="flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4 md:hidden scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${activeTab === t.id ? "border-sky-500/40 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.id === "requests" && pendingRequests.length > 0 && <span className="bg-amber-500 text-amber-950 text-[10px] rounded-full px-1.5 font-medium">{pendingRequests.length}</span>}
              {t.id === "notifications" && unreadCount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-medium">{unreadCount}</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sticky top-20 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 ring-1 ring-slate-100 dark:ring-slate-800/80 border-l-4 border-l-sky-500/80 dark:border-l-sky-400/60">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 dark:from-sky-400/25 dark:to-sky-500/15 flex items-center justify-center ring-2 ring-sky-400/20 dark:ring-sky-500/30"><User className="h-5 w-5 text-sky-600 dark:text-sky-400" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{currentOwner || "Owner"}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 text-xs font-semibold tracking-wide">Owner</span>
                    <VerificationBadge status={verificationStatus} showIcon={true} className="text-[10px]" approvedAsActiveStyle needsResubmit={profileUpdatedAfterLoad} onVerifyClick={demoMode ? () => setDemoLoginPromptOpen(true) : (useRealApi ? () => setVerifySubmitDialogOpen(true) : undefined)} />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${activeTab === t.id ? "border-sky-300 dark:border-sky-600/60 bg-sky-50/80 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 shadow-sm" : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <t.icon className="h-4 w-4 shrink-0" />{t.label}
                    {t.id === "requests" && pendingRequests.length > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs rounded-full px-1.5 py-0.5 font-medium">{pendingRequests.length}</span>}
                    {t.id === "notifications" && unreadCount > 0 && <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">{unreadCount}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Building2, label: "Properties", value: myProperties.length, sub: null, iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", tab: "assets" },
                    { icon: Users, label: "Requests", value: myBookings.length, sub: pendingRequests.length > 0 ? `${pendingRequests.length} pending` : null, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", tab: "requests" },
                    { icon: IndianRupee, label: "Revenue", value: `₹${displayPayments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0).toLocaleString()}`, sub: null, iconBg: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600 dark:text-sky-400", tab: "payments" },
                    { icon: FileText, label: "Complaints", value: useRealApi && apiComplaintsLoading ? "…" : myComplaintsAll.length, sub: openComplaintsCount > 0 ? `${openComplaintsCount} open` : null, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", tab: "complaints" },
                  ].map(s => (
                    <button key={s.label} onClick={() => setActiveTab(s.tab)} className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4 text-left hover:shadow-lg hover:border-sky-300/60 dark:hover:border-sky-500/40 hover:bg-sky-50/40 dark:hover:bg-sky-900/20 transition-all duration-200 active:scale-[0.99] group">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.iconBg}`}><s.icon className={`h-4 w-4 ${s.iconColor}`} /></div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      {s.sub && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{s.sub}</p>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === "assets" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">My Properties</h2>
                          <p className="text-xs text-muted-foreground">Click a property to edit. Add, edit or remove listings.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={assetStatusFilter ?? "__all__"} onValueChange={(v) => setAssetStatusFilter(v === "__all__" ? null : v)}>
                        <SelectTrigger className="w-[130px] max-w-[130px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__" className="text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200">All ({myProperties.length})</SelectItem>
                          <SelectItem value="PENDING" className="text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200">Pending ({myProperties.filter((p) => (p.status ?? "") === "PENDING").length})</SelectItem>
                          <SelectItem value="AVAILABLE" className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200">Available ({myProperties.filter((p) => (p.status ?? "") === "AVAILABLE").length})</SelectItem>
                          <SelectItem value="RENTED" className="text-sky-600 dark:text-sky-400 focus:bg-sky-50 focus:text-sky-800 dark:focus:bg-sky-900/30 dark:focus:text-sky-200">Rented ({myProperties.filter((p) => (p.status ?? "") === "RENTED").length})</SelectItem>
                          <SelectItem value="SOLD" className="text-slate-500 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-700 dark:focus:bg-slate-800 dark:focus:text-slate-200">Sold ({myProperties.filter((p) => (p.status ?? "") === "SOLD").length})</SelectItem>
                          <SelectItem value="REJECTED" className="text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-800 dark:focus:bg-red-900/30 dark:focus:text-red-200">Rejected ({myProperties.filter((p) => (p.status ?? "") === "REJECTED").length})</SelectItem>
                          <SelectItem value="UNDER_MAINTENANCE" className="text-orange-600 dark:text-orange-400 focus:bg-orange-50 focus:text-orange-800 dark:focus:bg-orange-900/30 dark:focus:text-orange-200">Under maintenance ({myProperties.filter((p) => (p.status ?? "") === "UNDER_MAINTENANCE").length})</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        disabled={!ownerProfileApproved}
                        onClick={() => ownerProfileApproved ? openPropertyAdd() : toast({ title: "Profile approval required", variant: "destructive" })}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add property
                      </button>
                    </div>
                  </div>
                </div>
                {filteredMyProperties.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">{myProperties.length === 0 ? "No properties yet" : "No properties match the selected filter"}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">{myProperties.length === 0 ? "Add your first property to start receiving tenant requests and managing listings." : "Try changing the status filter or add a new property."}</p>
                    <button
                      type="button"
                      disabled={!ownerProfileApproved}
                      onClick={() => ownerProfileApproved ? openPropertyAdd() : toast({ title: "Profile approval required", variant: "destructive" })}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add property
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMyProperties.map(p => (
                      <div
                        key={p.id}
                        role={demoMode ? undefined : "button"}
                        tabIndex={demoMode ? undefined : 0}
                        onClick={demoMode ? undefined : () => openPropertyEdit(p)}
                        onKeyDown={demoMode ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPropertyEdit(p); } }}
                        className={`bg-card rounded-xl border shadow-sm p-4 ${demoMode ? "" : "cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]"} ${getPropertyCardBorderClass(p.status ?? "")}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{p.city ?? "—"}, {typeof p.state === "string" ? p.state : "—"} • ₹{Number(p.price).toLocaleString()}/mo</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.status === "AVAILABLE" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                                <CheckCircle className="h-3.5 w-3.5" /> Available
                              </span>
                            ) : p.status === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-red-500/60 bg-red-50/80 dark:bg-red-950/30 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                                <XCircle className="h-3.5 w-3.5" /> Rejected
                              </span>
                            ) : p.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </span>
                            ) : p.status === "RENTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-sky-500/60 bg-sky-50/80 dark:bg-sky-950/30 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">Rented</span>
                            ) : p.status === "SOLD" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-slate-400/60 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">Sold</span>
                            ) : p.status === "UNDER_MAINTENANCE" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-orange-500/60 bg-orange-50/80 dark:bg-orange-950/30 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">Under maintenance</span>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">{p.status?.replace("_", " ") ?? "—"}</Badge>
                            )}
                          </div>
                        </div>
                        {!demoMode && (
                          <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openPropertyEdit(p); }}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openConfirm("Delete property?", `Remove "${p.title}"? This cannot be undone.`, "Delete", "destructive", () => handleDelete(p.id)); }}
                              className="inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <h2 className="text-base font-bold text-foreground">Tenant Requests</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Approve or reject visit and booking requests from tenants.</p>
                </div>
                {myBookings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No tenant requests yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">When tenants request a visit or booking for your properties, they will appear here for you to approve or reject.</p>
                  </div>
                ) : (
                <div className="space-y-2">
                  {myBookings.map(b => (
                    <div key={b.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setDetailItem({ type: "request", data: b })}>
                        <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{b.propertyTitle}</p><p className="text-xs text-muted-foreground">{b.tenantName} • {new Date(b.visitDate).toLocaleDateString()}</p></div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={b.status === "APPROVED" ? "default" : b.status === "REQUESTED" ? "secondary" : "destructive"} className="text-[10px] shrink-0">{b.status}</Badge>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {b.status === "REQUESTED" && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => openConfirm("Approve request?", "This will approve the booking/visit request.", "Approve", "default", () => handleBookingAction(b.id, "APPROVED"))}><CheckCircle className="h-3 w-3 mr-1" /> Approve</Button>
                          <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => openConfirm("Reject request?", "This will reject the booking/visit request.", "Reject", "destructive", () => handleBookingAction(b.id, "REJECTED"))}><X className="h-3 w-3 mr-1" /> Reject</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <h2 className="text-base font-bold text-foreground">Payments Received</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Rent and other payments from tenants.</p>
                </div>
                {displayPayments.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No payments yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Payments from tenants for rent or other charges will appear here when they are made.</p>
                  </div>
                ) : (
                <div className="space-y-2">
                  {displayPayments.map(p => (
                    <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      onClick={() => setDetailItem({ type: "payment", data: p })}>
                      <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{p.tenantName} • {p.month}</p></div>
                      <div className="flex items-center gap-2">
                        <div className="text-right shrink-0"><p className="text-sm font-bold text-foreground">₹{p.amount.toLocaleString()}</p><Badge variant={p.status === "PAID" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"} className="text-[10px]">{p.status}</Badge></div>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {activeTab === "complaints" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">My Complaints</h2>
                          <p className="text-xs text-muted-foreground">View and manage complaints. Click a row to open details.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusFilterDropdown value={complaintStatusFilter} onChange={setComplaintStatusFilter} />
                      <button
                        type="button"
                        onClick={() => setComplaintDialog(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Raise
                      </button>
                    </div>
                  </div>
                </div>
                {apiComplaintsLoading && useRealApi ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading complaints…</div>
                ) : myComplaints.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No complaints{complaintStatusFilter ? ` with this status` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{complaintStatusFilter ? "Try changing the filter or raise a new complaint." : "You have not raised any complaints. Use the button above to raise one if needed."}</p>
                    {!complaintStatusFilter && (
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                        onClick={() => setComplaintDialog(true)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Raise complaint
                      </button>
                    )}
                  </div>
                ) : (
                <div className="space-y-3">
                  {myComplaints.map((c) => {
                    const title = (c as ComplaintDTO & { title?: string }).subject ?? (c as Complaint).title;
                    const against = (c as ComplaintDTO).relatedUserName ?? (c as Complaint).againstUser;
                    const raisedBy = (c as ComplaintDTO).raisedByUserName ?? (c as Complaint).raisedBy;
                    const propertyTitle = myProperties.find((p) => p.id === (c as ComplaintDTO).propertyId)?.title ?? (c as Complaint & { propertyTitle?: string }).propertyTitle ?? "";
                    const propLabel = (c as ComplaintDTO).propertyId ? (propertyTitle || `Property #${(c as ComplaintDTO).propertyId}`) : propertyTitle;
                    const isAgainstMe = (c as ComplaintDTO).relatedUserName === currentOwner || ((c as Complaint).againstUser === currentOwner && (c as Complaint).raisedByRole === "TENANT");
                    const canResolve = isAgainstMe && c.status !== "RESOLVED" && c.status !== "CLOSED";
                    const priorityCls = c.priority === "HIGH" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300" : c.priority === "MEDIUM" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200 border-slate-300";
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailItem({ type: "complaint", data: c })}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailItem({ type: "complaint", data: c }); } }}
                        className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all cursor-pointer active:scale-[0.995]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground truncate">{title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{raisedBy === currentOwner ? `Against: ${against}` : `By: ${raisedBy}`} • {propLabel}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[10px] border ${priorityCls}`}>{c.priority}</Badge>
                            {(c.status === "RESOLVED" || c.status === "CLOSED") ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="h-3.5 w-3.5" /> {c.status}
                              </span>
                            ) : c.status === "OPEN" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">{c.status}</span>
                            ) : c.status === "IN_PROGRESS" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <Clock className="h-3.5 w-3.5" /> In progress
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                            )}
                          </div>
                        </div>
                        {canResolve && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => setResolveDialog({ open: true, id: c.id })}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Alerts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Important updates will appear here.</p>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No alerts</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">You&apos;re all caught up. Important updates will appear here when available.</p>
                </div>
              </div>
            )}

            {activeTab === "profile" && (() => {
              const profile = useRealApi ? null : ownerProfiles.find(p => p.ownerUser === currentOwner);
              const displayProfile = useRealApi ? apiProfile : profile;
              return (
                <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-900/50 dark:to-sky-950/20 px-5 md:px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Owner Profile</h2>
                        <VerificationBadge status={verificationStatus} showIcon className="text-xs" approvedAsActiveStyle needsResubmit={profileUpdatedAfterLoad} onVerifyClick={demoMode ? () => setDemoLoginPromptOpen(true) : (useRealApi ? () => setVerifySubmitDialogOpen(true) : undefined)} />
                        <TwoFactorBadge enabled={profile2faEnabled ?? false} className="text-xs" onEnableClick={profile2faEnabled === false ? (demoMode ? () => setDemoLoginPromptOpen(true) : () => setTwoFactorDialogOpen(true)) : undefined} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { if (demoMode) { setDemoLoginPromptOpen(true); return; } if (profile) setOwnerProfileForm({ fullName: profile.name, gender: profile.gender, dateOfBirth: profile.dob, aadharNumber: profile.aadhar, mobile: profile.mobile, email: profile.email, village: profile.village, postOffice: profile.postOffice, policeStation: profile.policeStation, state: profile.state, district: profile.district, pincode: profile.pincode }); else if (apiProfile) setOwnerProfileForm(mapApiProfileToOwnerForm(apiProfile)); setProfileUpdateDialogOpen(true); }}
                          disabled={useRealApi && profileLoading}
                          className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 disabled:pointer-events-none px-4 py-1.5 text-xs font-medium transition-colors min-w-[140px] justify-center"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Update profile
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    {(useRealApi && profileLoading) ? (
                      <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-3" />
                        <p className="text-sm text-muted-foreground">Loading profile…</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Account
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                              <p className="text-sm font-medium text-foreground truncate">{decodedToken?.sub ?? (useRealApi && apiProfile ? apiProfile.userName : currentOwner)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                              <p className="text-sm font-medium text-foreground truncate">{decodedToken?.email ?? (useRealApi && apiProfile ? (apiProfile.email ?? apiProfile.userName) : (profile ? (profile as { email?: string }).email : "—"))}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex flex-col justify-center">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                              <Badge variant="secondary" className="w-fit">Owner</Badge>
                            </div>
                          </div>
                        </div>
                        {useRealApi ? (
                          <div>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Personal details
                            </h3>
                            {apiProfile ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full name</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.fullName || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mobile</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.mobile || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date of birth</p>
                                  <p className="text-sm font-medium text-foreground">{formatDob(apiProfile.dateOfBirth) || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.gender || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ID</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.idType && apiProfile.idNumber ? `${apiProfile.idType}: ${apiProfile.idNumber}` : (apiProfile.aadharNumber ? `Aadhar: XXXX-XXXX-${apiProfile.aadharNumber.slice(-4)}` : "—")}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.address ? `${apiProfile.address}, ${apiProfile.city}, ${apiProfile.state} – ${apiProfile.pinCode}` : "—"}</p>
                                </div>
                                {(apiProfile.submittedAt || apiProfile.reviewedAt) && (
                                  <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    {apiProfile.submittedAt && <span>Submitted: {new Date(apiProfile.submittedAt).toLocaleString()}</span>}
                                    {apiProfile.reviewedAt && <span>Reviewed: {new Date(apiProfile.reviewedAt).toLocaleString()}</span>}
                                  </div>
                                )}
                                {apiProfile.status === "REJECTED" && apiProfile.adminNote && (
                                  <div className="sm:col-span-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                                    <p className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide mb-1">Admin note</p>
                                    <p className="text-sm text-foreground">{apiProfile.adminNote}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 p-8 text-center">
                                <p className="text-sm font-medium text-foreground mb-1">No profile details yet</p>
                                <p className="text-xs text-muted-foreground mb-4">Use <strong>Update profile</strong> to add your details, then <strong>Submit for verification</strong> for admin review.</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setProfileUpdateDialogOpen(true); }}
                                    className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Update profile
                                  </button>
                                  <button
                                    type="button"
                                    disabled
                                    title="Update your profile first to submit for verification"
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-600 bg-transparent text-slate-400 dark:text-slate-500 px-2.5 py-1 text-xs font-medium cursor-not-allowed"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Submit for verification
                                  </button>
                                </div>
                                {profileError && (
                                  <Button size="sm" variant="ghost" className="mt-4 text-muted-foreground" onClick={() => fetchProfileFromDb()}>Retry load</Button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Personal details
                            </h3>
                            {profile ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full name</p>
                                  <p className="text-sm font-medium text-foreground">{profile.name}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mobile</p>
                                  <p className="text-sm font-medium text-foreground">{profile.mobile}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date of birth</p>
                                  <p className="text-sm font-medium text-foreground">{formatDob(profile.dob)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                                  <p className="text-sm font-medium text-foreground">{profile.gender}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                  <p className="text-sm font-medium text-foreground">{profile.village}, {profile.postOffice}, {profile.policeStation} – {profile.pincode}</p>
                                </div>
                                {(profile as { adminNote?: string }).adminNote && (
                                  <div className="sm:col-span-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                                    <p className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide mb-1">Admin note</p>
                                    <p className="text-sm text-foreground">{(profile as { adminNote?: string }).adminNote}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 p-8 text-center">
                                <p className="text-sm text-muted-foreground mb-2">No profile details yet.</p>
                                <Button size="sm" asChild><Link to="/owner/profile">Complete profile</Link></Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {(!profileLoading || !useRealApi) && (
                      <div className="mt-8">
                        <TwoFactorSettings initialEnabled={profile2faEnabled ?? false} onEnabledChange={setProfile2faEnabled} hideEnableButton />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Add/Edit Property Dialog — same structure as Admin Dashboard */}
      <Dialog open={propertyDialogOpen !== null} onOpenChange={(open) => { if (!open) { setPropertyDialogOpen(null); setEditingId(null); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{propertyDialogOpen === "add" ? "Add Property" : "Edit Property"}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Fields marked with <span className="text-destructive">*</span> are required. New listings are set to <strong>PENDING</strong>; admin can approve or reject.</p>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Basic details</p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Property title" />
                </div>
                <div className="grid gap-2">
                  <Label>Description <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">({form.description.length} / {DESCRIPTION_MAX_LENGTH})</span></Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))} placeholder="Describe the property" rows={3} maxLength={DESCRIPTION_MAX_LENGTH} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Type <span className="text-destructive">*</span></Label>
                    <Select value={form.propertyType} onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Price (₹/month) <span className="text-destructive">*</span></Label>
                    <Input type="number" min={0} value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : 0 }))} placeholder="e.g. 25000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Specifications</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="grid gap-2">
                  <Label>Bedrooms</Label>
                  <Input type="number" min={0} value={form.bedrooms ?? ""} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
                </div>
                <div className="grid gap-2">
                  <Label>Bathrooms</Label>
                  <Input type="number" min={0} value={form.bathrooms ?? ""} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
                </div>
                <div className="grid gap-2">
                  <Label>Area (sq ft)</Label>
                  <Input type="number" min={0} value={form.area ?? ""} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
                </div>
                <div className="grid gap-2">
                  <Label>Furnishing</Label>
                  <Select value={form.furnishing ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, furnishing: v || null }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FURNISHED">Furnished</SelectItem>
                      <SelectItem value="SEMI_FURNISHED">Semi Furnished</SelectItem>
                      <SelectItem value="UNFURNISHED">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Amenities</Label>
                <p className="text-xs text-muted-foreground">Select or add amenities.</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((a) => {
                    const selected = Array.isArray(form.amenities) && form.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          amenities: selected ? (f.amenities ?? []).filter((x) => x !== a) : [...(f.amenities ?? []), a],
                        }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${selected ? "bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500" : "bg-muted/50 border-slate-200 dark:border-slate-700 hover:bg-muted"}`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.includes(a)).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                      {a}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))} className="hover:text-destructive" aria-label="Remove">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add custom (e.g. Pet friendly)"
                    className="flex-1 min-w-[120px] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v && !(form.amenities ?? []).includes(v)) setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && !(form.amenities ?? []).includes(v)) { setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] })); e.target.value = ""; }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Location</p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label>State <span className="text-destructive">*</span></Label>
                    <Select value={form.state || "_"} onValueChange={(v) => setForm((f) => ({ ...f, state: v === "_" ? "" : v, city: "", pinCode: "" }))}>
                      <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent><SelectItem value="_">Select state</SelectItem>{indianStates.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>City <span className="text-destructive">*</span></Label>
                    {formCities.length > 0 ? (
                      <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select City" /></SelectTrigger>
                        <SelectContent className="max-h-60">{formCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input className="h-9 w-full" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Bengaluru" />
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Pin code <span className="text-destructive">*</span></Label>
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          className={`h-9 w-full ${form.pinCode.length === 6 && form.state && isPincodeValidForState(form.pinCode, form.state) ? "pr-8" : ""}`}
                          value={form.pinCode}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setForm((f) => ({ ...f, pinCode: v })); }}
                          placeholder="6 digits"
                          maxLength={6}
                          inputMode="numeric"
                        />
                        {form.pinCode.length === 6 && form.state && isPincodeValidForState(form.pinCode, form.state) && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-green-600" aria-hidden><Check className="h-4 w-4" strokeWidth={2.5} /></span>
                        )}
                      </div>
                      {form.pinCode.length > 0 && form.pinCode.length !== 6 && <p className="text-[10px] text-muted-foreground">Enter exactly 6 digits</p>}
                      {form.pinCode.length === 6 && form.state && !isPincodeValidForState(form.pinCode, form.state) && <p className="text-[10px] text-destructive">This pin code does not belong to the selected state.</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Latitude</Label><Input type="number" step="any" value={form.latitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" /></div>
                  <div className="grid gap-2"><Label>Longitude</Label><Input type="number" step="any" value={form.longitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" /></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Media</p>
              <div className="grid gap-2">
                <Label>Image URLs (one per line)</Label>
                <Textarea value={Array.isArray(form.images) ? form.images.join("\n") : ""} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))} placeholder="https://..." rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => { setPropertyDialogOpen(null); setEditingId(null); }}>Cancel</Button>
            <Button
              onClick={() => openConfirm(editingId ? "Update property?" : "Create property?", editingId ? `Save changes to "${form.title}"?` : "This will add a new property listing. Status will be PENDING until admin approves.", editingId ? "Update" : "Create", "default", handleSubmitProperty)}
              disabled={!form.title?.trim() || !form.description?.trim() || !form.price || !form.address?.trim() || !form.city?.trim() || !form.state || !/^\d{6}$/.test((form.pinCode ?? "").trim())}
            >
              {propertyDialogOpen === "add" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update profile dialog (owner) — same form as Owner Profile Setup */}
      <Dialog open={profileUpdateDialogOpen} onOpenChange={(open) => { setProfileUpdateDialogOpen(open); if (!open) setOwnerProfileForm({ fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", email: "", village: "", postOffice: "", policeStation: "", state: "", district: "", pincode: "" }); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Update profile</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Update your details. Use &quot;Submit for verification&quot; when you want admin to review.</p>
          <form className="space-y-6 py-3" onSubmit={(e) => { e.preventDefault(); openConfirm("Save profile?", "Your changes will be saved. Click the Verify badge to submit for review.", "Save", "default", () => handleUpdateOwnerProfile()); }}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.fullName} onChange={e => setOwnerProfileForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Rajesh Kumar" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.gender} onValueChange={v => setOwnerProfileForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <DatePickerSelects
                    label="Date of birth *"
                    value={ownerProfileForm.dateOfBirth}
                    onChange={(v) => setOwnerProfileForm(f => ({ ...f, dateOfBirth: v }))}
                    maxDate={new Date()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Aadhar No <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.aadharNumber} onChange={e => setOwnerProfileForm(f => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))} placeholder="e.g. 123456789012" maxLength={12} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile <span className="text-destructive">*</span></Label>
                  <MobileInput hideLabel value={ownerProfileForm.mobile} onChange={v => setOwnerProfileForm(f => ({ ...f, mobile: v }))} placeholder="9876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={ownerProfileForm.email} onChange={e => setOwnerProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. rajesh@email.com" className="max-w-xs" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Address Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.state} onValueChange={v => setOwnerProfileForm(f => ({ ...f, state: v, district: "", pincode: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-60">{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>District <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.district} onValueChange={v => setOwnerProfileForm(f => ({ ...f, district: v }))} disabled={!ownerProfileForm.state}>
                    <SelectTrigger><SelectValue placeholder={ownerProfileForm.state ? "Select District" : "Select state first"} /></SelectTrigger>
                    <SelectContent className="max-h-60">{(indianStates.find(s => s.code === ownerProfileForm.state)?.districts ?? []).map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pin code <span className="text-destructive">*</span></Label>
                  {statePincodeRanges[ownerProfileForm.state]?.samples?.length ? (
                    <Select value={ownerProfileForm.pincode} onValueChange={v => setOwnerProfileForm(f => ({ ...f, pincode: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select Pin Code" /></SelectTrigger>
                      <SelectContent>{(statePincodeRanges[ownerProfileForm.state]?.samples ?? []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input placeholder="e.g. 560001" maxLength={6} value={ownerProfileForm.pincode} onChange={e => setOwnerProfileForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state) ? "border-destructive" : ""} />
                      {ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Village / Town / Locality <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.village} onChange={e => setOwnerProfileForm(f => ({ ...f, village: e.target.value }))} placeholder="e.g. Gandhi Nagar" />
                </div>
                <div className="space-y-1.5">
                  <Label>Post office <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.postOffice} onChange={e => setOwnerProfileForm(f => ({ ...f, postOffice: e.target.value }))} placeholder="e.g. Sadar Post Office" />
                </div>
                <div className="space-y-1.5">
                  <Label>Police station <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.policeStation} onChange={e => setOwnerProfileForm(f => ({ ...f, policeStation: e.target.value }))} placeholder="e.g. Kotwali" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setProfileUpdateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updatingProfile}>{(updatingProfile ? "Saving..." : "Save")}</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit profile for verification (owner) */}
      <Dialog open={profileSubmitDialogOpen} onOpenChange={(open) => { setProfileSubmitDialogOpen(open); if (!open) setOwnerProfileForm({ fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", email: "", village: "", postOffice: "", policeStation: "", state: "", district: "", pincode: "" }); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{apiProfile ? "Submit for verification" : "Owner Profile Setup"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{apiProfile ? "Submit your profile for admin review." : "Complete your profile to get verified."}</p>
          <form className="space-y-6 py-3" onSubmit={(e) => { e.preventDefault(); openConfirm("Submit for review?", "Your profile will be sent for admin verification.", "Submit", "default", () => handleSubmitOwnerProfileForReview()); }}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.fullName} onChange={e => setOwnerProfileForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Rajesh Kumar" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.gender} onValueChange={v => setOwnerProfileForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <DatePickerSelects
                    label="Date of birth *"
                    value={ownerProfileForm.dateOfBirth}
                    onChange={(v) => setOwnerProfileForm(f => ({ ...f, dateOfBirth: v }))}
                    maxDate={new Date()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Aadhar No <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.aadharNumber} onChange={e => setOwnerProfileForm(f => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))} placeholder="e.g. 123456789012" maxLength={12} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile <span className="text-destructive">*</span></Label>
                  <MobileInput hideLabel value={ownerProfileForm.mobile} onChange={v => setOwnerProfileForm(f => ({ ...f, mobile: v }))} placeholder="9876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={ownerProfileForm.email} onChange={e => setOwnerProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. rajesh@email.com" className="max-w-xs" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Address Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.state} onValueChange={v => setOwnerProfileForm(f => ({ ...f, state: v, district: "", pincode: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-60">{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>District <span className="text-destructive">*</span></Label>
                  <Select value={ownerProfileForm.district} onValueChange={v => setOwnerProfileForm(f => ({ ...f, district: v }))} disabled={!ownerProfileForm.state}>
                    <SelectTrigger><SelectValue placeholder={ownerProfileForm.state ? "Select District" : "Select state first"} /></SelectTrigger>
                    <SelectContent className="max-h-60">{(indianStates.find(s => s.code === ownerProfileForm.state)?.districts ?? []).map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pin code <span className="text-destructive">*</span></Label>
                  {statePincodeRanges[ownerProfileForm.state]?.samples?.length ? (
                    <Select value={ownerProfileForm.pincode} onValueChange={v => setOwnerProfileForm(f => ({ ...f, pincode: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select Pin Code" /></SelectTrigger>
                      <SelectContent>{(statePincodeRanges[ownerProfileForm.state]?.samples ?? []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input placeholder="e.g. 560001" maxLength={6} value={ownerProfileForm.pincode} onChange={e => setOwnerProfileForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state) ? "border-destructive" : ""} />
                      {ownerProfileForm.state && ownerProfileForm.pincode.length === 6 && !isPincodeValidForState(ownerProfileForm.pincode, ownerProfileForm.state) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Village / Town / Locality <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.village} onChange={e => setOwnerProfileForm(f => ({ ...f, village: e.target.value }))} placeholder="e.g. Gandhi Nagar" />
                </div>
                <div className="space-y-1.5">
                  <Label>Post office <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.postOffice} onChange={e => setOwnerProfileForm(f => ({ ...f, postOffice: e.target.value }))} placeholder="e.g. Sadar Post Office" />
                </div>
                <div className="space-y-1.5">
                  <Label>Police station <span className="text-destructive">*</span></Label>
                  <Input value={ownerProfileForm.policeStation} onChange={e => setOwnerProfileForm(f => ({ ...f, policeStation: e.target.value }))} placeholder="e.g. Kotwali" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setProfileSubmitDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingProfile}>
              <FileText className="h-4 w-4 mr-2" />
              {submittingProfile ? "Submitting..." : "Submit for Admin Review"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailItem?.type === "request" ? "Request Details" : detailItem?.type === "complaint" ? "Complaint Details" : "Payment Details"}
            </DialogTitle>
          </DialogHeader>
          {detailItem?.type === "complaint" && (() => {
            const c = detailItem.data as ComplaintDTO & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string; raisedByRole?: string; againstRole?: string; adminNote?: string };
            const subject = c.subject ?? c.title ?? "";
            const raisedBy = c.raisedByUserName ?? c.raisedBy ?? "";
            const related = c.relatedUserName ?? c.againstUser ?? "";
            const propertyTitle = myProperties.find((p) => p.id === c.propertyId)?.title ?? c.propertyTitle ?? (c.propertyId ? `Property #${c.propertyId}` : "—");
            const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";
            const statusCls = c.status === "OPEN" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" : c.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
            const priorityCls = c.priority === "HIGH" ? "bg-rose-100 text-rose-800" : c.priority === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
            const canResolve = (c.relatedUserName === currentOwner || c.againstUser === currentOwner) && !isResolved;
            return (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                  <div>
                    <p className="text-sm font-medium text-foreground">{subject || "No subject"}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description || "—"}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">People & property</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Raised by</span><p className="font-medium text-foreground">{raisedBy || "—"}</p></div>
                    <div><span className="text-muted-foreground">Related to</span><p className="font-medium text-foreground">{related || "—"}</p></div>
                    {c.assignedToUserName && <div className="sm:col-span-2"><span className="text-muted-foreground">Assigned to</span><p className="font-medium text-foreground">{c.assignedToUserName}</p></div>}
                    <div className="sm:col-span-2"><span className="text-muted-foreground">Property</span><p className="font-medium text-foreground">{propertyTitle}</p></div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status & dates</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">Status</span>
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 mt-0.5">
                          <CheckCircle className="h-3.5 w-3.5" /> {c.status}
                        </span>
                      ) : c.status === "OPEN" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300 mt-0.5">
                          {c.status}
                        </span>
                      ) : c.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 mt-0.5">
                          <Clock className="h-3.5 w-3.5 inline" /> In progress
                        </span>
                      ) : (
                        <Badge variant="outline" className={`${statusCls} mt-0.5`}>{c.status}</Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Priority</span>
                      <Badge variant="outline" className={`${priorityCls} mt-0.5`}>{c.priority}</Badge>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Created</span>
                      <p className="text-sm font-medium">{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                </div>
                {(c.resolutionNote || c.adminNote) && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution & notes</p>
                    {c.resolutionNote && <div><span className="text-xs text-muted-foreground">Resolution note</span><p className="text-sm text-foreground mt-0.5">{c.resolutionNote}</p></div>}
                    {c.adminNote && <div><span className="text-xs text-muted-foreground">Admin note</span><p className="text-sm text-foreground mt-0.5">{c.adminNote}</p></div>}
                  </div>
                )}
                {/* Actions: Update status & Resolve (when assignee / owner) */}
                {useRealApi && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={c.status}
                        onValueChange={(v) => {
                          const newStatus = v as ComplaintStatus;
                          if (newStatus !== c.status) setStatusUpdateDialog({ open: true, complaintId: c.id, newStatus, currentStatus: c.status, message: "" });
                        }}
                        disabled={complaintStatusUpdating}
                      >
                        <SelectTrigger className="min-w-[152px] w-[152px] h-8 text-xs rounded-md border-violet-500/50 text-violet-600 dark:text-violet-400 bg-transparent hover:bg-violet-50 dark:hover:bg-violet-900/20 focus:ring-violet-500/50 focus:ring-offset-0 pl-2.5">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <SelectValue placeholder="Status" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN" className="text-rose-700 dark:text-rose-300 focus:bg-rose-50 focus:text-rose-800 dark:focus:bg-rose-900/30 dark:focus:text-rose-200">OPEN</SelectItem>
                          <SelectItem value="IN_PROGRESS" className="text-amber-700 dark:text-amber-300 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200">IN_PROGRESS</SelectItem>
                          <SelectItem value="RESOLVED" className="text-emerald-700 dark:text-emerald-300 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200">RESOLVED</SelectItem>
                          <SelectItem value="CLOSED" className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200">CLOSED</SelectItem>
                        </SelectContent>
                      </Select>
                      {canResolve && (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => { setResolveDialog({ open: true, id: c.id }); setDetailItem(null); }}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve</Button>
                      )}
                    </div>
                    {complaintStatusUpdating && <p className="text-xs text-muted-foreground">Updating…</p>}
                  </div>
                )}
                {useRealApi && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {complaintMessages.length === 0 && <p className="text-xs text-muted-foreground">No messages yet.</p>}
                      {complaintMessages.map((m) => (
                        <div key={m.id ?? m.createdAt ?? m.messageText} className="rounded-lg bg-muted/50 p-3 text-sm border border-slate-200/50 dark:border-slate-700/50">
                          <p className="font-medium text-xs text-muted-foreground">{m.senderUserName}</p>
                          <p className="mt-0.5 text-foreground">{m.messageText}</p>
                          {m.createdAt && <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleString()}</p>}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSendComplaintMessage(); }} className="flex gap-2">
                      <Input value={complaintMessageText} onChange={(e) => setComplaintMessageText(e.target.value)} placeholder="Type a message..." className="flex-1" />
                      <Button type="submit" size="sm" disabled={!complaintMessageText.trim() || complaintMessageSending}>{complaintMessageSending ? "Sending…" : "Send"}</Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}
          {detailItem?.type === "request" && (() => {
            const b = detailItem.data;
            return (
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Property</p><p className="text-sm font-medium">{b.propertyTitle}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Tenant</p><p className="text-sm font-medium">{b.tenantName}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Type</p><Badge variant="secondary">{b.type}</Badge></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Badge variant={b.status === "APPROVED" ? "default" : b.status === "REQUESTED" ? "secondary" : "destructive"}>{b.status}</Badge></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Visit Date</p><p className="text-sm font-medium">{new Date(b.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                {b.note && <div className="space-y-1 col-span-2"><p className="text-xs text-muted-foreground">Note</p><p className="text-sm">{b.note}</p></div>}
              </div>
            );
          })()}
          {detailItem?.type === "payment" && (() => {
            const p = detailItem.data;
            return (
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Property</p><p className="text-sm font-medium">{p.propertyTitle}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Tenant</p><p className="text-sm font-medium">{p.tenantName}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-bold">₹{p.amount.toLocaleString()}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Month</p><p className="text-sm font-medium">{p.month}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Badge variant={p.status === "PAID" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"}>{p.status}</Badge></div>
                {p.paidAt && <div className="space-y-1"><p className="text-xs text-muted-foreground">Paid At</p><p className="text-sm font-medium">{new Date(p.paidAt).toLocaleDateString("en-IN")}</p></div>}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onOpenChange={(open) => { if (!open) setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" }); setComplaintDialog(open); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Raise a Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Property</Label><Select value={complaintForm.propertyId?.toString() || ""} onValueChange={v => setComplaintForm(f => ({ ...f, propertyId: +v, relatedUserId: 0 }))}><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger><SelectContent>{myProperties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>)}</SelectContent></Select></div>
            {useRealApi ? (
              <div className="space-y-2">
                <Label>Against (optional)</Label>
                <Select
                  value={complaintForm.relatedUserId && complaintForm.relatedUserId > 0 ? String(complaintForm.relatedUserId) : COMPLAINT_NONE_VALUE}
                  onValueChange={(v) => setComplaintForm((f) => ({ ...f, relatedUserId: v === COMPLAINT_NONE_VALUE ? 0 : Number(v) }))}
                  disabled={againstOptionsLoading || !complaintForm.propertyId}
                >
                  <SelectTrigger><SelectValue placeholder={againstOptionsLoading ? "Loading…" : complaintForm.propertyId ? "Select someone (optional)" : "Select a property first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COMPLAINT_NONE_VALUE}>— None —</SelectItem>
                    {againstOptions.map((o) => <SelectItem key={o.userId} value={o.userId.toString()}>{o.userName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {complaintForm.propertyId && !againstOptionsLoading && againstOptions.length === 0 && <p className="text-xs text-muted-foreground">No one associated with this property to select.</p>}
              </div>
            ) : (
              <div className="space-y-2"><Label>Against (optional)</Label><Input value={complaintForm.againstUser} onChange={e => setComplaintForm(f => ({ ...f, againstUser: e.target.value }))} placeholder="e.g. username (optional)" /></div>
            )}
            <div className="space-y-2"><Label>Subject</Label><Input value={complaintForm.title} onChange={e => setComplaintForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={complaintForm.description} onChange={e => setComplaintForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Provide details about the complaint..." /></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={complaintForm.priority} onValueChange={v => setComplaintForm(f => ({ ...f, priority: v as ComplaintPriority }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setComplaintDialog(false)}>Cancel</Button>
            <button
              type="button"
              onClick={() => openConfirm("Raise complaint?", "This will submit the complaint for review.", "Submit", "default", handleRaiseComplaint)}
              disabled={!complaintForm.title?.trim() || !complaintForm.propertyId}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Complaint Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => { if (!open) { setResolveDialog({ open: false, id: 0 }); setResolveNote(""); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Resolution Note</Label><Textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Describe how the issue was resolved..." rows={3} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, id: 0 })}>Cancel</Button>
            <button
              type="button"
              onClick={() => openConfirm("Resolve complaint?", "This will mark the complaint as resolved.", "Mark Resolved", "default", handleResolveComplaint)}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for actions */}
      <Dialog open={confirmAction.open} onOpenChange={(open) => !open && setConfirmAction((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmAction.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmAction.description}</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button variant={confirmAction.variant === "destructive" ? "destructive" : "default"} onClick={runConfirm}>{confirmAction.confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update complaint status dialog */}
      <Dialog open={statusUpdateDialog.open} onOpenChange={(open) => !open && setStatusUpdateDialog({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" })}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Update complaint status</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">You can add an optional message (e.g. resolution note when resolving).</p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={statusUpdateDialog.message}
                onChange={(e) => setStatusUpdateDialog((d) => ({ ...d, message: e.target.value }))}
                placeholder={statusUpdateDialog.newStatus === "RESOLVED" ? "e.g. Issue fixed. Tap replaced." : "Add a note..."}
                rows={3}
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setStatusUpdateDialog({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/50 bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-500/20 dark:hover:bg-slate-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStatusUpdateDialogConfirm}
              disabled={complaintStatusUpdating}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <CheckCircle className="h-4 w-4" />
              {complaintStatusUpdating ? "Updating…" : "Update"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {useRealApi && (
        <SubmitProfileForReviewDialog
          open={verifySubmitDialogOpen}
          onOpenChange={setVerifySubmitDialogOpen}
          submitting={submittingProfile}
          onConfirm={() => {
            if (apiProfile) setOwnerProfileForm(mapApiProfileToOwnerForm(apiProfile));
            setProfileSubmitDialogOpen(true);
          }}
        />
      )}

      {demoMode && <DemoModeLoginPrompt open={demoLoginPromptOpen} onOpenChange={setDemoLoginPromptOpen} message="Please sign in to access this feature. Demo mode shows a preview only." />}
      {useRealApi && (
        <Dialog open={twoFactorDialogOpen} onOpenChange={setTwoFactorDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Two-factor authentication</DialogTitle>
            </DialogHeader>
            <TwoFactorSettings initialEnabled={profile2faEnabled ?? false} onEnabledChange={(enabled) => { setProfile2faEnabled(enabled); if (enabled) setTwoFactorDialogOpen(false); }} autoStartEnableFlow onCancel={() => setTwoFactorDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
