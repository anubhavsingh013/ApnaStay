import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher, { getDemoUser, subscribeDemoUser } from "@/features/demo/DemoRoleSwitcher";
import { useDemoData, type Complaint, type OwnerProfile } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { toastActionError, toastActionSuccess, toastSuccess, toastError } from "@/lib/app-toast";
import type { PropertyRequest, PropertyDTO } from "@/lib/api";
import {
  getProfile,
  get2faStatus,
  updateProfile,
  submitProfileForReview,
  getProperties,
  getComplaints,
  getComplaintMessages,
  getComplaintReadReceipts,
  markComplaintThreadRead,
  sendComplaintMessage,
  deleteComplaintMessage,
  createComplaint,
  resolveComplaint,
  updateComplaintStatus as apiUpdateComplaintStatus,
  getUserIdByUsername,
  getDecodedToken,
  getIncomingRentalApplications,
  approveRentalApplication,
  rejectRentalApplication,
  getMyLeases,
  getLeasePayments,
  recordLeasePayment,
  getPropertyReviews,
  ownerRespondToPropertyReview,
  createProperty as apiCreateProperty,
  createPropertyWithImages,
  updateProperty as apiUpdateProperty,
  updatePropertyWithImages,
  filterExternalPropertyImageUrlsOnly,
  deleteProperty as apiDeleteProperty,
  type ProfileDTO,
  type ComplaintDTO,
  type ComplaintMessageDTO,
  type ComplaintPriority,
  type ComplaintStatus,
  type RentalApplicationDTO,
  type LeaseDTO,
  type LeasePaymentDTO,
  type LeasePaymentMode,
  type PropertyReviewDTO,
} from "@/lib/api";
import { VerificationBadge, type VerificationStatus } from "@/components/auth/VerificationBadge";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";
import {
  Building2, Users, IndianRupee, Plus, User, Bell, FileText, CreditCard,
  Trash2, Pencil, X, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Clock, Eye, MapPin, Check, XCircle, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { indianStates, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { EMPTY_PROPERTY_FORM, isPropertyFormValid } from "@/utils/propertyConstants";
import { PropertyFormMuiFields } from "@/components/dashboard/PropertyFormMuiFields";
import { RaiseComplaintMuiFields } from "@/components/dashboard/RaiseComplaintMuiFields";
import { ComplaintDetailStatusButtons } from "@/components/dashboard/ComplaintDetailStatusButtons";
import { OwnerProfileMuiForm } from "@/components/profile/OwnerProfileMuiForm";
import { ProfileUpdateDialog } from "@/components/profile/ProfileUpdateDialog";
import { isProfileLocationComplete } from "@/components/profile/shared/profileLocationTypes";
import { shouldPreventDialogCloseForMuiPicker } from "@/lib/muiPickerDialogGuard";
import {
  complaintMessagesForDisplay,
  mergeComplaintMessageList,
  sortComplaintMessages,
} from "@/lib/complaintSocket";
import { emitComplaintRead } from "@/lib/complaintStompClient";
import { ComplaintDetailAndChat } from "@/components/dashboard/ComplaintDetailAndChat";
import { cn } from "@/lib/utils";
import { useComplaintMessagesSocket } from "@/hooks/useComplaintMessagesSocket";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { StatusFilterDropdown } from "@/components/common/StatusFilterDropdown";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { SubmitProfileForReviewDialog } from "@/components/auth/SubmitProfileForReviewDialog";
import { DemoModeLoginPrompt } from "@/features/demo/DemoModeLoginPrompt";

const OWNERS = ["rajesh_owner"];

const COMPLAINT_NONE_VALUE = "__none__";

const ownerProfileMuiTheme = createTheme({
  palette: { mode: "light", primary: { main: "#0284c7" } },
});

const tabs = [
  { label: "Overview", icon: Building2, id: "overview" },
  { label: "Account", icon: User, id: "profile" },
  { label: "My Assets", icon: Building2, id: "assets" },
  { label: "Add Property", icon: Plus, id: "add-property" },
  { label: "My Tenants", icon: Users, id: "requests" },
  { label: "Complaints", icon: FileText, id: "complaints" },
  { label: "Payments", icon: CreditCard, id: "payments" },
  { label: "Alerts", icon: Bell, id: "notifications" },
];

function mapApiProfileToOwnerForm(d: ProfileDTO) {
  const stateCode = indianStates.find((s) => s.name === d.state)?.code ?? d.state;
  const legacyLine = [d.village, d.postOffice, d.policeStation].filter(Boolean).join(", ");
  return {
    fullName: d.fullName || "",
    gender: d.gender || "Male",
    dateOfBirth: d.dateOfBirth || "",
    aadharNumber: d.aadharNumber || "",
    mobile: (() => { const { countryCode, mobile: m } = parseMobileValue(d.mobile || ""); return m ? `${countryCode}|${m}` : ""; })(),
    email: d.email || "",
    address: (d.address && d.address.trim()) || legacyLine || "",
    city: d.city || "",
    district: d.district || "",
    state: stateCode,
    pinCode: d.pinCode || "",
  };
}

function emptyOwnerProfileForm() {
  return {
    fullName: "",
    gender: "Male" as const,
    dateOfBirth: "",
    aadharNumber: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pinCode: "",
  };
}

function mapDemoOwnerToForm(profile: OwnerProfile) {
  const { countryCode, mobile } = parseMobileValue(profile.mobile || "");
  const mobileFormValue = mobile ? `${countryCode || "91"}|${mobile}` : "";
  const sc = indianStates.find((s) => s.name === profile.state)?.code ?? profile.state;
  return {
    fullName: profile.name || "",
    gender: profile.gender || "Male",
    dateOfBirth: profile.dob || "",
    aadharNumber: profile.aadhar || "",
    mobile: mobileFormValue,
    email: profile.email || "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    district: profile.district || "",
    state: sc,
    pinCode: profile.pincode || "",
  };
}

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, dashboardPath } = useAuth();
  const {
    demoMode, properties, addProperty, updateProperty, deleteProperty,
    bookings, updateBookingStatus, payments, complaints, raiseComplaint, updateComplaintStatus,
    notifications, markNotificationRead, getNotificationsFor, ownerProfiles,
    isOwnerProfileApproved, submitOwnerProfile,
  } = useDemoData();
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState<PropertyRequest>({ ...EMPTY_PROPERTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState<"add" | "edit" | null>(null);
  const [propertyImageFiles, setPropertyImageFiles] = useState<File[]>([]);
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
  const [complaintTypingByUser, setComplaintTypingByUser] = useState<Record<string, boolean>>({});
  const [complaintReadReceiptsByUser, setComplaintReadReceiptsByUser] = useState<Record<string, number>>({});
  const [complaintLiveChatOpen, setComplaintLiveChatOpen] = useState(false);
  const [complaintMessageDeletingId, setComplaintMessageDeletingId] = useState<number | null>(null);
  const [rentalIncoming, setRentalIncoming] = useState<RentalApplicationDTO[]>([]);
  const [ownerLeases, setOwnerLeases] = useState<LeaseDTO[]>([]);
  const [ownerLeasePayments, setOwnerLeasePayments] = useState<LeasePaymentDTO[]>([]);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; propertyId: number | null; propertyTitle: string; reviews: PropertyReviewDTO[] }>({
    open: false,
    propertyId: null,
    propertyTitle: "",
    reviews: [],
  });
  const [reviewReplyDraft, setReviewReplyDraft] = useState<Record<number, string>>({});
  const [reviewReplySavingId, setReviewReplySavingId] = useState<number | null>(null);
  const [rentalLoading, setRentalLoading] = useState(false);
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
  const [ownerPendingApprovalBannerDismissed, setOwnerPendingApprovalBannerDismissed] = useState(false);
  const [ownerProfileForm, setOwnerProfileForm] = useState({
    fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", email: "",
    address: "", city: "", district: "", state: "", pinCode: "",
  });
  /** JSON snapshot when Update profile dialog opens — Save disabled until form differs. */
  const profileUpdateInitialRef = useRef<string | null>(null);
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
          toastError("Profile load failed", "Please try again later.");
        }
      })
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    if (useRealApi) fetchProfileFromDb();
  }, [useRealApi]);

  useEffect(() => {
    if (!profileUpdateDialogOpen) {
      profileUpdateInitialRef.current = null;
      return;
    }
    if (demoMode) {
      const profile = ownerProfiles.find((p) => p.ownerUser === currentOwner);
      if (profile) {
        const newForm = mapDemoOwnerToForm(profile);
        setOwnerProfileForm(newForm);
        profileUpdateInitialRef.current = JSON.stringify(newForm);
      } else {
        const empty = emptyOwnerProfileForm();
        setOwnerProfileForm(empty);
        profileUpdateInitialRef.current = JSON.stringify(empty);
      }
    } else if (useRealApi) {
      if (apiProfile) {
        const newForm = mapApiProfileToOwnerForm(apiProfile);
        setOwnerProfileForm(newForm);
        profileUpdateInitialRef.current = JSON.stringify(newForm);
      } else {
        const empty = emptyOwnerProfileForm();
        setOwnerProfileForm(empty);
        profileUpdateInitialRef.current = JSON.stringify(empty);
      }
    }
  }, [profileUpdateDialogOpen, demoMode, useRealApi, apiProfile, ownerProfiles, currentOwner]);

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
    setComplaintTypingByUser({});
    getComplaintMessages(id)
      .then((res) => {
        const list = (res as { data?: ComplaintMessageDTO[] }).data;
        if (Array.isArray(list))
          setComplaintMessages(sortComplaintMessages(complaintMessagesForDisplay(list)));
      })
      .catch(() => setComplaintMessages([]));
    getComplaintReadReceipts(id)
      .then((res) => {
        const list = (res as { data?: { userName: string; lastReadMessageId: number }[] }).data;
        const map: Record<string, number> = {};
        if (Array.isArray(list)) {
          for (const r of list) {
            if (r?.userName) map[r.userName] = r.lastReadMessageId;
          }
        }
        setComplaintReadReceiptsByUser(map);
      })
      .catch(() => setComplaintReadReceiptsByUser({}));
    setComplaintMessageText("");
    setComplaintLiveChatOpen(false);
  }, [detailItem, useRealApi]);

  useEffect(() => {
    if (detailItem?.type !== "complaint") setComplaintLiveChatOpen(false);
  }, [detailItem?.type]);

  const complaintSocketComplaintId =
    useRealApi && user && detailItem?.type === "complaint" && detailItem.data && "id" in detailItem.data
      ? (detailItem.data as ComplaintDTO).id
      : null;

  useComplaintMessagesSocket({
    complaintId: complaintSocketComplaintId,
    enabled: Boolean(useRealApi && user && complaintLiveChatOpen && complaintSocketComplaintId != null),
    onMessage: (msg) => {
      setComplaintMessages((prev) => mergeComplaintMessageList(prev, msg));
    },
    onTyping: (userName, typing) => {
      setComplaintTypingByUser((prev) => ({ ...prev, [userName]: typing }));
    },
    onReadReceipt: (readerUserName, lastReadMessageId) => {
      setComplaintReadReceiptsByUser((prev) => {
        const next = { ...prev };
        const cur = next[readerUserName] ?? 0;
        next[readerUserName] = Math.max(cur, lastReadMessageId);
        return next;
      });
    },
    onMessageDeleted: (messageId) => {
      setComplaintMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
  });

  useEffect(() => {
    if (!useRealApi || complaintSocketComplaintId == null || !complaintLiveChatOpen) return;
    const myId = decodedToken?.userId ?? null;
    const myName = (user?.username ?? currentOwner).trim().toLowerCase();
    const ids = complaintMessages
      .filter((m) => {
        const mid = m.id;
        if (mid == null || mid <= 0) return false;
        if (myId != null && myId > 0) return m.senderId !== myId;
        return (m.senderUserName ?? "").trim().toLowerCase() !== myName;
      })
      .map((m) => m.id as number);
    if (ids.length === 0) return;
    const maxId = Math.max(...ids);
    const t = window.setTimeout(() => {
      void markComplaintThreadRead(complaintSocketComplaintId, maxId).catch(() => {});
      emitComplaintRead(complaintSocketComplaintId, maxId);
    }, 450);
    return () => window.clearTimeout(t);
  }, [useRealApi, complaintSocketComplaintId, complaintMessages, complaintLiveChatOpen]);

  useEffect(() => {
    if (activeTab !== "complaints" && detailItem?.type === "complaint") {
      setDetailItem(null);
    }
  }, [activeTab, detailItem?.type]);

  const complaintTypingNames = useMemo(() => {
    const me = (user?.username ?? "").trim().toLowerCase();
    return Object.entries(complaintTypingByUser)
      .filter(([name, on]) => on && name.trim().toLowerCase() !== me)
      .map(([name]) => name);
  }, [complaintTypingByUser, user?.username]);

  const handleDeleteComplaintMessage = (messageId: number) => {
    if (complaintSocketComplaintId == null) return;
    setComplaintMessageDeletingId(messageId);
    deleteComplaintMessage(complaintSocketComplaintId, messageId)
      .then((res) => {
        const d = (res as { data?: ComplaintMessageDTO }).data;
        if (d) setComplaintMessages((prev) => mergeComplaintMessageList(prev, d));
      })
      .catch((err) => toastError("Failed to delete message", (err as Error)?.message))
      .finally(() => setComplaintMessageDeletingId(null));
  };

  const handleSendComplaintMessage = () => {
    if (!detailItem || detailItem.type !== "complaint" || !complaintMessageText.trim()) return;
    const id = (detailItem.data as ComplaintDTO).id;
    const trimmed = complaintMessageText.trim();
    const optimistic: ComplaintMessageDTO = {
      id: null,
      complaintId: id,
      senderId: decodedToken?.userId ?? 0,
      senderUserName: user?.username ?? currentOwner,
      messageText: trimmed,
      createdAt: new Date().toISOString(),
    };
    setComplaintMessages((prev) => mergeComplaintMessageList(prev, optimistic));
    setComplaintMessageText("");
    setComplaintMessageSending(true);
    sendComplaintMessage(id, trimmed)
      .then((res) => {
        const d = (res as { data?: ComplaintMessageDTO }).data;
        if (d) setComplaintMessages((prev) => mergeComplaintMessageList(prev, d));
      })
      .catch((err) => toastError("Failed to send", (err as Error)?.message))
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
        .then((res) => { toastSuccess("Complaint resolved", res?.message); done(res); })
        .catch((err) => { toastError("Failed to resolve", (err as Error)?.message); setComplaintStatusUpdating(false); });
    } else {
      apiUpdateComplaintStatus(complaintId, newStatus)
        .then((res) => { toastSuccess("Status updated", res?.message); done(res); })
        .catch((err) => { toastError("Failed to update status", (err as Error)?.message); setComplaintStatusUpdating(false); });
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
        toastSuccess("Status updated", res?.message);
      })
      .catch((err) => toastError("Failed to update status", (err as Error)?.message))
      .finally(() => setComplaintStatusUpdating(false));
  };

  const refetchOwnerProperties = () => {
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
  };

  useEffect(() => {
    if (!useRealApi) return;
    refetchOwnerProperties();
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

  useEffect(() => {
    if (!useRealApi || !user) return;
    if (activeTab !== "requests" && activeTab !== "payments" && activeTab !== "overview") return;
    setRentalLoading(true);
    Promise.all([getIncomingRentalApplications(), getMyLeases()])
      .then(async ([incomingRes, leasesRes]) => {
        const incoming = (incomingRes as { data?: RentalApplicationDTO[] }).data;
        const leases = (leasesRes as { data?: LeaseDTO[] }).data;
        const ownerApps = Array.isArray(incoming) ? incoming.filter((x) => x.ownerUserName === currentOwner) : [];
        const ownerOnlyLeases = Array.isArray(leases) ? leases.filter((l) => l.ownerUserName === currentOwner) : [];
        setRentalIncoming(ownerApps);
        setOwnerLeases(ownerOnlyLeases);
        const paymentsNested = await Promise.all(
          ownerOnlyLeases.map((l) =>
            getLeasePayments(l.id)
              .then((r) => ((r as { data?: LeasePaymentDTO[] }).data ?? []))
              .catch(() => [] as LeasePaymentDTO[])
          )
        );
        setOwnerLeasePayments(paymentsNested.flat());
      })
      .catch(() => {
        setRentalIncoming([]);
        setOwnerLeases([]);
        setOwnerLeasePayments([]);
      })
      .finally(() => setRentalLoading(false));
  }, [useRealApi, user, activeTab, currentOwner]);

  const ownerProfileApproved = demoMode ? isOwnerProfileApproved(currentOwner) : (apiApproved === true || apiProfile?.status === "APPROVED");
  const verificationStatus: VerificationStatus = demoMode
    ? (ownerProfiles.find((p) => p.ownerUser === currentOwner)?.status ?? null)
    : ((apiProfile?.status as VerificationStatus) ?? null);
  const myProperties = useRealApi ? apiOwnerProperties : properties.filter(p => p.ownerUserName === currentOwner);
  const filteredMyProperties = assetStatusFilter ? myProperties.filter((p) => (p.status ?? "") === assetStatusFilter) : myProperties;
  const myBookings = bookings.filter(b => b.ownerName === currentOwner);
  const myPayments = payments.filter(p => p.ownerName === currentOwner);
  const displayPayments = useRealApi
    ? ownerLeasePayments.map((p) => {
        const lease = ownerLeases.find((l) => l.id === p.leaseId);
        return {
          id: p.id,
          propertyTitle: lease?.propertyTitle ?? `Lease #${p.leaseId}`,
          tenantName: lease?.tenantUserName ?? "-",
          month: p.periodMonth,
          amount: Number(p.amountDue ?? 0),
          status: p.status,
          leaseId: p.leaseId,
        };
      })
    : (demoMode ? [] : myPayments);
  const myComplaintsDemo = complaints.filter(c => c.raisedBy === currentOwner || c.againstUser === currentOwner);
  const myComplaintsAll = useRealApi ? apiComplaints : myComplaintsDemo;
  const myComplaints = complaintStatusFilter ? myComplaintsAll.filter((c) => c.status === complaintStatusFilter) : myComplaintsAll;
  const openComplaintsCount = myComplaintsAll.filter((c) => c.status === "OPEN").length;
  const tenantComplaints = useRealApi
    ? apiComplaints.filter(c => c.relatedUserName === currentOwner && c.status !== "RESOLVED" && c.status !== "CLOSED")
    : complaints.filter(c => c.againstUser === currentOwner && c.raisedByRole === "TENANT" && c.status !== "RESOLVED" && c.status !== "CLOSED");
  const myNotifications = demoMode ? [] : getNotificationsFor(currentOwner, "OWNER");
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const pendingRequests = useRealApi
    ? rentalIncoming.filter((r) => r.status === "PENDING")
    : myBookings.filter(b => b.status === "REQUESTED");
  const decodedToken = getDecodedToken();

  const openPropertyAdd = () => {
    setForm({ ...EMPTY_PROPERTY_FORM });
    setPropertyImageFiles([]);
    setEditingId(null);
    setPropertyDialogOpen("add");
  };

  const openPropertyEdit = (p: typeof properties[0]) => {
    setPropertyImageFiles([]);
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

  const handleDelete = (id: number) => {
    if (useRealApi) {
      apiDeleteProperty(id)
        .then(() => {
          toastSuccess("Property deleted");
          refetchOwnerProperties();
        })
        .catch((err) => toastError("Delete failed", (err as Error)?.message));
    } else {
      deleteProperty(id);
      toastSuccess("Property deleted");
    }
  };

  const stateNameForForm = indianStates.find(s => s.code === form.state)?.name ?? form.state;

  const buildPropertyRequest = (): PropertyRequest => ({
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
    latitude: null,
    longitude: null,
    address: form.address.trim(),
    city: form.city.trim(),
    state: stateNameForForm,
    pinCode: form.pinCode.trim(),
    images: filterExternalPropertyImageUrlsOnly(Array.isArray(form.images) ? form.images : []),
  });

  const buildPropertyPayload = (): Omit<PropertyDTO, "id" | "createdAt" | "updatedAt"> => ({
    ...buildPropertyRequest(),
    ownerUserName: currentOwner,
    status: editingId ? (properties.find(pr => pr.id === editingId)?.status ?? "PENDING") : "PENDING",
  } as Omit<PropertyDTO, "id" | "createdAt" | "updatedAt">);

  const handleSubmitProperty = () => {
    if (form.state && form.pinCode.length === 6 && !isPincodeValidForState(form.pinCode, form.state)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
      return;
    }
    if (useRealApi) {
      const req = buildPropertyRequest();
      if (editingId) {
        const afterSave = () => {
          toastSuccess("Updated");
          refetchOwnerProperties();
          setForm({ ...EMPTY_PROPERTY_FORM });
          setPropertyImageFiles([]);
          setEditingId(null);
          setPropertyDialogOpen(null);
          setActiveTab("assets");
        };
        if (propertyImageFiles.length > 0) {
          updatePropertyWithImages(editingId, req, propertyImageFiles).then(afterSave).catch((err) =>
            toastError("Update failed", (err as Error)?.message)
          );
        } else {
          apiUpdateProperty(editingId, req).then(afterSave).catch((err) =>
            toastError("Update failed", (err as Error)?.message)
          );
        }
      } else {
        const afterCreate = () => {
          toastSuccess("Created — pending approval");
          refetchOwnerProperties();
          setForm({ ...EMPTY_PROPERTY_FORM });
          setPropertyImageFiles([]);
          setEditingId(null);
          setPropertyDialogOpen(null);
          setActiveTab("assets");
        };
        if (propertyImageFiles.length > 0) {
          createPropertyWithImages(req, propertyImageFiles).then(afterCreate).catch((err) =>
            toastError("Create failed", (err as Error)?.message)
          );
        } else {
          apiCreateProperty(req).then(afterCreate).catch((err) =>
            toastError("Create failed", (err as Error)?.message)
          );
        }
      }
      return;
    }
    const payload = buildPropertyPayload();
    if (editingId) {
      updateProperty(editingId, payload);
      toastSuccess("Updated");
    } else {
      addProperty(payload);
      toastSuccess("Created — pending approval");
    }
    setForm({ ...EMPTY_PROPERTY_FORM });
    setPropertyImageFiles([]);
    setEditingId(null);
    setPropertyDialogOpen(null);
    setActiveTab("assets");
  };

  const handleBookingAction = (id: number, status: "APPROVED" | "REJECTED") => {
    updateBookingStatus(id, status);
    if (status === "APPROVED") {
      toastActionSuccess("approved", "Request", "The tenant can now proceed with next steps.");
    } else {
      toastActionSuccess("rejected", "Request", "The tenant has been notified politely.");
    }
  };

  const refreshIncomingRequests = () =>
    getIncomingRentalApplications().then((res) =>
      setRentalIncoming(((res as { data?: RentalApplicationDTO[] }).data ?? []).filter((x) => x.ownerUserName === currentOwner))
    );

  const handleRentalRequestDecision = (a: RentalApplicationDTO, decision: "APPROVE" | "REJECT") => {
    const isApprove = decision === "APPROVE";
    const actionVerb = isApprove ? "Approve" : "Reject";
    const apiCall = isApprove ? approveRentalApplication(a.id) : rejectRentalApplication(a.id);

    openConfirm(
      `${actionVerb} tenant request?`,
      `${actionVerb} request for "${a.propertyTitle}" by ${a.tenantUserName}?`,
      actionVerb,
      isApprove ? "default" : "destructive",
      () => {
        apiCall
          .then(() => refreshIncomingRequests())
          .then(() => {
            if (isApprove) {
              toastActionSuccess("approved", "Request", "Tenant request has been approved.");
            } else {
              toastActionSuccess("rejected", "Request", "Tenant request has been rejected.");
            }
          })
          .catch((err) => {
            if (isApprove) {
              toastActionError("approve", "request", (err as Error)?.message);
            } else {
              toastActionError("reject", "request", (err as Error)?.message);
            }
          });
      }
    );
  };

  const openReviewsForProperty = (propertyId: number, propertyTitle: string) => {
    getPropertyReviews(propertyId)
      .then((res) => {
        const reviews = ((res as { data?: PropertyReviewDTO[] }).data) ?? [];
        const draft: Record<number, string> = {};
        for (const r of reviews) draft[r.id] = r.ownerResponse ?? "";
        setReviewReplyDraft(draft);
        setReviewDialog({ open: true, propertyId, propertyTitle, reviews });
      })
      .catch((err) => toastError("Could not load reviews", (err as Error)?.message));
  };

  const handleSaveReviewReply = (reviewId: number) => {
    const text = (reviewReplyDraft[reviewId] ?? "").trim();
    if (!text) {
      toastError("Enter a response");
      return;
    }
    setReviewReplySavingId(reviewId);
    ownerRespondToPropertyReview(reviewId, text)
      .then((res) => {
        const updated = (res as { data?: PropertyReviewDTO }).data;
        if (updated) {
          setReviewDialog((prev) => ({
            ...prev,
            reviews: prev.reviews.map((r) => (r.id === reviewId ? updated : r)),
          }));
        }
        toastSuccess("Response saved", "Your reply is now visible to users.");
      })
      .catch((err) => toastError("Could not save response", (err as Error)?.message))
      .finally(() => setReviewReplySavingId(null));
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

  const handleRaiseComplaint = () => {
    if (useRealApi) {
      if (!complaintForm.title?.trim() || !complaintForm.propertyId) {
        toastError("Missing fields", "Property and subject are required.");
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
          toastSuccess("Complaint raised", "Your complaint has been submitted.");
          setComplaintDialog(false);
          setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
          refetchComplaints();
        })
        .catch((err) => toastError("Failed to raise complaint", (err as Error)?.message));
      return;
    }
    if (!complaintForm.title || !complaintForm.propertyId) return;
    const prop = properties.find(p => p.id === complaintForm.propertyId);
    raiseComplaint({ title: complaintForm.title, description: complaintForm.description, raisedBy: currentOwner, raisedByRole: "OWNER", againstUser: complaintForm.againstUser || "tenant", againstRole: "TENANT", propertyId: complaintForm.propertyId, propertyTitle: prop?.title || "", priority: complaintForm.priority });
    toastSuccess("Complaint raised"); setComplaintDialog(false);
    setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
  };

  const handleResolveComplaint = () => {
    if (useRealApi) {
      resolveComplaint(resolveDialog.id, resolveNote || `Resolved by ${currentOwner}`)
        .then(() => {
          toastSuccess("Complaint resolved");
          setResolveDialog({ open: false, id: 0 });
          setResolveNote("");
          refetchComplaints();
        })
        .catch((err) => toastError("Failed to resolve", (err as Error)?.message));
      return;
    }
    updateComplaintStatus(resolveDialog.id, "RESOLVED", resolveNote || `Resolved by ${currentOwner}`);
    toastSuccess("Complaint resolved");
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
      address: (ownerProfileForm.address || "").trim(),
      city: ownerProfileForm.city.trim(),
      district: ownerProfileForm.district.trim(),
      state: stateName,
      pinCode: ownerProfileForm.pinCode.trim(),
      village: null,
      postOffice: null,
      policeStation: null,
    };
  };

  const isOwnerProfileUpdateFormValid = () => {
    if (!isProfileLocationComplete(ownerProfileForm)) return false;
    if (ownerProfileForm.state && ownerProfileForm.pinCode.length === 6 && !isPincodeValidForState(ownerProfileForm.pinCode, ownerProfileForm.state)) return false;
    const aadharVal = (ownerProfileForm.aadharNumber || "").trim().replace(/\D/g, "");
    if (aadharVal.length !== 12) return false;
    const { countryCode, mobile: m } = parseMobileValue(ownerProfileForm.mobile);
    if (!ownerProfileForm.fullName?.trim() || !ownerProfileForm.dateOfBirth || !formatMobileForApi(countryCode, m)) return false;
    return true;
  };

  const hasOwnerProfileUpdateFormChanged = () => {
    if (!profileUpdateInitialRef.current) return false;
    return JSON.stringify(ownerProfileForm) !== profileUpdateInitialRef.current;
  };

  const canSaveOwnerProfileUpdate =
    profileUpdateDialogOpen && isOwnerProfileUpdateFormValid() && hasOwnerProfileUpdateFormChanged();

  const handleUpdateOwnerProfile = () => {
    if (!hasOwnerProfileUpdateFormChanged()) {
      toastError("No changes", "Update at least one field before saving.");
      return;
    }
    if (!isProfileLocationComplete(ownerProfileForm)) {
      toastError("Missing address", "State, city, district, pin code, and village/street/house are required.");
      return;
    }
    if (ownerProfileForm.state && ownerProfileForm.pinCode.length === 6 && !isPincodeValidForState(ownerProfileForm.pinCode, ownerProfileForm.state)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
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
        state: ownerProfileForm.state || "",
        district: ownerProfileForm.district?.trim() || "",
        city: ownerProfileForm.city?.trim() || "",
        address: ownerProfileForm.address?.trim() || "",
        pincode: ownerProfileForm.pinCode?.trim() || "",
      });
      toastSuccess("Profile updated", "Click the Verify badge to submit for review.");
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
        toastSuccess("Profile updated");
        setProfileUpdateDialogOpen(false);
        fetchProfileFromDb();
      })
      .catch((err) => toastError("Update failed", err?.message))
      .finally(() => setUpdatingProfile(false));
  };

  const handleSubmitOwnerProfileForReview = () => {
    if (!isProfileLocationComplete(ownerProfileForm)) {
      toastError("Missing address", "State, city, district, pin code, and village/street/house are required.");
      return;
    }
    if (ownerProfileForm.state && ownerProfileForm.pinCode.length === 6 && !isPincodeValidForState(ownerProfileForm.pinCode, ownerProfileForm.state)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
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
        state: ownerProfileForm.state || "",
        district: ownerProfileForm.district?.trim() || "",
        city: ownerProfileForm.city?.trim() || "",
        address: ownerProfileForm.address?.trim() || "",
        pincode: ownerProfileForm.pinCode?.trim() || "",
      });
      toastSuccess("Profile submitted for review", "Your profile will be reviewed by admin.");
      setProfileSubmitDialogOpen(false);
      return;
    }
    setSubmittingProfile(true);
    submitProfileForReview("ROLE_OWNER", buildOwnerProfileBody())
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data) setApiProfile(data);
        setProfileUpdatedAfterLoad(false);
        toastSuccess("Profile submitted for review", "Your profile will be reviewed by admin.");
        setProfileSubmitDialogOpen(false);
        fetchProfileFromDb();
      })
      .catch((err) => toastError("Submission failed", err?.message))
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
        {!ownerProfileApproved && !ownerPendingApprovalBannerDismissed && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Your profile is pending approval. You cannot add properties until an admin approves your profile.
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setOwnerPendingApprovalBannerDismissed(true)}
              className="shrink-0 rounded-md p-1.5 text-amber-800 hover:bg-amber-500/25 dark:text-amber-200 dark:hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500/70 dark:border-l-sky-400/50 pl-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome, {currentOwner || "Owner"} — Manage your properties</p>
        </div>

        {/* Mobile horizontal tabs */}
        <div className="flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4 md:hidden scrollbar-hide">
          {tabs.map((t) => (
            <button type="button" key={t.id} onClick={() => setActiveTab(t.id)}
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
                  <button type="button" key={t.id} onClick={() => setActiveTab(t.id)}
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
                    <button type="button" key={s.label} onClick={() => setActiveTab(s.tab)} className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4 text-left hover:shadow-lg hover:border-sky-300/60 dark:hover:border-sky-500/40 hover:bg-sky-50/40 dark:hover:bg-sky-900/20 transition-all duration-200 active:scale-[0.99] group">
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

            {activeTab === "add-property" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md p-6">
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="h-14 w-14 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Plus className="h-7 w-7 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Add a new property</h2>
                  <p className="text-sm text-muted-foreground text-center max-w-md">List your property with title, description, address, and media. New listings are set to PENDING until admin approval.</p>
                  <Button
                    onClick={() => ownerProfileApproved ? openPropertyAdd() : toastError("Profile approval required")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add property
                  </Button>
                </div>
              </div>
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
                        onClick={() => ownerProfileApproved ? openPropertyAdd() : toastError("Profile approval required")}
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
                      onClick={() => ownerProfileApproved ? openPropertyAdd() : toastError("Profile approval required")}
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
                              onClick={(e) => { e.stopPropagation(); openReviewsForProperty(p.id, p.title); }}
                              className="inline-flex items-center gap-1 rounded-full border border-violet-500/50 bg-transparent text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Reviews
                            </button>
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
                  <p className="text-xs text-muted-foreground mt-0.5">{useRealApi ? "Approve or reject rental applications from tenants." : "Approve or reject visit and booking requests from tenants."}</p>
                </div>
                {useRealApi ? (
                  rentalLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading rental requests...</div>
                  ) : rentalIncoming.length === 0 ? (
                    <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No rental requests yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Applications submitted by tenants will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rentalIncoming.map((a) => (
                        <div key={a.id} className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-card-foreground truncate">{a.propertyTitle}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{a.tenantUserName} • Move-in {new Date(a.moveInDate).toLocaleDateString()}</p>
                              <p className="text-xs text-muted-foreground">₹{Number(a.proposedRent ?? 0).toLocaleString()} for {a.leaseMonths} months</p>
                            </div>
                            <div className="shrink-0">
                              <Badge variant={a.status === "APPROVED" ? "default" : a.status === "PENDING" ? "secondary" : "destructive"} className="text-[10px]">{a.status}</Badge>
                            </div>
                          </div>
                          {a.status === "PENDING" && (
                            <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleRentalRequestDecision(a, "APPROVE")}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRentalRequestDecision(a, "REJECT")}
                                className="inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : myBookings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No tenant requests yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">When tenants request a visit or booking for your properties, they will appear here for you to approve or reject.</p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myBookings.map(b => (
                    <div key={b.id} className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all active:scale-[0.995]">
                      <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setDetailItem({ type: "request", data: b })}>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-card-foreground truncate">{b.propertyTitle}</p><p className="text-xs text-muted-foreground truncate mt-0.5">{b.tenantName} • {new Date(b.visitDate).toLocaleDateString()}</p></div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={b.status === "APPROVED" ? "default" : b.status === "REQUESTED" ? "secondary" : "destructive"} className="text-[10px] shrink-0">{b.status}</Badge>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {b.status === "REQUESTED" && (
                        <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => openConfirm("Approve request?", "This will approve the booking/visit request.", "Approve", "default", () => handleBookingAction(b.id, "APPROVED"))}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirm("Reject request?", "This will reject the booking/visit request.", "Reject", "destructive", () => handleBookingAction(b.id, "REJECTED"))}
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
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
                  <p className="text-xs text-muted-foreground mt-0.5">{useRealApi ? "Record manual rent collection and view lease dues." : "Rent and other payments from tenants."}</p>
                </div>
                {rentalLoading && useRealApi ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading payments...</div>
                ) : displayPayments.length === 0 ? (
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
                        {useRealApi && p.status !== "PAID" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              const amount = window.prompt("Enter received amount", String(p.amount));
                              if (!amount) return;
                              const n = Number(amount);
                              if (!Number.isFinite(n) || n <= 0) {
                                toastError("Invalid amount");
                                return;
                              }
                              const mode = (window.prompt("Payment mode (CASH/BANK/UPI/OTHER)", "CASH") || "CASH").toUpperCase() as LeasePaymentMode;
                              recordLeasePayment((p as { leaseId: number }).leaseId, {
                                paymentId: p.id,
                                amountPaid: n,
                                paymentMode: mode,
                              })
                                .then(() => Promise.all([getIncomingRentalApplications(), getMyLeases()]))
                                .then(() => {
                                  toastSuccess("Payment recorded");
                                  setActiveTab("payments");
                                })
                                .catch((err) => toastError("Payment record failed", (err as Error)?.message));
                            }}
                          >
                            Record
                          </Button>
                        )}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-bold text-foreground">My Complaints</h2>
                          <p className="text-xs text-muted-foreground">Tap a complaint to open details. Use Open live chat at the bottom to connect in real time.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <StatusFilterDropdown value={complaintStatusFilter} onChange={setComplaintStatusFilter} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-[11rem] shrink-0 rounded-full border-emerald-500/50 bg-transparent px-4 text-sm font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
                        onClick={() => setComplaintDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Raise complaint
                      </Button>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 h-9 min-w-[11rem] rounded-full border-emerald-500/50 bg-transparent px-4 text-sm font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
                        onClick={() => setComplaintDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Raise complaint
                      </Button>
                    )}
                  </div>
                ) : detailItem?.type === "complaint" && detailItem.data && "id" in detailItem.data ? (
                (() => {
                  const c = detailItem.data as ComplaintDTO & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string; raisedByRole?: string; againstRole?: string; adminNote?: string };
                  const propertyTitle =
                    myProperties.find((p) => p.id === c.propertyId)?.title ?? c.propertyTitle ?? (c.propertyId ? `Property #${c.propertyId}` : "—");
                  const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";
                  const canResolve = (c.relatedUserName === currentOwner || c.againstUser === currentOwner) && !isResolved;
                  return (
                    <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm dark:border-slate-700">
                      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 -ml-1 px-2 text-xs"
                          onClick={() => {
                            setDetailItem(null);
                            setComplaintLiveChatOpen(false);
                          }}
                        >
                          <ChevronLeft className="mr-0.5 h-4 w-4" /> Back
                        </Button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{c.subject ?? c.title ?? "Complaint"}</p>
                          <p className="text-[11px] text-muted-foreground">Details — open live chat when you are ready</p>
                        </div>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
                        <ComplaintDetailAndChat
                          c={c}
                          propertyTitle={propertyTitle}
                          currentUserName={user?.username ?? currentOwner}
                          currentUserId={decodedToken?.userId ?? null}
                          useRealApi={Boolean(useRealApi)}
                          complaintIdForChat={complaintSocketComplaintId}
                          messages={complaintMessages}
                          readReceiptsByUser={complaintReadReceiptsByUser}
                          typingUserNames={complaintTypingNames}
                          messageText={complaintMessageText}
                          onMessageTextChange={setComplaintMessageText}
                          onSend={handleSendComplaintMessage}
                          sending={complaintMessageSending}
                          liveChatOpen={complaintLiveChatOpen}
                          onOpenLiveChat={() => setComplaintLiveChatOpen(true)}
                          onCloseLiveChat={() => setComplaintLiveChatOpen(false)}
                          onDeleteMessage={handleDeleteComplaintMessage}
                          deletingMessageId={complaintMessageDeletingId}
                          actionsSlot={
                            useRealApi ? (
                              <div className="rounded-lg border border-slate-200 bg-muted/20 p-4 space-y-3 dark:border-slate-700">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <ComplaintDetailStatusButtons
                                    currentStatus={c.status}
                                    disabled={complaintStatusUpdating}
                                    onChange={(newStatus) => {
                                      if (newStatus !== c.status) {
                                        setStatusUpdateDialog({ open: true, complaintId: c.id, newStatus, currentStatus: c.status, message: "" });
                                      }
                                    }}
                                  />
                                  {canResolve && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-emerald-500/50 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                      onClick={() => {
                                        setResolveDialog({ open: true, id: c.id });
                                        setDetailItem(null);
                                        setComplaintLiveChatOpen(false);
                                      }}
                                    >
                                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                      Resolve
                                    </Button>
                                  )}
                                </div>
                                {complaintStatusUpdating && <p className="text-xs text-muted-foreground">Updating…</p>}
                              </div>
                            ) : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })()
                ) : (
                <div className="max-h-[min(72vh,720px)] space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
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
                        className={cn(
                          "bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all cursor-pointer active:scale-[0.995]",
                        )}
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
                              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <Clock className="h-3.5 w-3.5 shrink-0" /> In progress
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
                          onClick={() => { if (demoMode) { setDemoLoginPromptOpen(true); return; } setProfileUpdateDialogOpen(true); }}
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
                                  <p className="text-sm font-medium text-foreground">{[apiProfile.address, apiProfile.city, apiProfile.district, apiProfile.state, apiProfile.pinCode].filter(Boolean).join(", ") || "—"}</p>
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
                                  <p className="text-sm font-medium text-foreground">{[profile.address, profile.city, profile.district, profile.state].filter(Boolean).join(", ") || "—"} – {profile.pincode}</p>
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
                                <p className="text-sm text-muted-foreground">No profile details yet. Use <strong>Update profile</strong> (via the Verify badge) to add your information.</p>
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

      {/* Add/Edit Property — same dialog shell as profile */}
      <Dialog open={propertyDialogOpen !== null} onOpenChange={(open) => { if (!open) { setPropertyDialogOpen(null); setEditingId(null); setPropertyImageFiles([]); } }}>
        <DialogContent
          className="flex max-h-[min(92vh,760px)] min-h-0 w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]"
          onPointerDownOutside={(e) => {
            if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight">{propertyDialogOpen === "add" ? "Add property" : "Edit property"}</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fields marked <span className="text-destructive">*</span> are required. New listings are <strong>PENDING</strong> until admin approves.
            </p>
          </div>
          {/* max-h: dialog cap minus header + footer — avoids 1fr stretching empty space below short forms (e.g. after file pick) */}
          <div className="min-h-0 min-w-0 max-h-[calc(min(92vh,760px)_-_13.5rem)] overflow-y-auto overscroll-contain bg-background px-5 py-4 scroll-smooth sm:px-7">
            <ThemeProvider theme={ownerProfileMuiTheme}>
              <div className="min-h-0 min-w-0">
              <PropertyFormMuiFields
                form={form}
                setForm={setForm}
                stateMode="code"
                hideLatLong
                uploadedFiles={useRealApi ? propertyImageFiles : []}
                onUploadedFilesChange={useRealApi ? setPropertyImageFiles : undefined}
              />
              </div>
            </ThemeProvider>
          </div>
          <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => { setPropertyDialogOpen(null); setEditingId(null); setPropertyImageFiles([]); }}>Cancel</Button>
              <Button
                type="button"
                className="min-h-10 w-full sm:w-auto"
                onClick={() => openConfirm(editingId ? "Update property?" : "Create property?", editingId ? `Save changes to "${form.title}"?` : "This will add a new property listing. Status will be PENDING until admin approves.", editingId ? "Update" : "Create", "default", handleSubmitProperty)}
                disabled={!isPropertyFormValid(form)}
              >
                {propertyDialogOpen === "add" ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => !open && setReviewDialog({ open: false, propertyId: null, propertyTitle: "", reviews: [] })}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Property Reviews - {reviewDialog.propertyTitle || "Listing"}</DialogTitle>
          </DialogHeader>
          {reviewDialog.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews available for this property yet.</p>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto space-y-3">
              {reviewDialog.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.reviewerUserName}</p>
                      <p className="text-xs text-muted-foreground">{r.rating}/5 {r.verifiedStay ? "• Verified stay" : ""}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm text-foreground mt-2">{r.comment}</p>
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs">Owner response</Label>
                    <Textarea
                      value={reviewReplyDraft[r.id] ?? ""}
                      onChange={(e) => setReviewReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      rows={2}
                      placeholder="Write a polite response to this review..."
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveReviewReply(r.id)}
                        disabled={reviewReplySavingId === r.id}
                      >
                        {reviewReplySavingId === r.id ? "Saving..." : "Save response"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewDialog({ open: false, propertyId: null, propertyTitle: "", reviews: [] })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileUpdateDialog
        open={profileUpdateDialogOpen}
        onOpenChange={(open) => {
          setProfileUpdateDialogOpen(open);
          if (!open) setOwnerProfileForm(emptyOwnerProfileForm());
        }}
        description='Update your details. Use "Submit for verification" when you want admin to review.'
        saveDisabled={!canSaveOwnerProfileUpdate}
        saving={updatingProfile}
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSaveOwnerProfileUpdate) return;
          openConfirm("Save profile?", "Your changes will be saved. Click the Verify badge to submit for review.", "Save", "default", () => handleUpdateOwnerProfile());
        }}
      >
        <ThemeProvider theme={ownerProfileMuiTheme}>
          <OwnerProfileMuiForm form={ownerProfileForm} setForm={setOwnerProfileForm} />
        </ThemeProvider>
      </ProfileUpdateDialog>

      {/* Submit profile for verification (owner) */}
      <Dialog open={profileSubmitDialogOpen} onOpenChange={(open) => { setProfileSubmitDialogOpen(open); if (!open) setOwnerProfileForm({ fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", email: "", address: "", city: "", district: "", state: "", pinCode: "" }); }}>
        <DialogContent
          className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]"
          onPointerDownOutside={(e) => {
            if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
            <DialogHeader className="space-y-1 text-left"><DialogTitle className="text-xl font-semibold tracking-tight">{apiProfile ? "Submit for verification" : "Owner Profile Setup"}</DialogTitle></DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">{apiProfile ? "Submit your profile for admin review." : "Complete your profile to get verified."}</p>
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => { e.preventDefault(); openConfirm("Submit for review?", "Your profile will be sent for admin verification.", "Submit", "default", () => handleSubmitOwnerProfileForReview()); }}
          >
            <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-background px-5 py-4 sm:px-7">
              <ThemeProvider theme={ownerProfileMuiTheme}>
                <OwnerProfileMuiForm form={ownerProfileForm} setForm={setOwnerProfileForm} />
              </ThemeProvider>
            </div>
            <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <Button type="button" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => setProfileSubmitDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="min-h-10 w-full sm:w-auto" disabled={submittingProfile}>
                  <FileText className="h-4 w-4 mr-2" />
                  {submittingProfile ? "Submitting..." : "Submit for Admin Review"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog (complaints open inline on the Complaints tab) */}
      <Dialog open={Boolean(detailItem && detailItem.type !== "complaint")} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailItem?.type === "request" ? "Request Details" : "Payment Details"}
            </DialogTitle>
          </DialogHeader>
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

      {/* Raise complaint — same dialog shell as profile / property */}
      <Dialog open={complaintDialog} onOpenChange={(open) => { if (!open) setComplaintForm({ title: "", description: "", againstUser: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" }); setComplaintDialog(open); }}>
        <DialogContent
          className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]"
          onPointerDownOutside={(e) => {
            if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
            <DialogHeader className="space-y-1 text-left"><DialogTitle className="text-xl font-semibold tracking-tight">Raise a complaint</DialogTitle></DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">Describe the issue. You can optionally relate it to someone linked to the property.</p>
          </div>
          <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-background px-5 py-4 sm:px-7">
            <ThemeProvider theme={ownerProfileMuiTheme}>
              <RaiseComplaintMuiFields
                properties={myProperties.map((p) => ({ id: p.id, title: p.title }))}
                propertyId={complaintForm.propertyId}
                onPropertyId={(id) => setComplaintForm((f) => ({ ...f, propertyId: id, relatedUserId: 0 }))}
                headline={complaintForm.title}
                onHeadline={(v) => setComplaintForm((f) => ({ ...f, title: v }))}
                description={complaintForm.description}
                onDescription={(v) => setComplaintForm((f) => ({ ...f, description: v }))}
                priority={complaintForm.priority}
                onPriority={(v) => setComplaintForm((f) => ({ ...f, priority: v }))}
                showAgainstSelect={Boolean(useRealApi)}
                relatedUserId={complaintForm.relatedUserId}
                onRelatedUserId={(id) => setComplaintForm((f) => ({ ...f, relatedUserId: id }))}
                againstOptions={againstOptions}
                againstLoading={againstOptionsLoading}
                againstNoneValue={COMPLAINT_NONE_VALUE}
                showDemoAgainstInput={!useRealApi}
                demoAgainstUser={complaintForm.againstUser}
                onDemoAgainstUser={!useRealApi ? (v) => setComplaintForm((f) => ({ ...f, againstUser: v })) : undefined}
              />
            </ThemeProvider>
          </div>
          <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => setComplaintDialog(false)}>Cancel</Button>
              <Button
                type="button"
                className="min-h-10 w-full sm:w-auto"
                onClick={() => openConfirm("Raise complaint?", "This will submit the complaint for review.", "Submit", "default", handleRaiseComplaint)}
                disabled={!complaintForm.title?.trim() || !complaintForm.propertyId}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Submit
              </Button>
            </DialogFooter>
          </div>
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
