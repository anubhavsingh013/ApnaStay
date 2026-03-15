import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher, { setDemoUser } from "@/features/demo/DemoRoleSwitcher";
import { useDemoData, type AdminProfileItem, type OwnerProfile, type BrokerProfile, type TenantProfile } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetUsers,
  adminGetRoles,
  adminUpdateRole,
  adminUpdateLockStatus,
  adminUpdateEnabledStatus,
  adminUpdatePassword,
  adminUpdateExpiryStatus,
  adminUpdateCredentialsExpiry,
  getProperties,
  getPropertiesAdminAll,
  createProperty,
  updateProperty,
  deleteProperty as apiDeleteProperty,
  adminApproveProperty as apiApproveProperty,
  adminRejectProperty as apiRejectProperty,
  adminUpdatePropertyStatus,
  adminGetProfileList,
  adminApproveProfile as apiApproveProfile,
  adminRejectProfile as apiRejectProfile,
  getComplaints,
  getComplaintById,
  getComplaintMessages,
  sendComplaintMessage,
  assignComplaint,
  resolveComplaint,
  updateComplaintStatus as apiUpdateComplaintStatus,
  get2faStatus,
  type PropertyDTO,
  type PropertyRequest,
  type PropertyStatus,
  type ProfileDTO,
  type ProfileRole,
  type ComplaintDTO,
  type ComplaintStatus,
  type ComplaintMessageDTO,
  getDecodedToken,
} from "@/lib/api";
import {
  Users, ShieldCheck, Building2, Lock, Unlock, Ban, CheckCircle,
  Key, Trash2, Eye, Search, AlertCircle, Clock, FileText, UserPlus,
  IndianRupee, Bell, ChevronRight, User, MapPin, Phone, Mail, Calendar,
  CalendarClock, CalendarX2, Plus, Pencil, Check, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { DemoModeLoginPrompt } from "@/features/demo/DemoModeLoginPrompt";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { indianStates, statePincodeRanges } from "@/constants/indianStates";
import { StatusFilterDropdown } from "@/components/common/StatusFilterDropdown";

const tabs = [
  { label: "Overview", icon: Building2, id: "overview" },
  { label: "Account", icon: Key, id: "account" },
  { label: "Users", icon: Users, id: "users" },
  { label: "Properties", icon: Building2, id: "properties" },
  { label: "Profile reviews", icon: Eye, id: "requests" },
  { label: "Complaints", icon: FileText, id: "complaints" },
  { label: "Payments", icon: IndianRupee, id: "payments" },
  { label: "Alerts", icon: Bell, id: "notifications" },
  { label: "Roles", icon: ShieldCheck, id: "roles" },
];

const formatDob = (dob: string) => {
  if (!dob) return "—";
  const d = new Date(dob);
  return isNaN(d.getTime()) ? dob : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** Normalize profile (API or demo) for list display and filtering */
function getProfileDisplay(p: AdminProfileItem | ProfileDTO): { name: string; user: string; profileType: "OWNER" | "BROKER" | "USER"; status: string; submittedAt: string } {
  if ("profileRole" in p) {
    const role = p.profileRole as ProfileRole;
    const profileType = role === "ROLE_OWNER" ? "OWNER" : role === "ROLE_BROKER" ? "BROKER" : "USER";
    return { name: p.fullName ?? "", user: p.userName ?? "", profileType, status: p.status ?? "PENDING", submittedAt: p.submittedAt ?? "" };
  }
  const a = p as AdminProfileItem;
  const name = "name" in a ? (a as { name: string }).name : "";
  const user = "ownerUser" in a ? (a as { ownerUser: string }).ownerUser : "brokerUser" in a ? (a as { brokerUser: string }).brokerUser : "tenantUser" in a ? (a as { tenantUser: string }).tenantUser : "";
  return { name, user, profileType: a.profileType, status: a.status, submittedAt: a.submittedAt };
}

/** User from GET /api/admin/getusers (list includes role) */
export interface AdminUserListItem {
  userId: number;
  userName: string;
  email: string | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean | null;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  enabled: boolean;
  credentialsExpiryDate: string;
  accountExpiryDate: string;
  createdDate: string;
  updatedDate: string;
  signUpMethod?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  role?: { roleId: number; roleName: string };
}

/** User from GET /api/admin/user/:id (same shape; role always present) */
export interface AdminUserDetail extends AdminUserListItem {
  role: { roleId: number; roleName: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const {
    demoMode,
    properties, addProperty: demoAddProperty, updateProperty: demoUpdateProperty, approveProperty, rejectProperty, deleteProperty,
    users: demoUsers, updateUserRole, toggleUserLock, toggleUserEnabled, roles: demoRoles,
    complaints, updateComplaintStatus, payments,
    notifications, markNotificationRead,
    ownerProfiles, approveOwnerProfile, rejectOwnerProfile,
    brokerProfiles, approveBrokerProfile, rejectBrokerProfile,
    tenantProfiles, approveTenantProfile, rejectTenantProfile,
    getAllProfiles,
  } = useDemoData();

  const [activeTab, setActiveTab] = useState("overview");
  useEffect(() => {
    if (activeTab === "settings") setActiveTab("overview");
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const [apiUsers, setApiUsers] = useState<AdminUserListItem[]>([]);
  const [apiRoles, setApiRoles] = useState<{ roleId: number; roleName: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const [pwDialog, setPwDialog] = useState<{ open: boolean; userId: number; username: string }>({ open: false, userId: 0, username: "" });
  const [newPassword, setNewPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", onConfirm: () => {} });
  const [complaintNote, setComplaintNote] = useState("");
  const [complaintActionId, setComplaintActionId] = useState<number | null>(null);
  const [apiComplaints, setApiComplaints] = useState<ComplaintDTO[]>([]);
  const [apiComplaintsLoading, setApiComplaintsLoading] = useState(false);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | "">("");
  const [complaintMessages, setComplaintMessages] = useState<ComplaintMessageDTO[]>([]);
  const [complaintMessageText, setComplaintMessageText] = useState("");
  const [complaintMessageSending, setComplaintMessageSending] = useState(false);
  const [complaintStatusUpdating, setComplaintStatusUpdating] = useState(false);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{ open: boolean; complaintId: number | null; newStatus: ComplaintStatus | null; currentStatus: ComplaintStatus | null; message: string }>({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; complaintId: number | null; assignToUserId: number }>({ open: false, complaintId: null, assignToUserId: 0 });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [profileReviewNote, setProfileReviewNote] = useState("");
  const [profileTypeFilter, setProfileTypeFilter] = useState<string | null>(null);
  const [profileStatusFilter, setProfileStatusFilter] = useState<string | null>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [detailItem, setDetailItem] = useState<{ type: string; data: any } | null>(null);
  const [viewProfile, setViewProfile] = useState<AdminProfileItem | ProfileDTO | null>(null);
  const [apiProfilesList, setApiProfilesList] = useState<ProfileDTO[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileConfirmDialog, setProfileConfirmDialog] = useState<{
    open: boolean;
    action: "approve" | "reject";
    profile: AdminProfileItem | ProfileDTO | null;
  }>({ open: false, action: "approve", profile: null });
  const [profileActionSubmitting, setProfileActionSubmitting] = useState(false);
  const [account2faEnabled, setAccount2faEnabled] = useState<boolean | null>(null);
  const [account2faDialogOpen, setAccount2faDialogOpen] = useState(false);
  const [demoLoginPromptOpen, setDemoLoginPromptOpen] = useState(false);

  const [apiProperties, setApiProperties] = useState<PropertyDTO[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<string | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [propertyDialogOpen, setPropertyDialogOpen] = useState<"add" | "edit" | null>(null);
  const [editingProperty, setEditingProperty] = useState<PropertyDTO | null>(null);
  const [propertySubmitting, setPropertySubmitting] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyRequest>({
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
  });

  const displayName = demoMode ? "admin_user" : (user?.username ?? "Admin");
  const decodedToken = getDecodedToken();
  const useRealApi = !demoMode && isAdmin;
  const usersList = useRealApi ? apiUsers : (demoUsers as unknown as (AdminUserListItem & { role?: { roleId: number; roleName: string } })[]);
  const rolesList = useRealApi ? apiRoles : demoRoles;

  useEffect(() => {
    if (!user || !isAdmin || demoMode) return;
    setUsersLoading(true);
    Promise.all([adminGetUsers(), adminGetRoles()])
      .then(([usersRes, rolesRes]) => {
        const list = (usersRes as { data: AdminUserListItem[] }).data ?? [];
        setApiUsers(list);
        setApiRoles((rolesRes as { data: { roleId: number; roleName: string }[] }).data ?? []);
      })
      .catch((err) => toast({ title: "Could not load users", description: err?.message, variant: "destructive" }))
      .finally(() => setUsersLoading(false));
  }, [user, isAdmin, demoMode, toast]);

  useEffect(() => {
    if (user === null) return;
    if (!demoMode && !isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, demoMode, navigate]);

  useEffect(() => {
    if (demoMode && location.pathname.startsWith("/admin")) setDemoUser("admin_user");
  }, [demoMode, location.pathname]);

  const refetchProperties = () => {
    if (!user || !isAdmin || demoMode) return;
    setPropertiesLoading(true);
    getPropertiesAdminAll()
      .then((res) => setApiProperties((res as { data: PropertyDTO[] }).data ?? []))
      .catch((err) => toast({ title: "Could not load properties", description: err?.message, variant: "destructive" }))
      .finally(() => setPropertiesLoading(false));
  };

  useEffect(() => {
    refetchProperties();
  }, [user, isAdmin, demoMode]);

  useEffect(() => {
    if (!useRealApi) return;
    setProfilesLoading(true);
    adminGetProfileList()
      .then((res) => setApiProfilesList((res as { data: ProfileDTO[] }).data ?? []))
      .catch((err) => toast({ title: "Could not load profiles", description: err?.message, variant: "destructive" }))
      .finally(() => setProfilesLoading(false));
  }, [useRealApi, toast]);

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

  useEffect(() => {
    if (!useRealApi) return;
    get2faStatus()
      .then((res) => setAccount2faEnabled(res.is2faEnabled))
      .catch(() => setAccount2faEnabled(false));
  }, [useRealApi]);

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

  /** Open user detail from list data (no API call – we already have full user from getusers) */
  const openUserDetail = (u: AdminUserListItem) => {
    setViewingUserId(u.userId);
    setDetailUser(u.role ? ({ ...u, role: u.role } as AdminUserDetail) : null);
  };

  const showSuccess = (message: string, description?: string) => {
    toast({ title: message, description, variant: "default" });
  };

  const handleUpdateRole = (userId: number, roleName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (useRealApi) {
      adminUpdateRole(userId, roleName)
        .then(() => {
          setApiUsers((prev) => prev.map((x) => x.userId === userId ? { ...x, role: { roleId: 0, roleName } } : x));
          if (detailUser?.userId === userId) setDetailUser((d) => d ? { ...d, role: { roleId: 0, roleName } } : null);
          showSuccess("Role updated", "The user's role has been updated successfully.");
        })
        .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }));
    } else {
      updateUserRole(userId, roleName);
      showSuccess("Role updated", "The user's role has been updated successfully.");
    }
  };

  const handleToggleLock = (u: AdminUserListItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (useRealApi) {
      adminUpdateLockStatus(u.userId, u.accountNonLocked)
        .then(() => {
          setApiUsers((prev) => prev.map((x) => x.userId === u.userId ? { ...x, accountNonLocked: !x.accountNonLocked } : x));
          if (detailUser?.userId === u.userId) setDetailUser((d) => d ? { ...d, accountNonLocked: !d.accountNonLocked } : null);
          showSuccess(u.accountNonLocked ? "Account locked" : "Account unlocked", u.accountNonLocked ? "The user has been locked and cannot sign in." : "The user can sign in again.");
        })
        .catch((err) => toast({ title: "Action failed", description: err?.message, variant: "destructive" }));
    } else {
      toggleUserLock(u.userId);
      showSuccess(u.accountNonLocked ? "Account locked" : "Account unlocked");
    }
  };

  const handleToggleEnabled = (u: AdminUserListItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (useRealApi) {
      adminUpdateEnabledStatus(u.userId, !u.enabled)
        .then(() => {
          setApiUsers((prev) => prev.map((x) => x.userId === u.userId ? { ...x, enabled: !x.enabled } : x));
          if (detailUser?.userId === u.userId) setDetailUser((d) => d ? { ...d, enabled: !d.enabled } : null);
          showSuccess(u.enabled ? "Account disabled" : "Account enabled", u.enabled ? "The user account has been disabled." : "The user account is active again.");
        })
        .catch((err) => toast({ title: "Action failed", description: err?.message, variant: "destructive" }));
    } else {
      toggleUserEnabled(u.userId);
      showSuccess(u.enabled ? "Account disabled" : "Account enabled");
    }
  };

  const handleResetPassword = () => {
    if (!pwDialog.userId || !newPassword.trim()) return;
    setPwSubmitting(true);
    adminUpdatePassword(pwDialog.userId, newPassword.trim())
      .then(() => {
        setPwDialog({ open: false, userId: 0, username: "" });
        setNewPassword("");
        showSuccess("Password updated", "The user's password has been changed successfully. They can sign in with the new password.");
      })
      .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }))
      .finally(() => setPwSubmitting(false));
  };

  const handleAccountExpiry = (userId: number, expire: boolean) => {
    adminUpdateExpiryStatus(userId, expire)
      .then(() => {
        setApiUsers((prev) => prev.map((x) => x.userId === userId ? { ...x, accountNonExpired: !expire } : x));
        if (detailUser?.userId === userId) setDetailUser((d) => d ? { ...d, accountNonExpired: !expire } : null);
        showSuccess(expire ? "Account expired" : "Account extended", expire ? "The account has been marked as expired." : "The account expiry has been extended.");
      })
      .catch((err) => toast({ title: "Action failed", description: err?.message, variant: "destructive" }));
  };

  const handleCredentialsExpiry = (userId: number, expire: boolean) => {
    adminUpdateCredentialsExpiry(userId, expire)
      .then(() => {
        setApiUsers((prev) => prev.map((x) => x.userId === userId ? { ...x, credentialsNonExpired: !expire } : x));
        if (detailUser?.userId === userId) setDetailUser((d) => d ? { ...d, credentialsNonExpired: !expire } : null);
        showSuccess(expire ? "Credentials expired" : "Credentials extended", expire ? "The user will need to reset their password." : "Credentials validity has been extended.");
      })
      .catch((err) => toast({ title: "Action failed", description: err?.message, variant: "destructive" }));
  };

  const openConfirm = (title: string, description: string, confirmLabel: string, variant: "default" | "destructive", onConfirm: () => void) => {
    setConfirmAction({ open: true, title, description, confirmLabel, variant, onConfirm });
  };

  const openProfileConfirm = (action: "approve" | "reject", profile: AdminProfileItem | ProfileDTO) => {
    setProfileConfirmDialog({ open: true, action, profile });
  };

  const handleProfileConfirmAction = () => {
    const { profile, action } = profileConfirmDialog;
    if (!profile) return;
    const note = profileReviewNote?.trim() || undefined;
    setProfileActionSubmitting(true);
    const done = () => {
      setProfileActionSubmitting(false);
      setProfileConfirmDialog({ open: false, action: "approve", profile: null });
      setViewProfile(null);
      setProfileReviewNote("");
      if (useRealApi) {
        setProfilesLoading(true);
        adminGetProfileList()
          .then((res) => setApiProfilesList((res as { data: ProfileDTO[] }).data ?? []))
          .catch(() => {})
          .finally(() => setProfilesLoading(false));
      }
    };
    if ("profileRole" in profile) {
      const role = profile.profileRole as ProfileRole;
      const id = profile.id;
      if (action === "approve") {
        apiApproveProfile(role, id, note)
          .then(() => { toast({ title: "Profile approved" }); done(); })
          .catch((err) => { toast({ title: "Approve failed", description: err?.message, variant: "destructive" }); setProfileActionSubmitting(false); });
      } else {
        apiRejectProfile(role, id, note ?? "Rejected.")
          .then(() => { toast({ title: "Profile rejected" }); done(); })
          .catch((err) => { toast({ title: "Reject failed", description: err?.message, variant: "destructive" }); setProfileActionSubmitting(false); });
      }
    } else {
      const p = profile as AdminProfileItem;
      if (p.profileType === "OWNER") {
        if (action === "approve") approveOwnerProfile(p.id, note); else rejectOwnerProfile(p.id, note ?? "Rejected.");
      } else if (p.profileType === "BROKER") {
        if (action === "approve") approveBrokerProfile(p.id, note); else rejectBrokerProfile(p.id, note ?? "Rejected.");
      } else {
        if (action === "approve") approveTenantProfile(p.id, note); else rejectTenantProfile(p.id, note ?? "Rejected.");
      }
      toast({ title: action === "approve" ? "Profile approved" : "Profile rejected" });
      done();
    }
  };

  const runConfirm = () => {
    confirmAction.onConfirm();
    setConfirmAction((prev) => ({ ...prev, open: false }));
  };


  const adminAlertsList = demoMode ? [] : notifications.filter(n => n.targetRole === "ADMIN" || n.targetUser === "admin_user");
  const unreadCount = adminAlertsList.filter(n => !n.read).length;
  const displayPayments = demoMode ? [] : payments;
  const propertiesList = useRealApi ? apiProperties : properties;
  const pendingProperties = propertiesList.filter((p: PropertyDTO) => p.status === "PENDING");
  const filteredPropertiesList = (() => {
    let list = !propertyStatusFilter
      ? propertiesList
      : propertiesList.filter((p: PropertyDTO) => p.status === propertyStatusFilter);
    if (propertySearchQuery.trim()) {
      const q = propertySearchQuery.trim().toLowerCase();
      list = list.filter(
        (p: PropertyDTO) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.ownerUserName ?? "").toLowerCase().includes(q) ||
          (p.city ?? "").toLowerCase().includes(q) ||
          (p.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  })();
  const complaintsListAll = useRealApi ? apiComplaints : (complaints as unknown as ComplaintDTO[]);
  const complaintsList = complaintStatusFilter ? complaintsListAll.filter((c: ComplaintDTO) => c.status === complaintStatusFilter) : complaintsListAll;
  const openComplaints = complaintsListAll.filter((c: ComplaintDTO) => c.status === "OPEN");
  const allProfilesList: (AdminProfileItem | ProfileDTO)[] = useRealApi ? apiProfilesList : getAllProfiles();
  const pendingProfiles = allProfilesList.filter(p => {
    const s = "status" in p ? p.status : (p as ProfileDTO).status;
    return s === "PENDING" || s === "IN_PROGRESS";
  });
  const filteredProfiles = allProfilesList.filter(p => {
    const d = getProfileDisplay(p);
    if (profileTypeFilter && d.profileType !== profileTypeFilter) return false;
    if (profileStatusFilter && d.status !== profileStatusFilter) return false;
    const search = profileSearchQuery.toLowerCase();
    if (!search) return true;
    const email = "email" in p ? (p as { email?: string }).email ?? "" : "";
    return d.name.toLowerCase().includes(search) || d.user.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });
  const profilesByStatus = {
    PENDING: filteredProfiles.filter(p => getProfileDisplay(p).status === "PENDING"),
    IN_PROGRESS: filteredProfiles.filter(p => getProfileDisplay(p).status === "IN_PROGRESS"),
    APPROVED: filteredProfiles.filter(p => getProfileDisplay(p).status === "APPROVED"),
    REJECTED: filteredProfiles.filter(p => getProfileDisplay(p).status === "REJECTED"),
  };

  const openPropertyAdd = () => {
    setEditingProperty(null);
    setPropertyForm({
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
    });
    setPropertyDialogOpen("add");
  };

  const openPropertyEdit = (p: PropertyDTO) => {
    setEditingProperty(p);
    setPropertyForm({
      title: p.title,
      description: p.description ?? "",
      propertyType: p.propertyType,
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      rating: p.rating,
      reviewCount: p.reviewCount,
      furnishing: p.furnishing,
      amenities: p.amenities ?? [],
      isFeatured: p.isFeatured ?? false,
      tenantUserName: p.tenantUserName,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      city: p.city,
      state: p.state,
      pinCode: p.pinCode,
      images: p.images ?? [],
    });
    setPropertyDialogOpen("edit");
  };

  const DESCRIPTION_MAX_LENGTH = 2000;
  const COMMON_AMENITIES = ["Parking", "Gym", "Lift", "Power Backup", "Security", "Water Backup", "Garden", "Swimming Pool", "Clubhouse", "AC", "Wi-Fi", "24/7 Water"];

  const isPincodeValidForState = (pin: string, stateName: string): boolean => {
    if (!pin || pin.length !== 6) return false;
    const state = indianStates.find((s) => s.name === stateName);
    if (!state) return true;
    const range = statePincodeRanges[state.code];
    if (!range?.samples?.length) return true;
    const allowedPrefixes = new Set(range.samples.map((s) => s.slice(0, 2)));
    return allowedPrefixes.has(pin.slice(0, 2));
  };

  const PROPERTY_REQUIRED = {
    title: (v: string) => v.trim().length > 0,
    description: (v: string) => v.trim().length > 0 && v.trim().length <= DESCRIPTION_MAX_LENGTH,
    propertyType: (v: string) => v.trim().length > 0,
    price: (v: number) => Number(v) > 0,
    address: (v: string) => v.trim().length > 0,
    state: (v: string) => v.trim().length > 0,
    city: (v: string) => v.trim().length > 0,
    pinCode: (v: string) => /^\d{6}$/.test((v || "").trim()),
  };

  const validatePropertyForm = (): { valid: boolean; message: string } => {
    if (!PROPERTY_REQUIRED.title(propertyForm.title)) return { valid: false, message: "Title is required." };
    if (!propertyForm.description.trim()) return { valid: false, message: "Description is required." };
    if (propertyForm.description.trim().length > DESCRIPTION_MAX_LENGTH) return { valid: false, message: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.` };
    if (!PROPERTY_REQUIRED.propertyType(propertyForm.propertyType)) return { valid: false, message: "Property type is required." };
    if (!PROPERTY_REQUIRED.price(Number(propertyForm.price))) return { valid: false, message: "Price must be greater than 0." };
    if (!PROPERTY_REQUIRED.address(propertyForm.address)) return { valid: false, message: "Address is required." };
    if (!PROPERTY_REQUIRED.state(propertyForm.state)) return { valid: false, message: "Please select a state." };
    if (!PROPERTY_REQUIRED.city(propertyForm.city)) return { valid: false, message: "City is required." };
    if (!PROPERTY_REQUIRED.pinCode(propertyForm.pinCode)) return { valid: false, message: "Pin code must be exactly 6 digits." };
    if (!isPincodeValidForState(propertyForm.pinCode.trim(), propertyForm.state.trim())) return { valid: false, message: "This pin code does not belong to the selected state. Please check and try again." };
    return { valid: true, message: "" };
  };

  const buildPropertyPayload = (): PropertyRequest => ({
    title: propertyForm.title.trim(),
    description: propertyForm.description.trim(),
    propertyType: propertyForm.propertyType,
    price: Number(propertyForm.price) || 0,
    bedrooms: propertyForm.bedrooms != null ? Number(propertyForm.bedrooms) : null,
    bathrooms: propertyForm.bathrooms != null ? Number(propertyForm.bathrooms) : null,
    area: propertyForm.area != null ? Number(propertyForm.area) : null,
    rating: propertyForm.rating != null ? Number(propertyForm.rating) : null,
    reviewCount: propertyForm.reviewCount != null ? Number(propertyForm.reviewCount) : null,
    furnishing: propertyForm.furnishing || null,
    amenities: Array.isArray(propertyForm.amenities) ? propertyForm.amenities : [],
    isFeatured: propertyForm.isFeatured ?? false,
    tenantUserName: propertyForm.tenantUserName || null,
    latitude: propertyForm.latitude != null ? Number(propertyForm.latitude) : null,
    longitude: propertyForm.longitude != null ? Number(propertyForm.longitude) : null,
    address: propertyForm.address.trim(),
    city: propertyForm.city.trim(),
    state: propertyForm.state.trim(),
    pinCode: propertyForm.pinCode.trim(),
    images: Array.isArray(propertyForm.images) ? propertyForm.images.filter(Boolean) : [],
  });

  const handleCreateProperty = () => {
    const payload = buildPropertyPayload();
    setPropertySubmitting(true);
    createProperty(payload)
      .then((res) => {
        const data = (res as { data: PropertyDTO }).data;
        setApiProperties((prev) => [...prev, data]);
        setPropertyDialogOpen(null);
        setEditingProperty(null);
        showSuccess("Property created", "The property has been added successfully.");
      })
      .catch((err) => toast({ title: "Create failed", description: err?.message, variant: "destructive" }))
      .finally(() => setPropertySubmitting(false));
  };

  const handleUpdateProperty = () => {
    if (!editingProperty) return;
    const payload = buildPropertyPayload();
    setPropertySubmitting(true);
    updateProperty(editingProperty.id, payload)
      .then((res) => {
        const data = (res as { data: PropertyDTO }).data;
        setApiProperties((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        setPropertyDialogOpen(null);
        setEditingProperty(null);
        showSuccess("Property updated", "The property has been updated successfully.");
      })
      .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }))
      .finally(() => setPropertySubmitting(false));
  };

  const handleDeleteProperty = (p: PropertyDTO) => {
    openConfirm(
      "Delete property?",
      `"${p.title}" will be removed. This action cannot be undone.`,
      "Delete",
      "destructive",
      () => {
        if (useRealApi) {
          apiDeleteProperty(p.id)
            .then(() => {
              setApiProperties((prev) => prev.filter((x) => x.id !== p.id));
              showSuccess("Property deleted", "The property has been removed.");
            })
            .catch((err) => toast({ title: "Delete failed", description: err?.message, variant: "destructive" }));
        } else {
          deleteProperty(p.id);
          showSuccess("Property deleted");
        }
      }
    );
  };

  const handleApproveProperty = (p: PropertyDTO) => {
    openConfirm("Approve property?", `"${p.title}" will be marked as AVAILABLE and visible to tenants.`, "Approve", "default", () => {
      if (useRealApi) {
        apiApproveProperty(p.id)
          .then((res) => {
            const data = (res as { data?: PropertyDTO }).data;
            if (data) setApiProperties((prev) => prev.map((x) => (x.id === data.id ? data : x)));
            showSuccess("Property approved", "The property is now available.");
          })
          .catch((err) => toast({ title: "Approve failed", description: err?.message, variant: "destructive" }));
      } else {
        approveProperty(p.id);
        toast({ title: "Approved" });
      }
    });
  };

  const handleRejectProperty = (p: PropertyDTO) => {
    openConfirm("Reject property?", `"${p.title}" will be rejected. The owner can resubmit after changes.`, "Reject", "destructive", () => {
      if (useRealApi) {
        apiRejectProperty(p.id)
          .then((res) => {
            const data = (res as { data?: PropertyDTO }).data;
            if (data) setApiProperties((prev) => prev.map((x) => (x.id === data.id ? data : x)));
            showSuccess("Property rejected", "The listing has been rejected.");
          })
          .catch((err) => toast({ title: "Reject failed", description: err?.message, variant: "destructive" }));
      } else {
        rejectProperty(p.id);
        toast({ title: "Rejected" });
      }
    });
  };

  const PROPERTY_STATUS_OPTIONS: PropertyStatus[] = ["AVAILABLE", "SOLD", "RENTED", "PENDING", "UNDER_MAINTENANCE", "REJECTED"];
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
  const getPropertyStatusItemClass = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200";
      case "RENTED": return "text-sky-600 dark:text-sky-400 focus:bg-sky-50 focus:text-sky-800 dark:focus:bg-sky-900/30 dark:focus:text-sky-200";
      case "SOLD": return "text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200";
      case "PENDING": return "text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200";
      case "REJECTED": return "text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-800 dark:focus:bg-red-900/30 dark:focus:text-red-200";
      case "UNDER_MAINTENANCE": return "text-orange-600 dark:text-orange-400 focus:bg-orange-50 focus:text-orange-800 dark:focus:bg-orange-900/30 dark:focus:text-orange-200";
      default: return "text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200";
    }
  };
  const handleUpdatePropertyStatus = (p: PropertyDTO, newStatus: PropertyStatus) => {
    if (p.status === newStatus) return;
    openConfirm("Update status?", `Change "${p.title}" status to ${newStatus.replace("_", " ")}?`, "Update status", "default", () => {
      if (useRealApi) {
        adminUpdatePropertyStatus(p.id, newStatus)
          .then((res) => {
            const data = (res as { data?: PropertyDTO }).data;
            if (data) setApiProperties((prev) => prev.map((x) => (x.id === data.id ? data : x)));
            showSuccess("Status updated", `Property is now ${newStatus.replace("_", " ")}.`);
          })
          .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }));
      } else {
        demoUpdateProperty(p.id, { status: newStatus });
        toast({ title: "Status updated" });
      }
    });
  };

  const submitPropertyWithConfirm = () => {
    const validation = validatePropertyForm();
    if (!validation.valid) {
      toast({ title: "Fill in mandatory fields", description: validation.message, variant: "destructive" });
      return;
    }
    if (propertyDialogOpen === "add") {
      const payload = buildPropertyPayload();
      if (useRealApi) {
        openConfirm("Create property?", "This will add a new property listing.", "Create", "default", handleCreateProperty);
      } else {
        openConfirm("Create property?", "This will add a new property listing.", "Create", "default", () => {
          demoAddProperty({ ...payload, ownerUserName: user?.username ?? "admin" } as Omit<PropertyDTO, "id" | "createdAt" | "updatedAt">);
          setPropertyDialogOpen(null);
          setEditingProperty(null);
          showSuccess("Property created", "The property has been added successfully.");
        });
      }
    } else if (propertyDialogOpen === "edit" && editingProperty) {
      if (useRealApi) {
        openConfirm("Update property?", `Save changes to "${editingProperty.title}"?`, "Update", "default", handleUpdateProperty);
      } else {
        openConfirm("Update property?", `Save changes to "${editingProperty.title}"?`, "Update", "default", () => {
          demoUpdateProperty(editingProperty.id, buildPropertyPayload());
          setPropertyDialogOpen(null);
          setEditingProperty(null);
          showSuccess("Property updated", "The property has been updated successfully.");
        });
      }
    }
  };

  const getDisplayRole = (u: AdminUserListItem) =>
    u.role?.roleName ?? (detailUser?.userId === u.userId ? detailUser.role?.roleName : null);

  const filteredUsers = usersList.filter(u => {
    const roleName = getDisplayRole(u);
    if (roleFilter && roleName !== roleFilter) return false;
    if (searchQuery && !u.userName.toLowerCase().includes(searchQuery.toLowerCase()) && !(u.email ?? u.phoneNumber ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const roleFilterOptions = [
    { value: null as string | null, label: "All" },
    ...rolesList.map((r) => ({ value: r.roleName, label: r.roleName.replace("ROLE_", "") })),
  ];

  const getAlertTargetTab = (n: typeof notifications[0]) => {
    const msg = (n.title + n.message).toLowerCase();
    if (msg.includes("complaint")) return "complaints";
    if (msg.includes("profile") || msg.includes("verification")) return "requests";
    if (msg.includes("property") || msg.includes("approval") || msg.includes("listed")) return "properties";
    if (msg.includes("payment")) return "payments";
    if (msg.includes("user") || msg.includes("role")) return "users";
    return null;
  };

  const handleAlertClick = (n: typeof notifications[0]) => {
    markNotificationRead(n.id);
    const tab = getAlertTargetTab(n);
    if (tab) setActiveTab(tab);
  };

  const refetchComplaints = () => {
    if (!useRealApi) return;
    getComplaints()
      .then((res) => {
        const list = (res as { data?: ComplaintDTO[] }).data;
        if (Array.isArray(list)) setApiComplaints(list);
      })
      .catch(() => {});
  };

  const handleComplaintAction = (id: number, status: "IN_PROGRESS" | "RESOLVED" | "CLOSED") => {
    if (useRealApi) {
      if (status === "RESOLVED") {
        if (!complaintNote?.trim()) {
          toast({ title: "Resolution note required", variant: "destructive" });
          return;
        }
        openConfirm("Resolve complaint?", "This will mark the complaint as resolved. This action cannot be undone.", "Resolve", "default", () => {
          resolveComplaint(id, complaintNote.trim())
            .then(() => {
              toast({ title: "Complaint resolved", description: "The complaint has been marked as resolved." });
              setComplaintActionId(null); setComplaintNote("");
              refetchComplaints();
              setDetailItem(null);
            })
            .catch((err) => toast({ title: "Failed to resolve", description: (err as Error)?.message, variant: "destructive" }));
        });
        return;
      }
      openConfirm("Update status?", `Change complaint status to ${status.replace("_", " ")}?`, "Update", "default", () => {
        apiUpdateComplaintStatus(id, status as ComplaintStatus)
          .then(() => {
            toast({ title: "Status updated", description: `Complaint is now ${status.replace("_", " ")}.` });
            refetchComplaints();
            setDetailItem(null);
          })
          .catch((err) => toast({ title: "Failed to update status", description: (err as Error)?.message, variant: "destructive" }));
      });
      return;
    }
    updateComplaintStatus(id, status, complaintNote || undefined);
    toast({ title: `Complaint ${status.toLowerCase()}` });
    setComplaintActionId(null); setComplaintNote("");
  };

  const handleAssignComplaint = () => {
    const { complaintId, assignToUserId } = assignDialog;
    if (!complaintId || !assignToUserId) {
      toast({ title: "Select a user to assign", variant: "destructive" });
      return;
    }
    if (!useRealApi) {
      toast({ title: "Complaint assigned", description: "The complaint has been assigned successfully." });
      setAssignDialog({ open: false, complaintId: null, assignToUserId: 0 });
      setDetailItem(null);
      return;
    }
    setAssignSubmitting(true);
    assignComplaint(complaintId, assignToUserId)
      .then(() => {
        toast({ title: "Complaint assigned", description: "The complaint has been assigned successfully." });
        setAssignDialog({ open: false, complaintId: null, assignToUserId: 0 });
        refetchComplaints();
        setDetailItem(null);
      })
      .catch((err) => toast({ title: "Assign failed", description: (err as Error)?.message, variant: "destructive" }))
      .finally(() => setAssignSubmitting(false));
  };

  const handleSendComplaintMessage = () => {
    if (!detailItem || detailItem.type !== "complaint" || !complaintMessageText.trim()) return;
    const id = (detailItem.data as ComplaintDTO).id;
    if (!useRealApi) {
      toast({ title: "Message sent" });
      setComplaintMessageText("");
      return;
    }
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
    if (!useRealApi) {
      updateComplaintStatus(complaintId, newStatus, newStatus === "RESOLVED" ? message?.trim() : undefined);
      toast({ title: newStatus === "RESOLVED" ? "Complaint resolved" : "Status updated" });
      setStatusUpdateDialog({ open: false, complaintId: null, newStatus: null, currentStatus: null, message: "" });
      if (detailItem?.type === "complaint" && (detailItem.data as ComplaintDTO).id === complaintId) {
        setDetailItem({ type: "complaint", data: { ...(detailItem.data as object), status: newStatus } });
      }
      return;
    }
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
    if (!useRealApi) {
      updateComplaintStatus(complaintId, newStatus);
      if (detailItem?.type === "complaint" && (detailItem.data as ComplaintDTO).id === complaintId) {
        setDetailItem({ type: "complaint", data: { ...(detailItem.data as object), status: newStatus } });
      }
      toast({ title: "Status updated" });
      return;
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      <div className="container mx-auto px-4 py-4 md:py-8">
        {demoMode && (
          <div className="mb-4 p-3 bg-accent/50 border border-accent rounded-xl flex items-center gap-2 text-sm text-accent-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span><strong>Demo Mode</strong> — Viewing as <strong>admin_user</strong></span>
          </div>
        )}

        <div className="mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500/70 dark:border-l-sky-400/50 pl-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users, properties, requests & complaints</p>
        </div>

        <div className="flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4 md:hidden scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${activeTab === t.id ? "border-sky-500/40 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.id === "properties" && pendingProperties.length > 0 && <span className="bg-amber-500 text-amber-950 text-[10px] rounded-full px-1.5 font-medium">{pendingProperties.length}</span>}
              {t.id === "notifications" && unreadCount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-medium">{unreadCount}</span>}
              {t.id === "requests" && pendingProfiles.length > 0 && <span className="bg-amber-500 text-amber-950 text-[10px] rounded-full px-1.5 font-medium">{pendingProfiles.length}</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sticky top-20 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 ring-1 ring-slate-100 dark:ring-slate-800/80 border-l-4 border-l-sky-500/80 dark:border-l-sky-400/60">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 dark:from-sky-400/25 dark:to-sky-500/15 flex items-center justify-center ring-2 ring-sky-400/20 dark:ring-sky-500/30"><ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 text-xs font-semibold tracking-wide">Administrator</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${activeTab === t.id ? "border-sky-300 dark:border-sky-600/60 bg-sky-50/80 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 shadow-sm" : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <t.icon className="h-4 w-4 shrink-0" />{t.label}
                    {t.id === "properties" && pendingProperties.length > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs rounded-full px-1.5 py-0.5 font-medium">{pendingProperties.length}</span>}
                    {t.id === "notifications" && unreadCount > 0 && <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">{unreadCount}</span>}
                    {t.id === "requests" && pendingProfiles.length > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs rounded-full px-1.5 py-0.5 font-medium">{pendingProfiles.length}</span>}
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
                    { icon: Users, label: "Total Users", value: usersList.length, sub: null, iconBg: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600 dark:text-sky-400", tab: "users" },
                    { icon: Building2, label: "Total Properties", value: propertiesList.length, sub: pendingProperties.length > 0 ? `${pendingProperties.length} pending` : null, iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", tab: "properties" },
                    { icon: FileText, label: "Total Complaints", value: complaintsListAll.length, sub: openComplaints.length > 0 ? `${openComplaints.length} open` : null, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", tab: "complaints" },
                    { icon: Eye, label: "Profile reviews", value: allProfilesList.length, sub: pendingProfiles.length > 0 ? `${pendingProfiles.length} to review` : null, iconBg: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600 dark:text-violet-400", tab: "requests" },
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
                {pendingProperties.length > 0 && !demoMode && (
                  <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                    <h2 className="text-base font-bold text-foreground mb-3">Recent Pending Approvals</h2>
                    <div className="space-y-2">
                      {pendingProperties.slice(0, 3).map(p => (
                        <div key={p.id} className="bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/40 p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{p.title}</p><p className="text-xs text-muted-foreground">{p.ownerUserName} • {p.city}</p></div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => handleApproveProperty(p)}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleRejectProperty(p)}><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {openComplaints.length > 0 && (
                  <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                    <h2 className="text-base font-bold text-foreground mb-3">Recent Complaints</h2>
                    <div className="space-y-2">
                      {openComplaints.slice(0, 3).map((c: ComplaintDTO & { title?: string; raisedBy?: string; propertyTitle?: string }) => (
                        <div key={c.id} className="bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/40 p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setDetailItem({ type: "complaint", data: c })}>
                          <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{c.subject ?? c.title}</p><p className="text-xs text-muted-foreground">{c.raisedByUserName ?? c.raisedBy} • {c.propertyTitle ?? `Property #${c.propertyId}`}</p></div>
                          <div className="flex items-center gap-2"><Badge variant={c.priority === "HIGH" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{c.priority}</Badge><Eye className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">User Management</h2>
                          <p className="text-xs text-muted-foreground">View, filter, and manage user accounts</p>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by name or email..." className="pl-10 h-9 bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={roleFilter ?? "__all__"} onValueChange={(v) => setRoleFilter(v === "__all__" ? null : v)}>
                        <SelectTrigger className="w-[130px] max-w-[130px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleFilterOptions.map((opt, idx) => {
                            const itemVal = opt.value ?? "__all__";
                            const colorCls = itemVal === "__all__" ? "text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200" : ["text-violet-600 dark:text-violet-400 focus:bg-violet-50 focus:text-violet-800 dark:focus:bg-violet-900/30 dark:focus:text-violet-200", "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200", "text-sky-600 dark:text-sky-400 focus:bg-sky-50 focus:text-sky-800 dark:focus:bg-sky-900/30 dark:focus:text-sky-200", "text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200"][idx % 4];
                            return <SelectItem key={opt.label} value={itemVal} className={colorCls}>{opt.label}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No users match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try changing the role filter or search term</p>
                  </div>
                ) : (
                <div className="space-y-2">
                    {filteredUsers.map((u) => {
                      const currentRole = getDisplayRole(u);
                      return (
                        <div
                          key={u.userId}
                          onClick={() => openUserDetail(u)}
                          className={`bg-card rounded-xl border shadow-sm p-4 cursor-pointer transition-all active:scale-[0.995] ${u.enabled ? "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md" : "border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-card-foreground">{u.userName}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email ?? u.phoneNumber ?? "—"}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {u.enabled ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" /> Active
                                </span>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                              )}
                              {!u.accountNonLocked && <Badge variant="destructive" className="text-[10px]">Locked</Badge>}
                              {currentRole && (
                                <Badge variant="secondary" className="text-[10px]">{currentRole.replace("ROLE_", "")}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 gap-2">
                            <div onClick={(e) => e.stopPropagation()}>
                              {rolesList.length > 0 ? (
                                <Select value={currentRole ?? ""} onValueChange={(v) => openConfirm("Change role?", `${u.userName} will be assigned the role ${v.replace("ROLE_", "")}.`, "Change role", "default", () => handleUpdateRole(u.userId, v))}>
                                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                                  <SelectContent>{rolesList.map(r => <SelectItem key={r.roleId} value={r.roleName}>{r.roleName.replace("ROLE_", "")}</SelectItem>)}</SelectContent>
                        </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">{currentRole ? currentRole.replace("ROLE_", "") : "—"}</span>
                              )}
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-md border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => openUserDetail(u)} title="View details"><Eye className="h-4 w-4" /></Button>
                              {!demoMode && (
                                <>
                                  <Button size="sm" variant="outline" className={`h-8 w-8 p-0 rounded-md ${u.accountNonLocked ? "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(u.accountNonLocked ? "Lock account?" : "Unlock account?", u.accountNonLocked ? `${u.userName} will not be able to sign in until an admin unlocks the account.` : `${u.userName} will be able to sign in again.`, u.accountNonLocked ? "Lock" : "Unlock", "destructive", () => handleToggleLock(u))} title={u.accountNonLocked ? "Lock account" : "Unlock account"}>
                                    {u.accountNonLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="outline" className={`h-8 w-8 p-0 rounded-md ${u.enabled ? "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(u.enabled ? "Disable account?" : "Enable account?", u.enabled ? `${u.userName} will not be able to access the platform.` : `${u.userName} will be able to access the platform again.`, u.enabled ? "Disable" : "Enable", "destructive", () => handleToggleEnabled(u))} title={u.enabled ? "Disable account" : "Enable account"}>
                                    {u.enabled ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-md border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => setPwDialog({ open: true, userId: u.userId, username: u.userName })} title="Reset password"><Key className="h-4 w-4" /></Button>
                                </>
                              )}
                            </div>
                      </div>
                    </div>
                      );
                    })}
                </div>
                )}
              </div>
            )}

            {activeTab === "properties" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">Property Management</h2>
                          <p className="text-xs text-muted-foreground">View, filter, and manage all properties. Approve pending listings or update status.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search by title, owner, city..." className="pl-10 h-9 bg-background" value={propertySearchQuery} onChange={e => setPropertySearchQuery(e.target.value)} />
                        </div>
                        <Button size="sm" className="shrink-0 h-9" onClick={openPropertyAdd}>
                          <Plus className="h-4 w-4 mr-2" /> Add Property
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={propertyStatusFilter ?? "__all__"} onValueChange={(v) => setPropertyStatusFilter(v === "__all__" ? null : v)}>
                        <SelectTrigger className="w-[130px] max-w-[130px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__" className="text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200">All ({propertiesList.length})</SelectItem>
                          <SelectItem value="PENDING" className="text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200">Pending ({pendingProperties.length})</SelectItem>
                          <SelectItem value="AVAILABLE" className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200">Available ({propertiesList.filter((x: PropertyDTO) => x.status === "AVAILABLE").length})</SelectItem>
                          <SelectItem value="RENTED" className="text-sky-600 dark:text-sky-400 focus:bg-sky-50 focus:text-sky-800 dark:focus:bg-sky-900/30 dark:focus:text-sky-200">Rented ({propertiesList.filter((x: PropertyDTO) => x.status === "RENTED").length})</SelectItem>
                          <SelectItem value="SOLD" className="text-slate-500 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-700 dark:focus:bg-slate-800 dark:focus:text-slate-200">Sold ({propertiesList.filter((x: PropertyDTO) => x.status === "SOLD").length})</SelectItem>
                          <SelectItem value="REJECTED" className="text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-800 dark:focus:bg-red-900/30 dark:focus:text-red-200">Rejected ({propertiesList.filter((x: PropertyDTO) => x.status === "REJECTED").length})</SelectItem>
                          <SelectItem value="UNDER_MAINTENANCE" className="text-orange-600 dark:text-orange-400 focus:bg-orange-50 focus:text-orange-800 dark:focus:bg-orange-900/30 dark:focus:text-orange-200">Under maintenance ({propertiesList.filter((x: PropertyDTO) => x.status === "UNDER_MAINTENANCE").length})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {propertiesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading properties...</p>
                  </div>
                ) : filteredPropertiesList.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No properties match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try changing the status filter or search term, or add a property.</p>
                    <Button size="sm" className="mt-4" onClick={openPropertyAdd}><Plus className="h-4 w-4 mr-2" /> Add Property</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPropertiesList.map((p: PropertyDTO) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openPropertyEdit(p)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPropertyEdit(p); } }}
                        className={`bg-card rounded-xl border shadow-sm p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995] ${getPropertyCardBorderClass(p.status ?? "")}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{p.ownerUserName ?? "—"} • {p.city ?? "—"} • ₹{Number(p.price).toLocaleString()}</p>
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
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-sky-500/60 bg-sky-50/80 dark:bg-sky-950/30 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                                {p.status.replace("_", " ")}
                              </span>
                            ) : p.status === "SOLD" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-slate-400/60 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                {p.status.replace("_", " ")}
                              </span>
                            ) : p.status === "UNDER_MAINTENANCE" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-orange-500/60 bg-orange-50/80 dark:bg-orange-950/30 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                                Under maintenance
                              </span>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">{p.status?.replace("_", " ") ?? "—"}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select value={p.status ?? ""} onValueChange={(v) => handleUpdatePropertyStatus(p, v as PropertyStatus)}>
                              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent>
                                {PROPERTY_STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s} className={getPropertyStatusItemClass(s)}>{s.replace("_", " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {p.status === "PENDING" && !demoMode && (
                              <>
                                <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => handleApproveProperty(p)}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleRejectProperty(p)}><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                              </>
                            )}
                            {!demoMode && (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-md" onClick={() => openPropertyEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-md text-destructive" onClick={() => useRealApi ? handleDeleteProperty(p) : openConfirm("Delete property?", `Remove "${p.title}"?`, "Delete", "destructive", () => { deleteProperty(p.id); showSuccess("Property deleted"); })} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <Eye className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">Review user profiles</h2>
                          <p className="text-xs text-muted-foreground">Review and approve Owner, Broker & Tenant profile requests</p>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by name or username..." className="pl-10 h-9 bg-background" value={profileSearchQuery} onChange={e => setProfileSearchQuery(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={profileTypeFilter ?? "__all__"} onValueChange={(v) => setProfileTypeFilter(v === "__all__" ? null : v)}>
                        <SelectTrigger className="w-[130px] max-w-[130px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__" className="text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200">All types</SelectItem>
                          <SelectItem value="OWNER" className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200">Owner</SelectItem>
                          <SelectItem value="BROKER" className="text-violet-600 dark:text-violet-400 focus:bg-violet-50 focus:text-violet-800 dark:focus:bg-violet-900/30 dark:focus:text-violet-200">Broker</SelectItem>
                          <SelectItem value="USER" className="text-sky-600 dark:text-sky-400 focus:bg-sky-50 focus:text-sky-800 dark:focus:bg-sky-900/30 dark:focus:text-sky-200">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={profileStatusFilter ?? "__all__"} onValueChange={(v) => setProfileStatusFilter(v === "__all__" ? null : v)}>
                        <SelectTrigger className="w-[130px] max-w-[130px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__" className="text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200">All ({filteredProfiles.length})</SelectItem>
                          <SelectItem value="PENDING" className="text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200">Pending ({profilesByStatus.PENDING.length})</SelectItem>
                          <SelectItem value="IN_PROGRESS" className="text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200">In progress ({profilesByStatus.IN_PROGRESS.length})</SelectItem>
                          <SelectItem value="APPROVED" className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200">Approved ({profilesByStatus.APPROVED.length})</SelectItem>
                          <SelectItem value="REJECTED" className="text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-800 dark:focus:bg-red-900/30 dark:focus:text-red-200">Rejected ({profilesByStatus.REJECTED.length})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {profilesLoading ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <p className="text-sm text-muted-foreground">Loading requests…</p>
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No requests match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try changing the filter or search term</p>
                  </div>
                ) : profileStatusFilter ? (
                  <div className="space-y-2">
                      {filteredProfiles.map((p) => {
                        const d = getProfileDisplay(p);
                        const typeLabel = d.profileType === "OWNER" ? "Owner" : d.profileType === "BROKER" ? "Broker" : "User";
                        return (
                          <div
                            key={`${d.profileType}-${p.id}`}
                            onClick={() => setViewProfile(p)}
                            className={`bg-card rounded-xl border shadow-sm cursor-pointer transition-all active:scale-[0.995] p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md ${d.status === "APPROVED" ? "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700" : d.status === "IN_PROGRESS" ? "border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700" : "border border-slate-200 dark:border-slate-700"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-card-foreground">{d.name}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{d.user} • Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {d.status === "APPROVED" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" /> Approved
                                  </span>
                                ) : d.status === "REJECTED" ? (
                                  <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                                ) : d.status === "IN_PROGRESS" ? (
                                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300">In progress</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>
                                )}
                                <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setViewProfile(p); }} title="View details"><Eye className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profilesByStatus.PENDING.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          Pending ({profilesByStatus.PENDING.length})
                        </h3>
                        <div className="space-y-2">
                          {profilesByStatus.PENDING.map((p) => {
                            const d = getProfileDisplay(p);
                            const typeLabel = d.profileType === "OWNER" ? "Owner" : d.profileType === "BROKER" ? "Broker" : "User";
                            return (
                              <div
                                key={`${d.profileType}-${p.id}`}
                                onClick={() => setViewProfile(p)}
                                className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-card-foreground">{d.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.user} • Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="secondary" className="text-[10px]">PENDING</Badge>
                                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setViewProfile(p); }} title="View details"><Eye className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {profilesByStatus.IN_PROGRESS.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          In progress ({profilesByStatus.IN_PROGRESS.length})
                        </h3>
                        <div className="space-y-2">
                          {profilesByStatus.IN_PROGRESS.map((p) => {
                            const d = getProfileDisplay(p);
                            const typeLabel = d.profileType === "OWNER" ? "Owner" : d.profileType === "BROKER" ? "Broker" : "User";
                            return (
                              <div
                                key={`${d.profileType}-${p.id}`}
                                onClick={() => setViewProfile(p)}
                                className="bg-card rounded-xl border border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-card-foreground">{d.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.user} • Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300">In progress</Badge>
                                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setViewProfile(p); }} title="View details"><Eye className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {profilesByStatus.APPROVED.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          Approved ({profilesByStatus.APPROVED.length})
                        </h3>
                        <div className="space-y-2">
                          {profilesByStatus.APPROVED.map((p) => {
                            const d = getProfileDisplay(p);
                            const typeLabel = d.profileType === "OWNER" ? "Owner" : d.profileType === "BROKER" ? "Broker" : "User";
                            return (
                              <div
                                key={`${d.profileType}-${p.id}`}
                                onClick={() => setViewProfile(p)}
                                className="bg-card rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-card-foreground">{d.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.user} • Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                                      <CheckCircle className="h-3.5 w-3.5" /> Approved
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setViewProfile(p); }} title="View details"><Eye className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {profilesByStatus.REJECTED.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Ban className="h-4 w-4 text-destructive" />
                          Rejected ({profilesByStatus.REJECTED.length})
                        </h3>
                        <div className="space-y-2">
                          {profilesByStatus.REJECTED.map((p) => {
                            const d = getProfileDisplay(p);
                            const typeLabel = d.profileType === "OWNER" ? "Owner" : d.profileType === "BROKER" ? "Broker" : "User";
                            return (
                              <div
                                key={`${d.profileType}-${p.id}`}
                                onClick={() => setViewProfile(p)}
                                className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-card-foreground">{d.name}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.user} • Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="destructive" className="text-[10px]">REJECTED</Badge>
                                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setViewProfile(p); }} title="View details"><Eye className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                          <h2 className="text-lg font-bold text-foreground">All Complaints</h2>
                          <p className="text-xs text-muted-foreground">View and manage complaints. Click a row to open details.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusFilterDropdown value={complaintStatusFilter} onChange={setComplaintStatusFilter} />
                    </div>
                  </div>
                </div>
                {apiComplaintsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading complaints…</div>
                ) : (
                <div className="space-y-3">
                  {complaintsList.map((c: ComplaintDTO & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string }) => {
                    const subject = c.subject ?? c.title ?? "";
                    const raisedBy = c.raisedByUserName ?? c.raisedBy ?? "";
                    const related = c.relatedUserName ?? c.againstUser ?? "";
                    const propLabel = c.propertyId ? (c.propertyTitle ?? `Property #${c.propertyId}`) : (c.propertyTitle ?? "");
                    const statusCls = c.status === "OPEN" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300" : c.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300" : c.status === "RESOLVED" || c.status === "CLOSED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300" : "bg-muted text-muted-foreground";
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
                            <p className="text-sm font-semibold text-card-foreground truncate">{subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{raisedBy} → {related} • {propLabel}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[10px] border ${priorityCls}`}>{c.priority}</Badge>
                            {(c.status === "RESOLVED" || c.status === "CLOSED") ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="h-3.5 w-3.5" /> {c.status}
                              </span>
                            ) : c.status === "OPEN" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                                {c.status}
                              </span>
                            ) : c.status === "IN_PROGRESS" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <Clock className="h-3.5 w-3.5" /> In progress
                              </span>
                            ) : (
                              <Badge variant="outline" className={`text-[10px] border ${statusCls}`}>{c.status}</Badge>
                            )}
                          </div>
                        </div>
                        {c.status !== "RESOLVED" && c.status !== "CLOSED" && !demoMode && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            {c.status === "OPEN" && (
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openConfirm("Mark as In Progress?", "This will set the complaint status to In Progress.", "Update status", "default", () => {
                                if (useRealApi) apiUpdateComplaintStatus(c.id, "IN_PROGRESS").then(refetchComplaints).then(() => toast({ title: "Status updated" })).catch((err) => toast({ title: "Failed", description: (err as Error)?.message, variant: "destructive" }));
                                else handleComplaintAction(c.id, "IN_PROGRESS");
                              }); }}>Investigate</Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 text-xs border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20" onClick={(e) => { e.stopPropagation(); setAssignDialog({ open: true, complaintId: c.id, assignToUserId: 0 }); }}><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={(e) => { e.stopPropagation(); setComplaintActionId(c.id); }}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve</Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {complaintsList.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No complaints</p>}
                </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">All Payments</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Click a row to view details.</p>
                    </div>
                  </div>
                </div>
                {displayPayments.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <IndianRupee className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No payments yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Payment records from tenants will appear here when the backend is connected and data is available.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayPayments.map(p => (
                      <div key={p.id} className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all"
                        onClick={() => setDetailItem({ type: "payment", data: p })}>
                        <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{p.tenantName} → {p.ownerName} • {p.month}</p></div>
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

            {activeTab === "roles" && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">System Roles</h2>
                <p className="text-xs text-muted-foreground mb-3">Click a role to view users with that role</p>
                <div className="grid grid-cols-2 gap-3">
                  {rolesList.map((r: { roleId: number; roleName: string }) => {
                    const count = usersList.filter((u) => u.role?.roleName === r.roleName).length;
                    return (
                      <button key={r.roleId} onClick={() => { setRoleFilter(r.roleName); setActiveTab("users"); }}
                        className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 text-center hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.98] group">
                        <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-foreground">{r.roleName}</p>
                        <p className="text-xs text-muted-foreground">{count} user{count !== 1 ? "s" : ""}</p>
                        <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View users →</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-900/50 dark:to-sky-950/20 px-5 md:px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">Admin Profile</h2>
                      {(useRealApi || demoMode) && (
                        <TwoFactorBadge
                          enabled={account2faEnabled}
                          className="text-xs"
                          onEnableClick={
                            account2faEnabled === false
                              ? demoMode
                                ? () => setDemoLoginPromptOpen(true)
                                : () => setAccount2faDialogOpen(true)
                              : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Account
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                          <p className="text-sm font-medium text-foreground truncate">{decodedToken?.sub ?? displayName}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                          <p className="text-sm font-medium text-foreground truncate">{decodedToken?.email ?? "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex flex-col justify-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                          <Badge variant="secondary" className="w-fit">Administrator</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Security
                      </h3>
                      <TwoFactorSettings initialEnabled={account2faEnabled} onEnabledChange={setAccount2faEnabled} hideEnableButton />
                    </div>
                  </div>
                </div>
              </div>
            )}

      {useRealApi && (
        <Dialog open={account2faDialogOpen} onOpenChange={setAccount2faDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Two-factor authentication</DialogTitle>
            </DialogHeader>
            <TwoFactorSettings initialEnabled={account2faEnabled} onEnabledChange={(enabled) => { setAccount2faEnabled(enabled); if (enabled) setAccount2faDialogOpen(false); }} autoStartEnableFlow onCancel={() => setAccount2faDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      <DemoModeLoginPrompt
        open={demoLoginPromptOpen}
        onOpenChange={setDemoLoginPromptOpen}
        message="Please sign in to access the full feature."
      />

          </div>
        </div>
      </div>

      {/* Profile Detail Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={(open) => { if (!open) { setViewProfile(null); setProfileReviewNote(""); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Profile Details</DialogTitle></DialogHeader>
          {viewProfile && (
            <div className="space-y-5 py-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{"profileRole" in viewProfile ? viewProfile.fullName ?? "" : "name" in viewProfile ? viewProfile.name : ""}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {"profileRole" in viewProfile
                      ? (viewProfile.profileRole === "ROLE_OWNER" ? "Owner" : viewProfile.profileRole === "ROLE_BROKER" ? "Broker" : "User")
                      : "ownerUser" in viewProfile ? "Owner" : "brokerUser" in viewProfile ? "Broker" : "User"} profile
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {"profileRole" in viewProfile
                      ? (viewProfile.profileRole === "ROLE_OWNER" ? "Owner" : viewProfile.profileRole === "ROLE_BROKER" ? "Broker" : "User")
                      : "ownerUser" in viewProfile ? "Owner" : "brokerUser" in viewProfile ? "Broker" : "User"}
                  </Badge>
                  {("status" in viewProfile ? viewProfile.status : (viewProfile as ProfileDTO).status) === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                      <CheckCircle className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : ("status" in viewProfile ? viewProfile.status : (viewProfile as ProfileDTO).status) === "REJECTED" ? (
                    <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                  ) : ("status" in viewProfile ? viewProfile.status : (viewProfile as ProfileDTO).status) === "IN_PROGRESS" ? (
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300">In progress</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</p>
                <p className="text-sm text-foreground">{new Date(("submittedAt" in viewProfile ? viewProfile.submittedAt : (viewProfile as ProfileDTO).submittedAt) ?? "").toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                {"profileRole" in viewProfile && (viewProfile as ProfileDTO).reviewedAt && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Reviewed</p>
                    <p className="text-sm text-foreground">{new Date((viewProfile as ProfileDTO).reviewedAt!).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </>
                )}
              </div>
              {"profileRole" in viewProfile && (() => {
                const p = viewProfile as ProfileDTO;
                const field = (label: string, value: string | null | undefined, icon?: React.ReactNode) => (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">{icon}{label}</p>
                    <p className="text-sm text-foreground">{value || "—"}</p>
                  </div>
                );
                return (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground border-b border-slate-200 dark:border-slate-700 pb-1.5">Personal & contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {field("Full name", p.fullName ?? null, <User className="h-3.5 w-3.5" />)}
                      {field("Username", p.userName ?? null)}
                      {field("Gender", p.gender ?? null)}
                      {field("Date of birth", p.dateOfBirth ? formatDob(p.dateOfBirth) : null, <Calendar className="h-3.5 w-3.5" />)}
                      {field("Aadhar number", p.aadharNumber ?? p.idNumber ?? null, <ShieldCheck className="h-3.5 w-3.5" />)}
                      {field("Mobile", p.mobile ?? null, <Phone className="h-3.5 w-3.5" />)}
                      {field("Email", p.email ?? null, <Mail className="h-3.5 w-3.5" />)}
                      {field("Firm name", p.firmName ?? null)}
                      {field("License number", p.licenseNumber ?? null)}
                      {(p.idType ?? p.idNumber) && field("ID type / number", [p.idType, p.idNumber].filter(Boolean).join(" — ") || null)}
                      {field("Address", [p.address, p.city, p.state, p.pinCode].filter(Boolean).join(", ") || null, <MapPin className="h-3.5 w-3.5" />)}
                    </div>
                    </div>
                    {(p.status === "PENDING" || p.status === "IN_PROGRESS") && !demoMode && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Label className="text-xs">Admin note (optional)</Label>
                        <Textarea placeholder="e.g. Documents verified. Approved." value={profileReviewNote} onChange={e => setProfileReviewNote(e.target.value)} className="min-h-[60px] text-sm" />
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button type="button" onClick={() => openProfileConfirm("approve", p)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button type="button" onClick={() => openProfileConfirm("reject", p)} className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 transition-colors">
                            <Ban className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {"profileType" in viewProfile && viewProfile.profileType === "OWNER" && (() => {
                const p = viewProfile as OwnerProfile & { profileType: "OWNER" };
                const addr = [p.village, p.postOffice, p.policeStation, p.district, indianStates.find(s => s.code === p.state)?.name || p.state, p.pincode].filter(Boolean).join(", ");
                return (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground border-b border-slate-200 dark:border-slate-700 pb-1.5">Personal & contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</p><p className="text-sm text-foreground">{p.ownerUser}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</p><p className="text-sm text-foreground">{p.gender}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of birth</p><p className="text-sm text-foreground">{formatDob(p.dob)}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aadhar</p><p className="text-sm text-foreground">{p.aadhar}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobile</p><p className="text-sm text-foreground">{p.mobile}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm text-foreground break-all">{p.email}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground">{addr || "—"}</p></div>
                    </div>
                    </div>
                    {(p.status === "PENDING" || p.status === "IN_PROGRESS") && !demoMode && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Label className="text-xs">Admin note (optional)</Label>
                        <Textarea placeholder="e.g. Documents verified. Approved." value={profileReviewNote} onChange={e => setProfileReviewNote(e.target.value)} className="min-h-[60px] text-sm" />
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button type="button" onClick={() => openProfileConfirm("approve", p)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button type="button" onClick={() => openProfileConfirm("reject", p)} className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 transition-colors">
                            <Ban className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {"profileType" in viewProfile && viewProfile.profileType === "BROKER" && (() => {
                const p = viewProfile as BrokerProfile & { profileType: "BROKER" };
                return (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground border-b border-slate-200 dark:border-slate-700 pb-1.5">Broker details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</p><p className="text-sm text-foreground">{p.brokerUser}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Firm name</p><p className="text-sm text-foreground">{p.firmName}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">License number</p><p className="text-sm text-foreground">{p.licenseNumber}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobile</p><p className="text-sm text-foreground">{p.mobile}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm text-foreground break-all">{p.email}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground">{[p.address, p.city, p.state, p.pincode].filter(Boolean).join(", ") || "—"}</p></div>
                    </div>
                    </div>
                    {(p.status === "PENDING" || p.status === "IN_PROGRESS") && !demoMode && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Label className="text-xs">Admin note (optional)</Label>
                        <Textarea placeholder="e.g. Documents verified. Approved." value={profileReviewNote} onChange={e => setProfileReviewNote(e.target.value)} className="min-h-[60px] text-sm" />
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button type="button" onClick={() => openProfileConfirm("approve", p)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button type="button" onClick={() => openProfileConfirm("reject", p)} className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 transition-colors">
                            <Ban className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {"profileType" in viewProfile && viewProfile.profileType === "USER" && (() => {
                const p = viewProfile as TenantProfile & { profileType: "USER" };
                return (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground border-b border-slate-200 dark:border-slate-700 pb-1.5">Tenant details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</p><p className="text-sm text-foreground">{p.tenantUser}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</p><p className="text-sm text-foreground">{p.gender}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of birth</p><p className="text-sm text-foreground">{formatDob(p.dob)}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID type / number</p><p className="text-sm text-foreground">{p.idType} — {p.idNumber}</p></div>
                      <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobile</p><p className="text-sm text-foreground">{p.mobile}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm text-foreground break-all">{p.email}</p></div>
                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground">{[p.address, p.city, p.state, p.pincode].filter(Boolean).join(", ") || "—"}</p></div>
                    </div>
                    </div>
                    {(p.status === "PENDING" || p.status === "IN_PROGRESS") && !demoMode && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Label className="text-xs">Admin note (optional)</Label>
                        <Textarea placeholder="e.g. Documents verified. Approved." value={profileReviewNote} onChange={e => setProfileReviewNote(e.target.value)} className="min-h-[60px] text-sm" />
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button type="button" onClick={() => openProfileConfirm("approve", p)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button type="button" onClick={() => openProfileConfirm("reject", p)} className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 transition-colors">
                            <Ban className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Approve/Reject confirmation */}
      <Dialog open={profileConfirmDialog.open} onOpenChange={(open) => !open && setProfileConfirmDialog((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{profileConfirmDialog.action === "approve" ? "Approve profile?" : "Reject profile?"}</DialogTitle>
            <DialogDescription>
              {profileConfirmDialog.action === "approve"
                ? "This profile will be marked as approved. The user will be able to use full features for their role."
                : "This profile will be rejected. The user can resubmit after making changes."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {profileConfirmDialog.action === "approve" ? (
                <button
                  type="button"
                  onClick={handleProfileConfirmAction}
                  disabled={profileActionSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <CheckCircle className="h-4 w-4" />
                  {profileActionSubmitting ? "Please wait…" : "Confirm approve"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProfileConfirmAction}
                  disabled={profileActionSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Ban className="h-4 w-4" />
                  {profileActionSubmitting ? "Please wait…" : "Confirm reject"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setProfileConfirmDialog((prev) => ({ ...prev, open: false }))}
                disabled={profileActionSubmitting}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/50 bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-500/20 dark:hover:bg-slate-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog for complaints/payments */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailItem?.type === "complaint" ? "Complaint Details" : "Payment Details"}</DialogTitle>
          </DialogHeader>
          {detailItem?.type === "complaint" && (() => {
            const c = detailItem.data as ComplaintDTO & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string; raisedByRole?: string; againstRole?: string; adminNote?: string };
            const subject = c.subject ?? c.title ?? "";
            const raisedBy = c.raisedByUserName ?? c.raisedBy ?? "";
            const related = c.relatedUserName ?? c.againstUser ?? "";
            const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";
            const statusCls = c.status === "OPEN" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" : c.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
            const priorityCls = c.priority === "HIGH" ? "bg-rose-100 text-rose-800" : c.priority === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
            return (
              <div className="space-y-4 py-2">
                {/* Summary */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                  <div>
                    <p className="text-sm font-medium text-foreground">{subject || "No subject"}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description || "—"}</p>
                  </div>
                </div>
                {/* People & property */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">People & property</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Raised by</span><p className="font-medium text-foreground">{raisedBy || "—"}</p></div>
                    <div><span className="text-muted-foreground">Related to</span><p className="font-medium text-foreground">{related || "—"}</p></div>
                    {c.assignedToUserName && <div className="sm:col-span-2"><span className="text-muted-foreground">Assigned to</span><p className="font-medium text-foreground">{c.assignedToUserName}</p></div>}
                    <div className="sm:col-span-2"><span className="text-muted-foreground">Property</span><p className="font-medium text-foreground">{c.propertyTitle ?? (c.propertyId ? `Property #${c.propertyId}` : "—")}</p></div>
                  </div>
                </div>
                {/* Status & dates */}
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
                {/* Resolution / admin note */}
                {(c.resolutionNote || (c as { adminNote?: string }).adminNote) && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution & notes</p>
                    {c.resolutionNote && <div><span className="text-xs text-muted-foreground">Resolution note</span><p className="text-sm text-foreground mt-0.5">{c.resolutionNote}</p></div>}
                    {(c as { adminNote?: string }).adminNote && <div><span className="text-xs text-muted-foreground">Admin note</span><p className="text-sm text-foreground mt-0.5">{(c as { adminNote: string }).adminNote}</p></div>}
                  </div>
                )}
                {/* Actions: Update status, Assign & Resolve (when not resolved) */}
                {!demoMode && (
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
                      <Button size="sm" variant="outline" className="h-8 text-xs border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20" onClick={() => { setAssignDialog({ open: true, complaintId: c.id, assignToUserId: 0 }); setDetailItem(null); }}><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</Button>
                      {!isResolved && (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => { setComplaintActionId(c.id); setDetailItem(null); }}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve</Button>
                      )}
                    </div>
                    {complaintStatusUpdating && <p className="text-xs text-muted-foreground">Updating…</p>}
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3 mt-4">
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
                  <form onSubmit={(e) => { e.preventDefault(); if (!demoMode) handleSendComplaintMessage(); }} className="flex gap-2">
                    <Input value={complaintMessageText} onChange={(e) => setComplaintMessageText(e.target.value)} placeholder="Type a message..." className="flex-1" disabled={demoMode} />
                    <Button type="submit" size="sm" disabled={demoMode || !complaintMessageText.trim() || complaintMessageSending}>{complaintMessageSending ? "Sending…" : "Send"}</Button>
                  </form>
                </div>
              </div>
            );
          })()}
          {detailItem?.type === "payment" && (() => {
            const p = detailItem.data;
            return (
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Property</p><p className="text-sm font-medium">{p.propertyTitle}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Tenant</p><p className="text-sm font-medium">{p.tenantName}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Owner</p><p className="text-sm font-medium">{p.ownerName}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-bold">₹{p.amount.toLocaleString()}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Month</p><p className="text-sm font-medium">{p.month}</p></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Badge variant={p.status === "PAID" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"}>{p.status}</Badge></div>
                {p.paidAt && <div className="space-y-1 col-span-2"><p className="text-xs text-muted-foreground">Paid At</p><p className="text-sm">{new Date(p.paidAt).toLocaleDateString("en-IN")}</p></div>}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={pwDialog.open} onOpenChange={(open) => { if (!open) { setPwDialog({ open: false, userId: 0, username: "" }); setNewPassword(""); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Reset Password for {pwDialog.username}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" /></div></div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPwDialog({ open: false, userId: 0, username: "" })}>Cancel</Button>
            <Button onClick={useRealApi ? () => openConfirm("Reset password?", `A new password will be set for ${pwDialog.username}. They will need to use it to sign in.`, "Reset password", "default", () => handleResetPassword()) : () => { showSuccess("Password updated", "The user's password has been changed successfully."); setPwDialog({ open: false, userId: 0, username: "" }); setNewPassword(""); }} disabled={!newPassword.trim() || pwSubmitting}>{pwSubmitting ? "Updating…" : "Reset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Property Dialog */}
      <Dialog open={propertyDialogOpen !== null} onOpenChange={(open) => { if (!open) { setPropertyDialogOpen(null); setEditingProperty(null); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{propertyDialogOpen === "add" ? "Add Property" : "Edit Property"}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Fields marked with <span className="text-destructive">*</span> are required.</p>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Basic details</p>
                <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={propertyForm.title} onChange={(e) => setPropertyForm((f) => ({ ...f, title: e.target.value }))} placeholder="Property title" />
                </div>
                <div className="grid gap-2">
                  <Label>Description <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">({propertyForm.description.length} / {DESCRIPTION_MAX_LENGTH})</span></Label>
                  <Textarea value={propertyForm.description} onChange={(e) => setPropertyForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))} placeholder="Describe the property" rows={3} maxLength={DESCRIPTION_MAX_LENGTH} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Type <span className="text-destructive">*</span></Label>
                    <Select value={propertyForm.propertyType} onValueChange={(v) => setPropertyForm((f) => ({ ...f, propertyType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {["APARTMENT", "FLAT", "HOUSE", "VILLA", "PG", "CO-LIVING", "HOSTEL", "ROOM", "PLOT", "COMMERCIAL", "GUEST_HOUSE"].map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Price (₹) <span className="text-destructive">*</span></Label>
                    <Input type="number" min={0} value={propertyForm.price || ""} onChange={(e) => setPropertyForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : 0 }))} placeholder="e.g. 25000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Specifications</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="grid gap-2">
                  <Label>Bedrooms</Label>
                  <Input type="number" min={0} value={propertyForm.bedrooms ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" disabled={propertyDialogOpen === "edit"} className={propertyDialogOpen === "edit" ? "opacity-60" : ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Bathrooms</Label>
                  <Input type="number" min={0} value={propertyForm.bathrooms ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" disabled={propertyDialogOpen === "edit"} className={propertyDialogOpen === "edit" ? "opacity-60" : ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Area (sq ft)</Label>
                  <Input type="number" min={0} value={propertyForm.area ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, area: e.target.value ? Number(e.target.value) : null }))} placeholder="—" disabled={propertyDialogOpen === "edit"} className={propertyDialogOpen === "edit" ? "opacity-60" : ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Furnishing</Label>
                  <Select value={propertyForm.furnishing ?? ""} onValueChange={(v) => setPropertyForm((f) => ({ ...f, furnishing: v || null }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FURNISHED">Furnished</SelectItem>
                      <SelectItem value="SEMI_FURNISHED">Semi Furnished</SelectItem>
                      <SelectItem value="UNFURNISHED">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Rating (0–5)</Label>
                  <Input type="number" min={0} max={5} step={0.1} value={propertyForm.rating ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, rating: e.target.value ? Number(e.target.value) : null }))} placeholder="—" disabled={propertyDialogOpen === "edit"} className={propertyDialogOpen === "edit" ? "opacity-60" : ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Review count</Label>
                  <Input type="number" min={0} value={propertyForm.reviewCount ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, reviewCount: e.target.value ? Number(e.target.value) : null }))} placeholder="—" disabled={propertyDialogOpen === "edit"} className={propertyDialogOpen === "edit" ? "opacity-60" : ""} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Amenities</Label>
                <p className="text-xs text-muted-foreground">Select common amenities or add your own below.</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((a) => {
                    const selected = Array.isArray(propertyForm.amenities) && propertyForm.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setPropertyForm((f) => ({
                          ...f,
                          amenities: selected ? (f.amenities ?? []).filter((x) => x !== a) : [...(f.amenities ?? []), a],
                        }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border hover:bg-muted"}`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(propertyForm.amenities ?? []).filter((a) => !COMMON_AMENITIES.includes(a)).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                      {a}
                      <button type="button" onClick={() => setPropertyForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))} className="hover:text-destructive" aria-label="Remove">×</button>
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
                        if (v && !(propertyForm.amenities ?? []).includes(v)) setPropertyForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && !(propertyForm.amenities ?? []).includes(v)) { setPropertyForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] })); e.target.value = ""; }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isFeatured" checked={!!propertyForm.isFeatured} onChange={(e) => setPropertyForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="rounded border-border" />
                <Label htmlFor="isFeatured" className="cursor-pointer">Featured</Label>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Location</p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <Input value={propertyForm.address} onChange={(e) => setPropertyForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-start">
                  <div className="grid gap-1.5 min-h-[2.5rem] sm:min-h-0">
                    <Label className="text-sm leading-none">State <span className="text-destructive">*</span></Label>
                    <Select value={propertyForm.state || "_"} onValueChange={(v) => setPropertyForm((f) => ({ ...f, state: v === "_" ? "" : v }))}>
                      <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Select state</SelectItem>
                        {indianStates.map((s) => (
                          <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>
                        ))}
                        {propertyForm.state && !indianStates.some((s) => s.name === propertyForm.state) && (
                          <SelectItem value={propertyForm.state}>{propertyForm.state}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5 min-h-[2.5rem] sm:min-h-0">
                    <Label className="text-sm leading-none">City <span className="text-destructive">*</span></Label>
                    <Input className="h-9 w-full" value={propertyForm.city} onChange={(e) => setPropertyForm((f) => ({ ...f, city: e.target.value.trim() }))} placeholder="e.g. Bengaluru" maxLength={50} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-sm leading-none">Pin code <span className="text-destructive">*</span></Label>
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          className={`h-9 w-full ${propertyForm.pinCode.length === 6 && propertyForm.state && isPincodeValidForState(propertyForm.pinCode, propertyForm.state) ? "pr-8" : ""}`}
                          value={propertyForm.pinCode}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setPropertyForm((f) => ({ ...f, pinCode: v })); }}
                          placeholder="6 digits"
                          maxLength={6}
                          inputMode="numeric"
                        />
                        {propertyForm.pinCode.length === 6 && propertyForm.state && isPincodeValidForState(propertyForm.pinCode, propertyForm.state) && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-green-600" aria-hidden>
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                      <div className="h-6 flex items-center">
                        {propertyForm.pinCode.length > 0 && propertyForm.pinCode.length !== 6 && <p className="text-[10px] text-muted-foreground">Enter exactly 6 digits</p>}
                        {propertyForm.pinCode.length === 6 && propertyForm.state && !isPincodeValidForState(propertyForm.pinCode, propertyForm.state) && (
                          <p className="text-[10px] text-destructive">This pin code does not belong to the selected state.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Latitude</Label>
                    <Input type="number" step="any" value={propertyForm.latitude ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Longitude</Label>
                    <Input type="number" step="any" value={propertyForm.longitude ?? ""} onChange={(e) => setPropertyForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Media</p>
              <div className="grid gap-2">
                <Label>Image URLs (one per line)</Label>
                <Textarea value={Array.isArray(propertyForm.images) ? propertyForm.images.join("\n") : ""} onChange={(e) => setPropertyForm((f) => ({ ...f, images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))} placeholder="https://..." rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => { setPropertyDialogOpen(null); setEditingProperty(null); }}>Cancel</Button>
            <Button onClick={submitPropertyWithConfirm} disabled={propertySubmitting}>
              {propertySubmitting ? "Saving…" : propertyDialogOpen === "add" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmAction.open} onOpenChange={(open) => !open && setConfirmAction((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmAction.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmAction.description}</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction((p) => ({ ...p, open: false }))}>Cancel</Button>
            {confirmAction.confirmLabel === "Approve" ? (
              <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={runConfirm}><CheckCircle className="h-3.5 w-3.5 mr-1" /> {confirmAction.confirmLabel}</Button>
            ) : (
              <Button variant={confirmAction.variant === "destructive" ? "destructive" : "default"} onClick={runConfirm}>{confirmAction.confirmLabel}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={viewingUserId !== null} onOpenChange={(open) => { if (!open) { setViewingUserId(null); setDetailUser(null); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              User details
            </DialogTitle>
          </DialogHeader>
          {detailUser ? (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
            </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground truncate">{detailUser.userName}</p>
                  <p className="text-sm text-muted-foreground truncate">{detailUser.email ?? detailUser.phoneNumber ?? "—"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
                  {detailUser.enabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                      <CheckCircle className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                  )}
                  {!detailUser.accountNonLocked && <Badge variant="destructive" className="text-[10px]">Locked</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Role</p>
                {rolesList.length > 0 ? (
                  <Select value={detailUser.role?.roleName ?? ""} onValueChange={(v) => openConfirm("Change role?", `${detailUser.userName} will be assigned the role ${v.replace("ROLE_", "")}.`, "Change role", "default", () => handleUpdateRole(detailUser.userId, v))}>
                    <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{rolesList.map(r => <SelectItem key={r.roleId} value={r.roleName}>{r.roleName.replace("ROLE_", "")}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{detailUser.role?.roleName?.replace("ROLE_", "") ?? "—"}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">2FA</span>
                  <Badge variant={detailUser.twoFactorEnabled ? "default" : "secondary"} className="text-[10px]">{detailUser.twoFactorEnabled ? "On" : "Off"}</Badge>
                </div>
                {detailUser.createdDate && (
                  <div><span className="text-muted-foreground">Joined </span><span className="font-medium">{new Date(detailUser.createdDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                )}
                {detailUser.credentialsExpiryDate && (
                  <div><span className="text-muted-foreground">Credentials expire </span><span className="font-medium">{new Date(detailUser.credentialsExpiryDate).toLocaleDateString("en-IN")}</span></div>
                )}
                {detailUser.accountExpiryDate && (
                  <div><span className="text-muted-foreground">Account expires </span><span className="font-medium">{new Date(detailUser.accountExpiryDate).toLocaleDateString("en-IN")}</span></div>
                )}
              </div>
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {!demoMode && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => { setViewingUserId(null); setDetailUser(null); setPwDialog({ open: true, userId: detailUser.userId, username: detailUser.userName }); }}>
                        <Key className="h-3.5 w-3.5 mr-1" /> Reset password
                      </Button>
                      <Button size="sm" variant="outline" className={`h-8 ${detailUser.accountNonLocked ? "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(detailUser.accountNonLocked ? "Lock account?" : "Unlock account?", detailUser.accountNonLocked ? `${detailUser.userName} will not be able to sign in until an admin unlocks the account.` : `${detailUser.userName} will be able to sign in again.`, detailUser.accountNonLocked ? "Lock" : "Unlock", "destructive", () => handleToggleLock(detailUser))}>
                        {detailUser.accountNonLocked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Unlock className="h-3.5 w-3.5 mr-1" />}
                        {detailUser.accountNonLocked ? "Lock account" : "Unlock account"}
                      </Button>
                      <Button size="sm" variant="outline" className={`h-8 ${detailUser.enabled ? "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(detailUser.enabled ? "Disable account?" : "Enable account?", detailUser.enabled ? `${detailUser.userName} will not be able to access the platform.` : `${detailUser.userName} will be able to access the platform again.`, detailUser.enabled ? "Disable" : "Enable", "destructive", () => handleToggleEnabled(detailUser))}>
                        {detailUser.enabled ? <Ban className="h-3.5 w-3.5 mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        {detailUser.enabled ? "Disable account" : "Enable account"}
                      </Button>
                    </>
                  )}
                  {useRealApi && (
                    <>
                      <Button size="sm" variant="outline" className={`h-8 ${detailUser.accountNonExpired ? "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(detailUser.accountNonExpired ? "Expire account?" : "Extend account?", detailUser.accountNonExpired ? `${detailUser.userName}'s account will be marked as expired.` : `Extend ${detailUser.userName}'s account validity.`, detailUser.accountNonExpired ? "Expire account" : "Extend account", "destructive", () => handleAccountExpiry(detailUser.userId, detailUser.accountNonExpired))}>
                        <CalendarX2 className="h-3.5 w-3.5 mr-1" />
                        {detailUser.accountNonExpired ? "Expire account" : "Extend account"}
                      </Button>
                      <Button size="sm" variant="outline" className={`h-8 ${detailUser.credentialsNonExpired ? "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`} onClick={() => openConfirm(detailUser.credentialsNonExpired ? "Expire credentials?" : "Extend credentials?", detailUser.credentialsNonExpired ? `${detailUser.userName} will need to reset their password to sign in again.` : `Extend ${detailUser.userName}'s credentials validity.`, detailUser.credentialsNonExpired ? "Expire credentials" : "Extend credentials", "destructive", () => handleCredentialsExpiry(detailUser.userId, detailUser.credentialsNonExpired))}>
                        <CalendarClock className="h-3.5 w-3.5 mr-1" />
                        {detailUser.credentialsNonExpired ? "Expire credentials" : "Extend credentials"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Could not load user.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Complaint Resolve Dialog */}
      <Dialog open={complaintActionId !== null} onOpenChange={(open) => { if (!open) { setComplaintActionId(null); setComplaintNote(""); } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Add a resolution note. This will mark the complaint as resolved.</p>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label>Resolution note</Label><Textarea value={complaintNote} onChange={e => setComplaintNote(e.target.value)} placeholder="Resolution details..." rows={3} /></div></div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setComplaintActionId(null)}>Cancel</Button>
            <Button onClick={() => complaintActionId && handleComplaintAction(complaintActionId, "RESOLVED")} disabled={useRealApi && !complaintNote?.trim()}><CheckCircle className="h-3.5 w-3.5 mr-1" />Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Complaint Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => !open && setAssignDialog({ open: false, complaintId: null, assignToUserId: 0 })}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Assign Complaint</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Select a user to assign this complaint to. Only admin can assign.</p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignDialog.assignToUserId?.toString() || ""} onValueChange={(v) => setAssignDialog((d) => ({ ...d, assignToUserId: parseInt(v, 10) || 0 }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {apiUsers.map((u) => (
                    <SelectItem key={u.userId} value={u.userId.toString()}>{u.userName} {u.email ? `(${u.email})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, complaintId: null, assignToUserId: 0 })}>Cancel</Button>
            <Button onClick={() => openConfirm("Assign complaint?", "This will assign the complaint to the selected user.", "Assign", "default", handleAssignComplaint)} disabled={!assignDialog.assignToUserId || assignSubmitting} className="border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20">{assignSubmitting ? "Assigning…" : <><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</>}</Button>
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

      <Footer />
    </div>
  );
};

export default AdminDashboard;
