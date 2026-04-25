import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher, { getDemoUser, subscribeDemoUser } from "@/features/demo/DemoRoleSwitcher";
import PropertyCard from "@/components/property/PropertyCard";
import { properties as staticProperties } from "@/constants/properties";
import { useDemoData, type Complaint } from "@/features/demo/DemoDataContext";
import { useExitDemoOnDashboardAction } from "@/features/demo/useExitDemoOnDashboardAction";
import { useAuth } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/app-toast";
import {
  getProfile, get2faStatus, submitProfileForReview, updateProfile, getComplaints, createComplaint, getUserIdByUsername, getDecodedToken, resolveApiMediaUrl,
  getComplaintMessages, getComplaintReadReceipts, markComplaintThreadRead, sendComplaintMessage, deleteComplaintMessage,
  getSubmittedRentalApplicationsForCurrentUser, cancelRentalApplication, getActiveLeasesForCurrentUser, getLeasePayments,
  getSavedProperties, getRentalApplicationTimeline, getLeaseDashboard,
  type ProfileDTO, type ComplaintDTO, type ComplaintPriority, type ComplaintStatus, type ComplaintMessageDTO,
  type RentalApplicationDTO, type LeaseDTO, type LeasePaymentDTO, type SavedPropertyDTO, type RentalApplicationTimelineEventDTO, type LeaseDashboardDTO,
} from "@/lib/api";
import { VerificationBadge, type VerificationStatus } from "@/components/auth/VerificationBadge";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";
import { indianStates, isPincodeValidForState, getCitiesForState, statePincodeRanges } from "@/constants/indianStates";
import {
  Heart, CalendarDays, User, Search, Bell, FileText,
  CreditCard, AlertCircle, Plus, IndianRupee,
  ChevronRight, ChevronLeft, Pencil, CheckCircle, Eye, MapPin, Clock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusFilterDropdown } from "@/components/common/StatusFilterDropdown";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { SubmitProfileForReviewDialog } from "@/components/auth/SubmitProfileForReviewDialog";
import { DemoModeLoginPrompt } from "@/features/demo/DemoModeLoginPrompt";
import { TenantProfileMuiForm } from "@/components/profile/TenantProfileMuiForm";
import { ProfilePhotoSection } from "@/components/profile/ProfilePhotoSection";
import { ProfileUpdateDialog } from "@/components/profile/ProfileUpdateDialog";
import { isProfileLocationComplete } from "@/components/profile/shared/profileLocationTypes";
import { RaiseComplaintMuiFields } from "@/components/dashboard/RaiseComplaintMuiFields";
import { formatDob, cn } from "@/lib/utils";
import { shouldPreventDialogCloseForMuiPicker } from "@/lib/muiPickerDialogGuard";
import {
  complaintMessagesForDisplay,
  mergeComplaintMessageList,
  sortComplaintMessages,
} from "@/lib/complaintSocket";
import { emitComplaintRead } from "@/lib/complaintStompClient";
import { ComplaintDetailAndChat } from "@/components/dashboard/ComplaintDetailAndChat";
import { UtilityActionButton } from "@/components/common/UtilityActionButton";
import { useComplaintMessagesSocket } from "@/hooks/useComplaintMessagesSocket";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DashboardNavShell } from "@/components/dashboard/DashboardNavShell";
import { TENANT_DASHBOARD_TABS, TENANT_DASHBOARD_TAB_IDS } from "@/constants/tenantDashboardTabs";

const tenantProfileMuiTheme = createTheme({
  palette: { mode: "light", primary: { main: "#0284c7" } },
});

const TENANTS = ["sneha_tenant"];

function formatMobileDisplay(mobile: string | null | undefined): string {
  if (!mobile?.trim()) return "—";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  return mobile;
}

const tabs = TENANT_DASHBOARD_TABS;

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, dashboardPath } = useAuth();
  const { demoMode, exitDemoAndSignIn, properties, bookings, payments, makePayment, complaints, raiseComplaint, notifications, markNotificationRead, getNotificationsFor, isTenantProfileApproved, tenantProfiles, updateTenantProfile, submitTenantProfile } = useDemoData();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t && TENANT_DASHBOARD_TAB_IDS.has(t) ? t : "overview";
  });

  const selectTab = useCallback(
    (id: string) => {
      if (!TENANT_DASHBOARD_TAB_IDS.has(id)) return;
      setActiveTab(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TENANT_DASHBOARD_TAB_IDS.has(t)) setActiveTab(t);
  }, [searchParams]);
  const [demoTenant, setDemoTenant] = useState(getDemoUser);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [apiApproved, setApiApproved] = useState<boolean | null>(null);
  const [apiProfile, setApiProfile] = useState<ProfileDTO | null>(null);
  const [apiProfileStatus, setApiProfileStatus] = useState<VerificationStatus>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSubmitDialogOpen, setProfileSubmitDialogOpen] = useState(false);
  const [profileUpdateDialogOpen, setProfileUpdateDialogOpen] = useState(false);
  const [profileSubmitForm, setProfileSubmitForm] = useState({
    fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", idType: "Aadhar", idNumber: "",
    address: "", city: "", district: "", state: "", pinCode: "",
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [pendingBannerDismissed, setPendingBannerDismissed] = useState(false);
  const [rejectedBannerDismissed, setRejectedBannerDismissed] = useState(false);
  const [profile2faEnabled, setProfile2faEnabled] = useState<boolean | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [demoLoginPromptOpen, setDemoLoginPromptOpen] = useState(false);
  /** Custom copy when opening the demo sign-in prompt (e.g. Update profile) */
  const [demoLoginPromptCopy, setDemoLoginPromptCopy] = useState<{ title?: string; message?: string }>({});
  const [profileUpdatedNeedsResubmit, setProfileUpdatedNeedsResubmit] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [verifySuccessDialog, setVerifySuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [verifySubmitDialogOpen, setVerifySubmitDialogOpen] = useState(false);
  const [updateProfileFirstDialogOpen, setUpdateProfileFirstDialogOpen] = useState(false);
  const profileUpdateInitialRef = useRef<string | null>(null);

  const openConfirm = (title: string, description: string, confirmLabel: string, variant: "default" | "destructive", onConfirm: () => void) => {
    setConfirmAction({ open: true, title, description, confirmLabel, variant, onConfirm });
  };
  const runConfirm = () => {
    confirmAction.onConfirm();
    setConfirmAction((p) => ({ ...p, open: false }));
  };

  useEffect(() => subscribeDemoUser(() => setDemoTenant(getDemoUser())), []);

  // Redirect to correct dashboard if user role doesn't match (e.g. owner/broker/admin should not stay on tenant dashboard)
  useEffect(() => {
    if (user && dashboardPath && dashboardPath !== "/dashboard") {
      navigate(dashboardPath, { replace: true });
    }
  }, [user, dashboardPath, navigate]);

  const useRealApi = !demoMode && user;
  useExitDemoOnDashboardAction(demoMode, exitDemoAndSignIn, navigate);
  const profile2faForUi: boolean | null = !useRealApi ? (profile2faEnabled ?? false) : profile2faEnabled;

  const fetchProfileFromDb = () => {
    if (!useRealApi) return;
    setProfileLoading(true);
    setProfileError(null);
    getProfile("ROLE_USER")
      .then((res) => {
        const raw = res as { data?: ProfileDTO; success?: boolean; id?: number; userId?: number; [k: string]: unknown };
        const data = (raw?.data && typeof raw.data === "object" && typeof (raw.data as ProfileDTO).id === "number")
          ? (raw.data as ProfileDTO)
          : (typeof (raw as unknown as ProfileDTO).id === "number" ? (raw as unknown as ProfileDTO) : null);
        if (data) {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
          setApiProfileStatus((data.status as VerificationStatus) ?? null);
          const { countryCode, mobile } = parseMobileValue(data.mobile || "");
          const mobileFormValue = mobile ? `${countryCode}|${mobile}` : "";
          const sc = indianStates.find((s) => s.name === data.state)?.code ?? "";
          const legacyAddr = [data.village, data.postOffice, data.policeStation].filter(Boolean).join(", ");
          setProfileSubmitForm({
            fullName: data.fullName || "", gender: data.gender || "Male", dateOfBirth: data.dateOfBirth || "",
            aadharNumber: data.aadharNumber || "", mobile: mobileFormValue, idType: data.idType || "Aadhar", idNumber: data.idNumber || "",
            address: (data.address && data.address.trim()) || legacyAddr || "", city: data.city || "", district: data.district || "", state: sc, pinCode: data.pinCode || "",
          });
        } else {
          setApiProfile(null);
          setApiApproved(false);
        }
      })
      .catch((err) => {
        const message = err?.message || "";
        const isNotFound = /not found|profile not found|404/i.test(message);
        setApiApproved(false);
        if (isNotFound) {
          setApiProfile(null);
          setProfileError(null);
        } else {
          setProfileError("Could not load profile");
          toastError("Profile load failed", "Please try again later.");
        }
      })
      .finally(() => setProfileLoading(false));
  };

  const reloadProfileDataOnly = () => {
    if (!useRealApi) return;
    getProfile("ROLE_USER")
      .then((res) => {
        const raw = res as { data?: ProfileDTO; success?: boolean; id?: number; userId?: number; [k: string]: unknown };
        const data = (raw?.data && typeof raw.data === "object" && typeof (raw.data as ProfileDTO).id === "number")
          ? (raw.data as ProfileDTO)
          : (typeof (raw as unknown as ProfileDTO).id === "number" ? (raw as unknown as ProfileDTO) : null);
        if (data) {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
          setApiProfileStatus((data.status as VerificationStatus) ?? null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProfileFromDb();
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

  const currentTenant = TENANTS.includes(demoTenant) ? demoTenant : TENANTS[0];
  const displayName = demoMode ? currentTenant : (user?.username ?? currentTenant);
  const demoProfile = tenantProfiles.find((p) => p.tenantUser === currentTenant);

  useEffect(() => {
    if (profileSubmitDialogOpen && demoMode && demoProfile) {
      const { countryCode, mobile } = parseMobileValue(demoProfile.mobile || "");
      const mobileFormValue = mobile ? `${countryCode || "91"}|${mobile}` : "";
      const sc = indianStates.find((s) => s.name === demoProfile.state)?.code ?? "";
      setProfileSubmitForm({
        fullName: demoProfile.name || "",
        gender: demoProfile.gender || "Male",
        dateOfBirth: demoProfile.dob || "",
        aadharNumber: demoProfile.idNumber || "",
        mobile: mobileFormValue,
        idType: demoProfile.idType || "Aadhar",
        idNumber: demoProfile.idNumber || "",
        address: demoProfile.address || "",
        city: demoProfile.city || "",
        district: demoProfile.district || "",
        state: sc,
        pinCode: demoProfile.pincode || "",
      });
    }
  }, [profileSubmitDialogOpen, demoMode, demoProfile]);

  // Populate Update profile dialog with current profile data when it opens; capture initial for change detection
  useEffect(() => {
    if (!profileUpdateDialogOpen) {
      profileUpdateInitialRef.current = null;
      return;
    }
    if (demoMode && demoProfile) {
      const { countryCode, mobile } = parseMobileValue(demoProfile.mobile || "");
      const mobileFormValue = mobile ? `${countryCode || "91"}|${mobile}` : "";
      const sc = indianStates.find((s) => s.name === demoProfile.state)?.code ?? "";
      const newForm = {
        fullName: demoProfile.name || "",
        gender: demoProfile.gender || "Male",
        dateOfBirth: demoProfile.dob || "",
        aadharNumber: demoProfile.idNumber || "",
        mobile: mobileFormValue,
        idType: demoProfile.idType || "Aadhar",
        idNumber: demoProfile.idNumber || "",
        address: demoProfile.address || "",
        city: demoProfile.city || "",
        district: demoProfile.district || "",
        state: sc,
        pinCode: demoProfile.pincode || "",
      };
      setProfileSubmitForm(newForm);
      profileUpdateInitialRef.current = JSON.stringify(newForm);
    } else if (useRealApi && apiProfile) {
      const { countryCode, mobile } = parseMobileValue(apiProfile.mobile || "");
      const mobileFormValue = mobile ? `${countryCode || "91"}|${mobile}` : "";
      const sc = indianStates.find((s) => s.name === apiProfile.state)?.code ?? "";
      const newForm = {
        fullName: apiProfile.fullName || "",
        gender: apiProfile.gender || "Male",
        dateOfBirth: apiProfile.dateOfBirth || "",
        aadharNumber: apiProfile.aadharNumber || "",
        mobile: mobileFormValue,
        idType: apiProfile.idType || "Aadhar",
        idNumber: apiProfile.idNumber || "",
        address:
          (apiProfile.address && apiProfile.address.trim()) ||
          [apiProfile.village, apiProfile.postOffice, apiProfile.policeStation].filter(Boolean).join(", ") ||
          "",
        city: apiProfile.city || "",
        district: apiProfile.district || "",
        state: sc,
        pinCode: apiProfile.pinCode || "",
      };
      setProfileSubmitForm(newForm);
      profileUpdateInitialRef.current = JSON.stringify(newForm);
    } else {
      setProfileSubmitForm((f) => ({ ...f, fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", idType: "Aadhar", idNumber: "", address: "", city: "", district: "", state: "", pinCode: "" }));
      profileUpdateInitialRef.current = null;
    }
  }, [profileUpdateDialogOpen, demoMode, demoProfile, useRealApi, apiProfile]);

  const [complaintDialog, setComplaintDialog] = useState(false);

  // Deep links from the app shell: open Account tab or Complaints + raise dialog, then clear state
  useEffect(() => {
    const state = location.state as { openProfile?: boolean; openComplaint?: boolean } | null;
    if (!state?.openProfile && !state?.openComplaint) return;
    if (state.openComplaint) {
      selectTab("complaints");
      setComplaintDialog(true);
    } else if (state.openProfile) {
      selectTab("profile");
    }
    navigate(".", { replace: true, state: {} });
  }, [location.state, navigate, selectTab]);

  const [complaintForm, setComplaintForm] = useState({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" as ComplaintPriority });
  const [apiComplaints, setApiComplaints] = useState<ComplaintDTO[]>([]);
  const [apiComplaintsLoading, setApiComplaintsLoading] = useState(false);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | "">("");
  const [againstOptions, setAgainstOptions] = useState<{ userId: number; userName: string }[]>([]);
  const [againstOptionsLoading, setAgainstOptionsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", phone: "" });
  const [detailItem, setDetailItem] = useState<{ type: "complaint"; data: ComplaintDTO | Complaint } | null>(null);
  const [complaintMessages, setComplaintMessages] = useState<ComplaintMessageDTO[]>([]);
  const [complaintMessageText, setComplaintMessageText] = useState("");
  const [complaintMessageSending, setComplaintMessageSending] = useState(false);
  const [complaintTypingByUser, setComplaintTypingByUser] = useState<Record<string, boolean>>({});
  const [complaintReadReceiptsByUser, setComplaintReadReceiptsByUser] = useState<Record<string, number>>({});
  const [complaintLiveChatOpen, setComplaintLiveChatOpen] = useState(false);
  const [complaintMessageDeletingId, setComplaintMessageDeletingId] = useState<number | null>(null);
  const [rentalApplications, setRentalApplications] = useState<RentalApplicationDTO[]>([]);
  const [rentalLeases, setRentalLeases] = useState<LeaseDTO[]>([]);
  const [rentalPayments, setRentalPayments] = useState<LeasePaymentDTO[]>([]);
  const [savedProperties, setSavedProperties] = useState<SavedPropertyDTO[]>([]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"ALL" | "RENTED" | "SAVED">("ALL");
  const [propertyInfoDialog, setPropertyInfoDialog] = useState<{
    open: boolean;
    title: string;
    location: string;
    price: number;
    status: string;
    subtitle?: string;
    propertyId?: number;
    leaseId?: number;
    itemType?: "RENTED" | "SAVED";
  }>({ open: false, title: "", location: "", price: 0, status: "", subtitle: "", propertyId: undefined, leaseId: undefined, itemType: undefined });
  const [timelineDialog, setTimelineDialog] = useState<{ open: boolean; applicationId: number | null; events: RentalApplicationTimelineEventDTO[] }>({ open: false, applicationId: null, events: [] });
  const [leaseDashboards, setLeaseDashboards] = useState<Record<number, LeaseDashboardDTO>>({});
  const [rentalsLoading, setRentalsLoading] = useState(false);

  const tenantForData = demoMode ? currentTenant : (user?.username ?? currentTenant);
  const tenantProfileApproved = demoMode ? isTenantProfileApproved(tenantForData) : (apiApproved === true || apiProfile?.status === "APPROVED");
  const decodedToken = getDecodedToken();

  useEffect(() => {
    if (!tenantProfileApproved && !pendingBannerDismissed) {
      const t = setTimeout(() => setPendingBannerDismissed(true), 8000);
      return () => clearTimeout(t);
    }
  }, [tenantProfileApproved, pendingBannerDismissed]);

  const verificationStatus: VerificationStatus = demoMode
    ? (profileUpdatedNeedsResubmit ? null : (tenantProfiles.find((p) => p.tenantUser === tenantForData)?.status ?? null))
    : ((apiProfile?.status as VerificationStatus) ?? apiProfileStatus ?? null);
  const myBookings = bookings.filter(b => b.tenantName === tenantForData);
  const totalBookingCount = useRealApi ? rentalApplications.length : myBookings.length;
  const activeBookingCount = useRealApi
    ? rentalApplications.filter((a) => a.status === "PENDING" || a.status === "APPROVED").length
    : myBookings.filter((b) => b.status === "REQUESTED" || b.status === "APPROVED").length;
  const displayPayments = useRealApi
    ? rentalPayments.map((p) => {
        const lease = rentalLeases.find((l) => l.id === p.leaseId);
        return {
          id: p.id,
          propertyTitle: lease?.propertyTitle ?? `Lease #${p.leaseId}`,
          month: p.periodMonth,
          amount: Number(p.amountDue ?? 0),
          status: p.status,
          paidAt: p.paidAt ?? undefined,
        };
      })
    : [];
  const myComplaintsDemo = complaints.filter(c => c.raisedBy === tenantForData || c.againstUser === tenantForData);
  const myComplaintsAll = useRealApi ? apiComplaints : myComplaintsDemo;
  const myComplaints = complaintStatusFilter ? myComplaintsAll.filter((c) => c.status === complaintStatusFilter) : myComplaintsAll;
  const openComplaintsCount = myComplaintsAll.filter((c) => c.status === "OPEN").length;
  const showComplaintsCount = useRealApi ? (apiComplaintsLoading ? "…" : openComplaintsCount) : openComplaintsCount;
  const myNotifications = demoMode ? [] : getNotificationsFor(tenantForData, "TENANT");

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

  const complaintPropertyOptions = useMemo(() => {
    if (!useRealApi) {
      const demoProps = (demoMode ? properties.filter((p) => p.status === "RENTED" && p.tenantUserName === tenantForData) : properties);
      return demoProps.map((p) => ({ id: p.id, title: p.title, ownerUserName: p.ownerUserName ?? null, ownerId: null as number | null }));
    }
    const uniqueByProperty = new Map<number, { id: number; title: string; ownerUserName: string | null; ownerId: number | null }>();
    for (const lease of rentalLeases) {
      const propertyId = Number(lease.propertyId ?? 0);
      if (!propertyId || uniqueByProperty.has(propertyId)) continue;
      uniqueByProperty.set(propertyId, {
        id: propertyId,
        title: lease.propertyTitle || `Property #${propertyId}`,
        ownerUserName: lease.ownerUserName || null,
        ownerId: typeof lease.ownerId === "number" ? lease.ownerId : null,
      });
    }
    return Array.from(uniqueByProperty.values());
  }, [useRealApi, demoMode, properties, tenantForData, rentalLeases]);

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
    const myName = (user?.username ?? tenantForData).trim().toLowerCase();
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
    const me = (user?.username ?? tenantForData).trim().toLowerCase();
    return Object.entries(complaintTypingByUser)
      .filter(([name, on]) => on && name.trim().toLowerCase() !== me)
      .map(([name]) => name);
  }, [complaintTypingByUser, user?.username, tenantForData]);

  const handleDeleteTenantComplaintMessage = (messageId: number) => {
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

  const handleSendTenantComplaintMessage = () => {
    if (!detailItem || detailItem.type !== "complaint" || !complaintMessageText.trim() || !useRealApi) return;
    const id = (detailItem.data as ComplaintDTO).id;
    const trimmed = complaintMessageText.trim();
    const optimistic: ComplaintMessageDTO = {
      id: null,
      complaintId: id,
      senderId: decodedToken?.userId ?? 0,
      senderUserName: user?.username ?? tenantForData,
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

  useEffect(() => {
    if (!useRealApi || !complaintForm.propertyId) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    const prop = complaintPropertyOptions.find((p) => p.id === complaintForm.propertyId);
    if (!prop?.ownerUserName?.trim()) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    setAgainstOptionsLoading(true);
    const ownerId = prop.ownerId;
    if (typeof ownerId === "number" && ownerId > 0) {
      setAgainstOptions([{ userId: ownerId, userName: prop.ownerUserName }]);
      setComplaintForm((f) => ({ ...f, relatedUserId: ownerId }));
      setAgainstOptionsLoading(false);
      return;
    }
    getUserIdByUsername(prop.ownerUserName)
      .then((id) => {
        if (id != null) {
          setAgainstOptions([{ userId: id, userName: prop.ownerUserName }]);
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
  }, [useRealApi, complaintForm.propertyId, complaintPropertyOptions]);

  useEffect(() => {
    if (!useRealApi || !user) return;
    setRentalsLoading(true);
    Promise.all([getSubmittedRentalApplicationsForCurrentUser(), getActiveLeasesForCurrentUser()])
      .then(async ([appsRes, leasesRes]) => {
        const apps = (appsRes as { data?: RentalApplicationDTO[] }).data;
        const leases = (leasesRes as { data?: LeaseDTO[] }).data;
        const safeApps = Array.isArray(apps) ? apps : [];
        const safeLeases = Array.isArray(leases) ? leases : [];
        setRentalApplications(safeApps);
        setRentalLeases(safeLeases);
        const paymentsNested = await Promise.all(
          safeLeases.map((l) =>
            getLeasePayments(l.id)
              .then((r) => ((r as { data?: LeasePaymentDTO[] }).data ?? []))
              .catch(() => [] as LeasePaymentDTO[])
          )
        );
        setRentalPayments(paymentsNested.flat());
      })
      .catch(() => {
        setRentalApplications([]);
        setRentalLeases([]);
        setRentalPayments([]);
      })
      .finally(() => setRentalsLoading(false));
  }, [useRealApi, user]);

  useEffect(() => {
    if (!useRealApi || !user) return;
    getSavedProperties()
      .then((res) => setSavedProperties(((res as { data?: SavedPropertyDTO[] }).data) ?? []))
      .catch(() => setSavedProperties([]));
  }, [useRealApi, user]);

  useEffect(() => {
    if (!useRealApi || !user) return;
    if (rentalLeases.length === 0) {
      setLeaseDashboards({});
      return;
    }
    Promise.all(
      rentalLeases.map((l) =>
        getLeaseDashboard(l.id)
          .then((res) => ({ id: l.id, data: (res as { data?: LeaseDashboardDTO }).data }))
          .catch(() => ({ id: l.id, data: undefined }))
      )
    ).then((rows) => {
      const map: Record<number, LeaseDashboardDTO> = {};
      for (const r of rows) {
        if (r.data) map[r.id] = r.data;
      }
      setLeaseDashboards(map);
    });
  }, [useRealApi, user, rentalLeases]);

  const handleOpenApplicationTimeline = (applicationId: number) => {
    getRentalApplicationTimeline(applicationId)
      .then((res) => {
        const events = ((res as { data?: RentalApplicationTimelineEventDTO[] }).data) ?? [];
        setTimelineDialog({ open: true, applicationId, events });
      })
      .catch((err) => toastError("Could not load timeline", (err as Error)?.message));
  };
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const myRentedProperties = useRealApi
    ? rentalLeases
    : staticProperties.filter(p => p.tenantUserName === tenantForData);
  const mySavedProperties = useRealApi ? savedProperties : [];
  const myLikedProperties = useRealApi ? savedProperties : [];
  const pendingPayments = displayPayments.filter((p) => p.status !== "PAID");
  const paidPayments = displayPayments.filter((p) => p.status === "PAID");
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaidAmount = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const myPropertyCards = useMemo(() => {
    const rented = (useRealApi ? rentalLeases : []).map((lease) => ({
      key: `rent-${lease.id}`,
      type: "RENTED" as const,
      title: lease.propertyTitle,
      city: "Rented property",
      state: "",
      price: Number(lease.monthlyRent ?? 0),
      status: lease.status,
      statusLabel: lease.status === "ACTIVE" ? "RENTED" : lease.status,
      subtitle: `Lease #${lease.id} • Due day ${lease.dueDayOfMonth}`,
      propertyId: lease.propertyId,
      leaseId: lease.id,
      lease,
    }));
    const saved = mySavedProperties.map((sp) => ({
      key: `save-${sp.id}`,
      type: "SAVED" as const,
      title: sp.propertyTitle,
      city: sp.city,
      state: sp.state,
      price: Number(sp.price ?? 0),
      status: "SAVED",
      statusLabel: "SAVED",
      subtitle: "Saved for quick access",
      propertyId: sp.propertyId,
      leaseId: undefined,
      lease: undefined,
    }));
    const merged = [...rented, ...saved];
    if (propertyTypeFilter === "ALL") return merged;
    return merged.filter((x) => x.type === propertyTypeFilter);
  }, [useRealApi, rentalLeases, mySavedProperties, propertyTypeFilter]);

  const openRentedLeaseDetails = (item: {
    title: string;
    city: string;
    state: string;
    price: number;
    status: string;
    subtitle: string;
    propertyId?: number;
    leaseId?: number;
    lease?: LeaseDTO;
  }) => {
    if (!item.leaseId) return;
    const relatedApplication = rentalApplications.find(
      (a) => a.propertyId === item.propertyId && (a.status === "APPROVED" || a.status === "PENDING"),
    );
    const relatedSaved = mySavedProperties.find((s) => s.propertyId === item.propertyId);
    navigate(`/dashboard/rented/${item.leaseId}`, {
      state: {
        lease: item.lease,
        application: relatedApplication,
        saved: relatedSaved,
      },
    });
  };

  const handleRaiseComplaint = async () => {
    if (useRealApi) {
      if (!complaintForm.subject?.trim() || !complaintForm.description?.trim() || !complaintForm.propertyId) {
        toastError("Missing fields", "Subject, description, and property are required.");
        return;
      }
      try {
        await createComplaint({
          subject: complaintForm.subject.trim(),
          description: complaintForm.description.trim(),
          priority: complaintForm.priority,
          propertyId: complaintForm.propertyId,
          ...(complaintForm.relatedUserId > 0 && { relatedUserId: complaintForm.relatedUserId }),
        });
        toastSuccess("Complaint raised", "Your complaint has been submitted successfully.");
        setComplaintDialog(false);
        setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
        getComplaints().then((res) => {
          const list = (res as { data?: ComplaintDTO[] }).data;
          if (Array.isArray(list)) setApiComplaints(list);
        });
      } catch (err: unknown) {
        toastError("Failed to raise complaint", (err as Error)?.message ?? "Please try again.");
      }
      return;
    }
    if (!complaintForm.subject?.trim() || !complaintForm.propertyId) return;
    const prop = properties.find(p => p.id === complaintForm.propertyId);
    raiseComplaint({ title: complaintForm.subject, description: complaintForm.description, raisedBy: tenantForData, raisedByRole: "TENANT", againstUser: "", againstRole: "OWNER", propertyId: complaintForm.propertyId, propertyTitle: prop?.title || "", priority: complaintForm.priority as Complaint["priority"] });
    toastSuccess("Complaint raised");
    setComplaintDialog(false);
    setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
  };

  const handleMakePayment = (id: number) => {
    if (demoMode) return;
    makePayment(id);
    toastSuccess("Payment successful", "Rent paid successfully");
  };

  const openProfileUpdateDialog = useCallback(() => {
    if (demoMode) {
      setDemoLoginPromptCopy({
        title: "Sign in to update your profile",
        message: "Profile changes require a real account. Sign in to continue, or cancel to keep browsing the demo.",
      });
      setDemoLoginPromptOpen(true);
      return;
    }
    if (demoProfile) {
      const { countryCode, mobile } = parseMobileValue(demoProfile.mobile || "");
      const sc = indianStates.find((s) => s.name === demoProfile.state)?.code ?? "";
      setProfileSubmitForm({
        fullName: demoProfile.name || "", gender: demoProfile.gender || "Male", dateOfBirth: demoProfile.dob || "", aadharNumber: demoProfile.idNumber || "",
        mobile: mobile ? `${countryCode || "91"}|${mobile}` : "", idType: demoProfile.idType || "Aadhar", idNumber: demoProfile.idNumber || "",
        address: demoProfile.address || "", city: demoProfile.city || "", district: demoProfile.district || "",
        state: sc, pinCode: demoProfile.pincode || "",
      });
    } else if (apiProfile) {
      const { countryCode, mobile } = parseMobileValue(apiProfile.mobile || "");
      const sc = indianStates.find((s) => s.name === apiProfile.state)?.code ?? "";
      const legacyAddr = [apiProfile.village, apiProfile.postOffice, apiProfile.policeStation].filter(Boolean).join(", ");
      setProfileSubmitForm({
        fullName: apiProfile.fullName || "", gender: apiProfile.gender || "Male", dateOfBirth: apiProfile.dateOfBirth || "", aadharNumber: apiProfile.aadharNumber || "",
        mobile: mobile ? `${countryCode || "91"}|${mobile}` : "", idType: apiProfile.idType || "Aadhar", idNumber: apiProfile.idNumber || "",
        address: (apiProfile.address && apiProfile.address.trim()) || legacyAddr || "", city: apiProfile.city || "", district: apiProfile.district || "",
        state: sc, pinCode: apiProfile.pinCode || "",
      });
    }
    setProfileUpdateDialogOpen(true);
  }, [demoMode, demoProfile, apiProfile]);

  const handleSaveDemoProfile = () => {
    if (!profileForm.email?.trim()) {
      toastError("Email required");
      return;
    }
    toastSuccess("Profile updated", "Your changes have been saved.");
    setProfileDialogOpen(false);
  };

  const getMobileForApi = () => {
    const { countryCode, mobile } = parseMobileValue(profileSubmitForm.mobile);
    return formatMobileForApi(countryCode, mobile);
  };

  const handleUpdateProfileClick = () => {
    if (!hasProfileUpdateFormChanged()) {
      toastError("No changes", "Update at least one field before saving.");
      return;
    }
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = indianStates.find((s) => s.code === f.state)?.name ?? f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !stateName?.trim()) {
      toastError("Missing fields", "Fill all mandatory fields (name, DOB, mobile, state).");
      return;
    }
    if (!isProfileLocationComplete(f)) {
      toastError("Missing address", "State, city, district, pin code, and village/street/house are required.");
      return;
    }
    if (aadharVal.length !== 12) {
      toastError("Aadhar required", "Aadhar number must be 12 digits.");
      return;
    }
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
      return;
    }
    openConfirm("Update profile?", "Your profile details will be saved. Click the Verify badge to submit for review.", "Save", "default", () => handleUpdateProfile());
  };

  const handleUpdateProfile = () => {
    if (!hasProfileUpdateFormChanged()) {
      toastError("No changes", "Update at least one field before saving.");
      return;
    }
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = indianStates.find((s) => s.code === f.state)?.name ?? f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !stateName?.trim()) {
      toastError("Missing fields", "Fill all mandatory fields (name, DOB, mobile, state).");
      return;
    }
    if (!isProfileLocationComplete(f)) {
      toastError("Missing address", "State, city, district, pin code, and village/street/house are required.");
      return;
    }
    if (aadharVal.length !== 12) {
      toastError("Aadhar required", "Aadhar number must be 12 digits.");
      return;
    }
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
      return;
    }
    if (demoMode) {
      updateTenantProfile({
        tenantUser: currentTenant,
        name: f.fullName.trim(),
        gender: f.gender,
        dob: f.dateOfBirth,
        email: demoProfile?.email ?? `${currentTenant.replace(/_tenant$/, "")}@gmail.com`,
        mobile: mobileStr,
        idType: f.idType || "Aadhar",
        idNumber: aadharVal || f.idNumber || "",
        address: (f.address || "").trim(),
        city: f.city.trim(),
        district: f.district.trim(),
        state: stateName.trim(),
        pincode: f.pinCode.trim(),
      });
      toastSuccess("Profile updated", "Your changes have been saved. Click Verify to submit for review.");
      setProfileUpdateDialogOpen(false);
      setProfileUpdatedNeedsResubmit(true);
      return;
    }
    setUpdatingProfile(true);
    updateProfile({
      role: "ROLE_USER",
      fullName: f.fullName.trim(),
      gender: f.gender,
      dateOfBirth: f.dateOfBirth,
      aadharNumber: aadharVal || null,
      mobile: mobileStr,
      firmName: null,
      licenseNumber: null,
      idType: f.idType || null,
      idNumber: aadharVal || null,
      address: (f.address || "").trim(),
      city: f.city.trim(),
      district: f.district.trim(),
      state: stateName.trim(),
      pinCode: f.pinCode.trim(),
      village: null,
      postOffice: null,
      policeStation: null,
    })
      .then((res) => {
        const raw = res as { data?: ProfileDTO; success?: boolean; message?: string; timestamp?: string };
        const data = raw?.data && typeof raw.data === "object" && typeof (raw.data as ProfileDTO).id === "number"
          ? (raw.data as ProfileDTO)
          : null;
        if (data) {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
          setApiProfileStatus((data.status as VerificationStatus) ?? null);
          setProfileError(null);
          const { countryCode, mobile } = parseMobileValue(data.mobile || "");
          const mobileFormValue = mobile ? `${countryCode}|${mobile}` : "";
          const sc = indianStates.find((s) => s.name === data.state)?.code ?? "";
          const legacyAddr = [data.village, data.postOffice, data.policeStation].filter(Boolean).join(", ");
          setProfileSubmitForm({
            fullName: data.fullName || "", gender: data.gender || "Male", dateOfBirth: data.dateOfBirth || "",
            aadharNumber: data.aadharNumber || "", mobile: mobileFormValue, idType: data.idType || "Aadhar", idNumber: data.idNumber || "",
            address: (data.address && data.address.trim()) || legacyAddr || "", city: data.city || "", district: data.district || "", state: sc, pinCode: data.pinCode || "",
          });
        }
        toastSuccess("Profile updated", "Your profile has been updated. Click Verify to submit for review.");
        setProfileUpdateDialogOpen(false);
        setProfileUpdatedNeedsResubmit(true);
        fetchProfileFromDb();
      })
      .catch((err) => toastError("Update failed", err?.message))
      .finally(() => setUpdatingProfile(false));
  };

  const handleSubmitProfileForReview = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = indianStates.find((s) => s.code === f.state)?.name ?? f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !stateName?.trim()) {
      toastError("Missing fields", "Fill all mandatory fields (name, DOB, mobile, state).");
      return;
    }
    if (!isProfileLocationComplete(f)) {
      toastError("Missing address", "State, city, district, pin code, and village/street/house are required.");
      return;
    }
    if (aadharVal.length !== 12) {
      toastError("Aadhar required", "Aadhar number must be 12 digits.");
      return;
    }
    if (!isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
      return;
    }
    if (demoMode) {
      submitTenantProfile({
        tenantUser: currentTenant,
        name: f.fullName.trim(),
        gender: f.gender,
        dob: f.dateOfBirth,
        email: demoProfile?.email ?? `${currentTenant.replace(/_tenant$/, "")}@gmail.com`,
        mobile: mobileStr,
        idType: f.idType || "Aadhar",
        idNumber: aadharVal || f.idNumber || "",
        address: (f.address || "").trim(),
        city: f.city.trim(),
        district: f.district.trim(),
        state: stateName.trim(),
        pincode: f.pinCode.trim(),
      });
      setProfileSubmitDialogOpen(false);
      setProfileUpdatedNeedsResubmit(false);
      setVerifySuccessDialog({ open: true, message: "Your profile has been submitted for admin review." });
      return;
    }
    setSubmittingProfile(true);
    return submitProfileForReview("ROLE_USER", {
      role: "ROLE_USER",
      fullName: f.fullName.trim(),
      gender: f.gender,
      dateOfBirth: f.dateOfBirth,
      aadharNumber: aadharVal || null,
      mobile: mobileStr,
      firmName: null,
      licenseNumber: null,
      idType: f.idType || null,
      idNumber: f.idNumber || null,
      address: (f.address || "").trim(),
      city: f.city.trim(),
      district: f.district.trim(),
      state: stateName.trim(),
      pinCode: f.pinCode.trim(),
      village: null,
      postOffice: null,
      policeStation: null,
    })
      .then((res) => {
        const raw = res as { data?: ProfileDTO; message?: string };
        const data = raw?.data;
        const message = raw?.message ?? "Profile submitted for review";
        if (data) {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
          setApiProfileStatus((data.status as VerificationStatus) ?? null);
        }
        setProfileSubmitDialogOpen(false);
        setProfileUpdatedNeedsResubmit(false);
        setVerifySuccessDialog({ open: true, message });
        fetchProfileFromDb();
      })
      .catch((err) => toastError("Submission failed", err?.message))
      .finally(() => setSubmittingProfile(false));
  };

  const isProfileUpdateFormValid = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = indianStates.find((s) => s.code === f.state)?.name ?? f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !stateName?.trim()) return false;
    if (!isProfileLocationComplete(f)) return false;
    if (aadharVal.length !== 12) return false;
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) return false;
    return true;
  };
  const hasProfileUpdateFormChanged = () => {
    if (!profileUpdateInitialRef.current) return false;
    return JSON.stringify(profileSubmitForm) !== profileUpdateInitialRef.current;
  };
  const canSaveProfileUpdate = profileUpdateDialogOpen && isProfileUpdateFormValid() && hasProfileUpdateFormChanged();

  const handleVerifyClick = () => {
    if (demoMode) {
      setDemoLoginPromptOpen(true);
      return;
    }
    if (!useRealApi) return;
    if (!apiProfile) {
      setUpdateProfileFirstDialogOpen(true);
      return;
    }
    const { countryCode, mobile } = parseMobileValue(apiProfile.mobile || "");
    const sc = indianStates.find((s) => s.name === apiProfile.state)?.code ?? "";
    setProfileSubmitForm({
      fullName: apiProfile.fullName || "",
      gender: apiProfile.gender || "Male",
      dateOfBirth: apiProfile.dateOfBirth || "",
      aadharNumber: apiProfile.aadharNumber || "",
      mobile: mobile ? `${countryCode || "91"}|${mobile}` : "",
      idType: apiProfile.idType || "Aadhar",
      idNumber: apiProfile.idNumber || "",
      address:
        (apiProfile.address && apiProfile.address.trim()) ||
        [apiProfile.village, apiProfile.postOffice, apiProfile.policeStation].filter(Boolean).join(", ") ||
        "",
      city: apiProfile.city || "",
      district: apiProfile.district || "",
      state: sc,
      pinCode: apiProfile.pinCode || "",
    });
    setVerifySubmitDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      <div className="container mx-auto px-3 sm:px-4 py-4 md:py-8">
        {demoMode && (
          <div data-demo-allow className="mb-4 p-3 bg-accent/50 border border-accent rounded-xl flex items-center gap-2 text-sm text-accent-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span><strong>Demo Mode</strong> — Viewing as <strong>{currentTenant}</strong></span>
          </div>
        )}
        {!demoMode && verificationStatus === "REJECTED" && !rejectedBannerDismissed && (
          <div className="mb-4 py-2 px-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center justify-between gap-2 text-sm text-red-800 dark:text-red-200 flex-wrap">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Profile rejected. Update and resubmit for verification.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="border-red-400 text-red-800 dark:text-red-200 h-8 shrink-0" asChild>
                <Link to="/dashboard?tab=profile">Account</Link>
              </Button>
              <Button size="sm" variant="ghost" className="text-red-700 dark:text-red-300 h-8 w-8 p-0 shrink-0" onClick={() => setRejectedBannerDismissed(true)} aria-label="Dismiss banner">
                ×
              </Button>
            </div>
          </div>
        )}
        {!tenantProfileApproved && verificationStatus !== "REJECTED" && !pendingBannerDismissed && (
          <div className="mb-4 py-2 px-3 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center justify-between gap-2 text-sm text-amber-900 dark:text-amber-200 flex-wrap">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Profile pending approval.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="border-amber-600 text-amber-800 dark:text-amber-200 h-8" asChild>
                <Link to="/dashboard?tab=profile">Account</Link>
              </Button>
              <Button size="sm" variant="ghost" className="text-amber-800 dark:text-amber-200 h-8 px-2" onClick={() => setPendingBannerDismissed(true)} aria-label="Dismiss">
                ×
              </Button>
            </div>
          </div>
        )}

        <h1 className="sr-only">Tenant dashboard</h1>

        <DashboardNavShell
          accent="sky"
          dataDemoAllow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={selectTab}
          user={{
            displayName,
            subtitle:
              decodedToken?.email ??
              (useRealApi && apiProfile?.email ? apiProfile.email : undefined) ??
              (demoMode ? demoProfile?.email ?? `${currentTenant.replace(/_tenant$/, "")}@gmail.com` : undefined),
            roleLabel: "Tenant",
            avatarUrl:
              useRealApi && apiProfile?.profilePictureUrl ? resolveApiMediaUrl(apiProfile.profilePictureUrl) : undefined,
            fallbackIcon: User,
            headerExtra:
              verificationStatus === "IN_PROGRESS" ? undefined : (
                <VerificationBadge
                  status={verificationStatus}
                  showIcon
                  className="text-[10px]"
                  approvedAsActiveStyle
                  needsResubmit={profileUpdatedNeedsResubmit}
                  onVerifyClick={handleVerifyClick}
                />
              ),
          }}
          renderTabBadge={(id) =>
            id === "notifications" && unreadCount > 0 ? (
              <span className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full px-1.5 py-0.5 font-medium tabular-nums">
                {unreadCount}
              </span>
            ) : null
          }
        >
            {activeTab === "overview" && (
              <>
                <div data-demo-allow className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  {[
                    { icon: Heart, label: "My properties", value: myRentedProperties.length, sub: null, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", tab: "my-properties" },
                    { icon: CalendarDays, label: "Bookings", value: totalBookingCount, sub: activeBookingCount > 0 ? `${activeBookingCount} active` : null, iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400", tab: "bookings" },
                    { icon: CreditCard, label: "Payments", value: displayPayments.length, sub: displayPayments.filter(p => p.status !== "PAID").length > 0 ? `${displayPayments.filter(p => p.status !== "PAID").length} pending` : null, iconBg: "bg-sky-100 dark:bg-sky-900/40", iconColor: "text-sky-600 dark:text-sky-400", tab: "payments" },
                    { icon: FileText, label: "Complaints", value: useRealApi && apiComplaintsLoading ? "…" : myComplaintsAll.length, sub: openComplaintsCount > 0 ? `${openComplaintsCount} open` : null, iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400", tab: "complaints" },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.label}
                      onClick={() => selectTab(s.tab)}
                      className="group min-h-[7.5rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-3 sm:p-4 text-left shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 transition-all duration-200 hover:shadow-lg hover:border-sky-300/60 dark:hover:border-sky-500/40 hover:bg-sky-50/40 dark:hover:bg-sky-900/20 active:scale-[0.99] md:min-h-0"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
                          <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground break-words leading-tight">{s.value}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{s.label}</p>
                      {s.sub ? <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-snug line-clamp-2">{s.sub}</p> : null}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === "my-properties" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-bold text-foreground">My properties</h2>
                          <p className="text-xs text-muted-foreground">Tap a card for details.</p>
                        </div>
                      </div>
                      <Link to="/properties" className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-4 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                        <CheckCircle className="h-3.5 w-3.5" /> Browse listings
                      </Link>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Select value={propertyTypeFilter} onValueChange={(v) => setPropertyTypeFilter(v as "ALL" | "RENTED" | "SAVED")}>
                        <SelectTrigger className="h-11 w-full sm:h-9 sm:w-[140px] sm:max-w-[140px] text-sm bg-background">
                          <SelectValue placeholder="Filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All ({(useRealApi ? rentalLeases.length : myRentedProperties.length) + mySavedProperties.length})</SelectItem>
                          <SelectItem value="RENTED">Rented ({useRealApi ? rentalLeases.length : myRentedProperties.length})</SelectItem>
                          <SelectItem value="SAVED">Saved ({mySavedProperties.length})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {myPropertyCards.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No properties match the selected filter</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Try changing the filter or save/apply for properties.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myPropertyCards.map((item) => (
                      <div
                        key={item.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (item.type === "RENTED") {
                            openRentedLeaseDetails(item);
                            return;
                          }
                          setPropertyInfoDialog({
                            open: true,
                            title: item.title,
                            location: item.state ? `${item.city}, ${item.state}` : item.city,
                            price: item.price,
                            status: item.status,
                            subtitle: item.subtitle,
                            propertyId: item.propertyId,
                            leaseId: item.leaseId,
                            itemType: item.type,
                          });
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (item.type === "RENTED") { openRentedLeaseDetails(item); return; } setPropertyInfoDialog({ open: true, title: item.title, location: item.state ? `${item.city}, ${item.state}` : item.city, price: item.price, status: item.status, subtitle: item.subtitle, propertyId: item.propertyId, leaseId: item.leaseId, itemType: item.type }); } }}
                        className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 transition-all active:scale-[0.995]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.state ? `${item.city}, ${item.state}` : item.city} • ₹{Number(item.price ?? 0).toLocaleString()}/mo</p>
                          </div>
                          {item.status === "SAVED" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Saved</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              <CheckCircle className="h-3.5 w-3.5" /> {item.statusLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (item.type === "RENTED") { openRentedLeaseDetails(item); return; } setPropertyInfoDialog({ open: true, title: item.title, location: item.state ? `${item.city}, ${item.state}` : item.city, price: item.price, status: item.status, subtitle: item.subtitle, propertyId: item.propertyId, leaseId: item.leaseId, itemType: item.type }); }}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> {item.type === "RENTED" ? "Open rented details" : "Details"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Submitted Rent Applications</p>
                    <Badge variant="secondary">{rentalApplications.length}</Badge>
                  </div>
                  {rentalApplications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No submitted applications yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {rentalApplications.slice(0, 6).map((a) => (
                        <div key={a.id} className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-card-foreground truncate">{a.propertyTitle}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Owner: {a.ownerUserName} • Move-in: {new Date(a.moveInDate).toLocaleDateString()}</p>
                              <p className="text-xs text-muted-foreground">Proposed rent: ₹{Number(a.proposedRent ?? 0).toLocaleString()} for {a.leaseMonths} months</p>
                            </div>
                            {a.status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="h-3.5 w-3.5" /> RENTED
                              </span>
                            ) : (
                              <Badge variant={a.status === "PENDING" ? "secondary" : "destructive"} className="shrink-0">
                                {a.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-bold text-foreground">{useRealApi ? "My bookings" : "Property visit requests"}</h2>
                          <p className="text-xs text-muted-foreground">
                            {useRealApi ? "Rental applications and their status." : "Visits you’ve requested — open a card for details."}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/properties"
                        className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-transparent text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-4 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-0 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" /> {useRealApi ? "Rent a property" : "Book a visit"}
                      </Link>
                    </div>
                  </div>
                </div>

                {useRealApi ? (
                  rentalsLoading ? (
                    <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-500/30 border-t-amber-600 dark:border-t-amber-400 animate-spin" aria-hidden />
                      <p className="text-sm font-medium text-foreground">Loading your bookings</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">This usually takes just a moment.</p>
                    </div>
                  ) : rentalApplications.length === 0 ? (
                    <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                      <CalendarDays className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No rental applications yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Open any property and submit an application — it will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rentalApplications.map((a) => (
                        <div
                          key={a.id}
                          className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-card-foreground truncate">{a.propertyTitle}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                Owner: {a.ownerUserName} • Move-in: {new Date(a.moveInDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                ₹{Number(a.proposedRent ?? 0).toLocaleString()}/mo • {a.leaseMonths} months
                              </p>
                            </div>
                            <Badge variant={a.status === "APPROVED" ? "default" : a.status === "PENDING" ? "secondary" : "destructive"} className="shrink-0">
                              {a.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleOpenApplicationTimeline(a.id)}>
                              View timeline
                            </Button>
                            {a.status === "PENDING" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                  cancelRentalApplication(a.id)
                                    .then(() => getSubmittedRentalApplicationsForCurrentUser())
                                    .then((r) => setRentalApplications(((r as { data?: RentalApplicationDTO[] }).data) ?? []))
                                    .catch((err) => toastError("Failed to cancel", (err as Error)?.message));
                                }}
                              >
                                Cancel request
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : myBookings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No visit requests yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Use Book a visit above, then pick a slot on the property page.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground truncate">{b.propertyTitle}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">Owner: {b.ownerName}</p>
                          </div>
                          <Badge variant={b.status === "APPROVED" ? "default" : b.status === "REQUESTED" ? "secondary" : b.status === "COMPLETED" ? "outline" : "destructive"} className="shrink-0">
                            {b.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            {new Date(b.visitDate).toLocaleDateString()}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {b.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-foreground">Payment history</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Rent and other payments you&apos;ve made.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">Total records</p>
                    <p className="text-lg font-bold text-foreground">{displayPayments.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">Pending amount</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{totalPendingAmount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">Paid amount</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{totalPaidAmount.toLocaleString()}</p>
                  </div>
                </div>
                {useRealApi && rentalLeases.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rentalLeases.slice(0, 4).map((lease) => {
                      const dash = leaseDashboards[lease.id];
                      return (
                        <div key={lease.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-3">
                          <p className="text-sm font-semibold text-foreground truncate">{lease.propertyTitle}</p>
                          <p className="text-[11px] text-muted-foreground">Lease #{lease.id}</p>
                          <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                            <p>Next due: {dash?.nextDueDate ? new Date(dash.nextDueDate).toLocaleDateString() : "—"}</p>
                            <p>Next due amount: ₹{Number(dash?.nextDueAmount ?? 0).toLocaleString()}</p>
                            <p>Overdue: ₹{Number(dash?.overdueAmount ?? 0).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {displayPayments.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No payments yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Your rent and other payment history will appear here once you have active bookings.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Pending Payments</h3>
                        <Badge variant="secondary">{pendingPayments.length}</Badge>
                      </div>
                      {pendingPayments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No pending payments.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingPayments.map((p) => (
                            <div key={`pending-${p.id}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-card-foreground truncate">{p.propertyTitle}</p>
                                  <p className="text-xs text-muted-foreground">{p.month}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-foreground">₹{p.amount.toLocaleString()}</p>
                                  <Badge variant={p.status === "OVERDUE" ? "destructive" : "secondary"} className="text-[10px] mt-0.5">{p.status}</Badge>
                                </div>
                              </div>
                              <Button size="sm" className="mt-2 h-11 w-full sm:h-9" onClick={() => handleMakePayment(p.id)}>
                                <IndianRupee className="h-3 w-3 mr-1" /> Pay Now
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Paid Payments</h3>
                        <Badge variant="secondary">{paidPayments.length}</Badge>
                      </div>
                      {paidPayments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No paid payments yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {paidPayments.map((p) => (
                            <div key={`paid-${p.id}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-card-foreground truncate">{p.propertyTitle}</p>
                                  <p className="text-xs text-muted-foreground">{p.month}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-foreground">₹{p.amount.toLocaleString()}</p>
                                  <Badge variant="default" className="text-[10px] mt-0.5">PAID</Badge>
                                </div>
                              </div>
                              {p.paidAt && <p className="text-[10px] text-muted-foreground mt-1.5">Paid on {new Date(p.paidAt).toLocaleDateString()}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "complaints" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-3 sm:p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-foreground">My complaints</h2>
                        <p className="text-xs text-muted-foreground">Open a complaint for details, then use live chat when you&apos;re ready.</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 w-full shrink-0 rounded-full border-emerald-500/50 bg-transparent px-4 text-sm font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300 sm:order-2 sm:h-9 sm:w-auto sm:min-w-[11rem]"
                        onClick={() => setComplaintDialog(true)}
                        disabled={apiComplaintsLoading && Boolean(useRealApi)}
                      >
                        <Plus className="h-4 w-4" />
                        Raise complaint
                      </Button>
                      <StatusFilterDropdown
                        value={complaintStatusFilter}
                        onChange={setComplaintStatusFilter}
                        className="h-11 w-full text-sm bg-background sm:order-1 sm:h-9 sm:w-[140px] sm:max-w-[140px]"
                      />
                    </div>
                  </div>
                </div>
                {useRealApi && apiComplaintsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading complaints…</div>
                ) : myComplaints.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No complaints{complaintStatusFilter ? ` with this status` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{complaintStatusFilter ? "Try changing the filter or raise a new complaint." : "You have not raised any complaints yet. Use Raise complaint at the top of this section when you need to."}</p>
                  </div>
                ) : detailItem?.type === "complaint" && detailItem.data && "id" in detailItem.data ? (
                (() => {
                  const c = detailItem.data as ComplaintDTO & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string; adminNote?: string };
                  const pid = c.propertyId;
                  const propertyTitle =
                    (pid && complaintPropertyOptions.find((p) => p.id === pid)?.title) ?? c.propertyTitle ?? (pid ? `Property #${pid}` : "—");
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
                          currentUserName={user?.username ?? tenantForData}
                          currentUserId={decodedToken?.userId ?? null}
                          useRealApi={Boolean(useRealApi)}
                          complaintIdForChat={complaintSocketComplaintId}
                          messages={complaintMessages}
                          readReceiptsByUser={complaintReadReceiptsByUser}
                          typingUserNames={complaintTypingNames}
                          messageText={complaintMessageText}
                          onMessageTextChange={setComplaintMessageText}
                          onSend={handleSendTenantComplaintMessage}
                          sending={complaintMessageSending}
                          liveChatOpen={complaintLiveChatOpen}
                          onOpenLiveChat={() => setComplaintLiveChatOpen(true)}
                          onCloseLiveChat={() => setComplaintLiveChatOpen(false)}
                          onDeleteMessage={handleDeleteTenantComplaintMessage}
                          deletingMessageId={complaintMessageDeletingId}
                          actionsSlot={
                            useRealApi ? (
                              <div className="rounded-lg border border-slate-200 bg-muted/20 p-4 space-y-3 dark:border-slate-700">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</p>
                                <div className="flex flex-wrap items-center gap-2 w-full">
                                  <div
                                    className="flex h-8 min-w-[168px] flex-row items-center gap-2 rounded-md border border-violet-500/50 bg-transparent px-2.5 text-xs text-violet-600 dark:text-violet-400"
                                    title="Status is updated by the owner or admin"
                                  >
                                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    <span className="truncate font-medium">{c.status}</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Message below; the owner or admin updates status when resolving.
                                </p>
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
                      const ext = c as ComplaintDTO & Complaint & { title?: string; raisedBy?: string; againstUser?: string; propertyTitle?: string };
                      const subject = ext.subject ?? ext.title ?? "";
                      const raisedBy = ext.raisedByUserName ?? ext.raisedBy ?? "";
                      const related = ext.relatedUserName ?? ext.againstUser ?? "";
                      const propLabel = ext.propertyId
                        ? (ext.propertyTitle ?? (useRealApi ? complaintPropertyOptions.find((p) => p.id === ext.propertyId)?.title : undefined) ?? `Property #${ext.propertyId}`)
                        : (ext.propertyTitle ?? "");
                      const statusCls =
                        ext.status === "OPEN"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300"
                          : ext.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300"
                            : ext.status === "RESOLVED" || ext.status === "CLOSED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300"
                              : "bg-muted text-muted-foreground";
                      const priorityCls =
                        ext.priority === "HIGH"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300"
                          : ext.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200 border-slate-300";
                      return (
                        <div
                          key={ext.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailItem({ type: "complaint", data: c })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDetailItem({ type: "complaint", data: c });
                            }
                          }}
                          className={cn(
                            "bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:shadow-md transition-all cursor-pointer active:scale-[0.995]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-card-foreground truncate">{subject}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {raisedBy} → {related} • {propLabel}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Badge variant="outline" className={`text-[10px] border ${priorityCls}`}>
                                {ext.priority}
                              </Badge>
                              {ext.status === "RESOLVED" || ext.status === "CLOSED" ? (
                                <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle className="h-3.5 w-3.5" /> {ext.status}
                                </span>
                              ) : ext.status === "OPEN" ? (
                                <span className="inline-flex items-center gap-1 rounded-md border-2 border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                                  {ext.status}
                                </span>
                              ) : ext.status === "IN_PROGRESS" ? (
                                <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                  <Clock className="h-3.5 w-3.5" /> In progress
                                </span>
                              ) : (
                                <Badge variant="outline" className={`text-[10px] border ${statusCls}`}>
                                  {ext.status}
                                </Badge>
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

            {activeTab === "notifications" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-3 sm:p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-foreground">Alerts</h2>
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

            {activeTab === "profile" && (
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 overflow-hidden">
                {/* Header with subtle gradient */}
                <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-900/50 dark:to-sky-950/20 px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">My Profile</h2>
                    <div className="flex flex-wrap items-center gap-1.5 [&>button]:h-7 [&>button]:min-h-7 [&>button]:w-max [&>button]:min-w-0 [&>button]:max-w-none [&>button]:justify-center [&>button]:px-2 [&>span]:inline-flex [&>span]:h-7 [&>span]:min-h-7 [&>span]:w-max [&>span]:min-w-0 [&>span]:max-w-none [&>span]:justify-center [&>span]:px-2">
                      <VerificationBadge status={verificationStatus} showIcon className="!text-[11px] !px-2 !gap-1" approvedAsActiveStyle needsResubmit={profileUpdatedNeedsResubmit} onVerifyClick={handleVerifyClick} />
                      <TwoFactorBadge enabled={profile2faForUi} className="!text-[11px] !px-2 !gap-1" onEnableClick={(profile2faForUi === false) ? (demoMode ? () => { setDemoLoginPromptCopy({}); setDemoLoginPromptOpen(true); } : () => setTwoFactorDialogOpen(true)) : undefined} />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                {profileLoading && useRealApi ? (
                  <div className="py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-3" />
                    <p className="text-sm text-muted-foreground">Loading profile…</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <ProfilePhotoSection
                      userId={decodedToken?.userId ?? apiProfile?.userId ?? null}
                      profilePictureUrl={useRealApi ? apiProfile?.profilePictureUrl : null}
                      displayName={useRealApi ? apiProfile?.fullName : demoProfile?.name}
                      username={useRealApi ? apiProfile?.userName : currentTenant}
                      demoMode={demoMode}
                      onDemoAction={() => {
                        setDemoLoginPromptCopy({
                          title: "Sign in to change your photo",
                          message: "Profile photo uploads require a real account. Sign in to continue, or cancel to keep browsing the demo.",
                        });
                        setDemoLoginPromptOpen(true);
                      }}
                      editable={useRealApi || demoMode}
                      onMetaUpdated={reloadProfileDataOnly}
                      onUpdateProfile={useRealApi || demoMode ? openProfileUpdateDialog : undefined}
                      updateProfileDisabled={useRealApi && profileLoading}
                    />
                    {/* Account info */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Account
                      </h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card overflow-hidden shadow-sm">
                        <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                          <div className="grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:items-baseline">
                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Username</dt>
                            <dd className="text-sm font-semibold text-foreground tabular-nums break-all">
                              {decodedToken?.sub ?? (useRealApi && apiProfile ? apiProfile.userName : displayName)}
                            </dd>
                          </div>
                          <div className="grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:items-baseline">
                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</dt>
                            <dd className="text-sm font-semibold text-foreground break-all">
                              {decodedToken?.email ?? (useRealApi && apiProfile ? (apiProfile.email ?? apiProfile.userName) : (demoMode ? (demoProfile?.email ?? `${currentTenant.replace(/_tenant$/, "")}@gmail.com`) : (user?.username ?? "")))}
                            </dd>
                          </div>
                          <div className="grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:items-center">
                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</dt>
                            <dd>
                              <Badge variant="secondary" className="font-medium">Tenant</Badge>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Personal details – from apiProfile (real API) or demoProfile (demo context) – structured like popup */}
                    {(useRealApi || demoMode) && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Personal details
                        </h3>
                        {(useRealApi && apiProfile) ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full name</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.fullName || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.gender || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date of birth</p>
                                <p className="text-sm font-medium text-foreground">{formatDob(apiProfile.dateOfBirth)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aadhar number</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.aadharNumber || apiProfile.idNumber || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mobile</p>
                                <p className="text-sm font-medium text-foreground">{formatMobileDisplay(apiProfile.mobile)}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Address details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">State</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.state || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">District / City</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.city || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pin code</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.pinCode || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                  <p className="text-sm font-medium text-foreground">{apiProfile.address || "—"}</p>
                                </div>
                              </div>
                            </div>
                            {(apiProfile.submittedAt || apiProfile.reviewedAt) && (
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                {apiProfile.submittedAt && <span>Submitted: {new Date(apiProfile.submittedAt).toLocaleString()}</span>}
                                {apiProfile.reviewedAt && <span>Reviewed: {new Date(apiProfile.reviewedAt).toLocaleString()}</span>}
                              </div>
                            )}
                            {apiProfile.status === "REJECTED" && apiProfile.adminNote && (
                              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide mb-1">Admin note</p>
                                <p className="text-sm text-foreground">{apiProfile.adminNote}</p>
                              </div>
                            )}
                          </div>
                        ) : (demoMode && demoProfile) ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full name</p>
                                <p className="text-sm font-medium text-foreground">{demoProfile.name || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                                <p className="text-sm font-medium text-foreground">{demoProfile.gender || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date of birth</p>
                                <p className="text-sm font-medium text-foreground">{formatDob(demoProfile.dob)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aadhar number</p>
                                <p className="text-sm font-medium text-foreground">{demoProfile.idNumber || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mobile</p>
                                <p className="text-sm font-medium text-foreground">{formatMobileDisplay(demoProfile.mobile)}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Address details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">State</p>
                                  <p className="text-sm font-medium text-foreground">{demoProfile.state || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">District / City</p>
                                  <p className="text-sm font-medium text-foreground">{demoProfile.city || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pin code</p>
                                  <p className="text-sm font-medium text-foreground">{demoProfile.pincode || "—"}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                  <p className="text-sm font-medium text-foreground">{demoProfile.address ? `${demoProfile.address}, ${demoProfile.city}, ${demoProfile.state} – ${demoProfile.pincode}` : "—"}</p>
                                </div>
                              </div>
                            </div>
                            {(demoProfile.submittedAt || demoProfile.reviewedAt) && (
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                {demoProfile.submittedAt && <span>Submitted: {new Date(demoProfile.submittedAt).toLocaleString()}</span>}
                                {demoProfile.reviewedAt && <span>Reviewed: {new Date(demoProfile.reviewedAt).toLocaleString()}</span>}
                              </div>
                            )}
                            {demoProfile.status === "REJECTED" && demoProfile.adminNote && (
                              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide mb-1">Admin note</p>
                                <p className="text-sm text-foreground">{demoProfile.adminNote}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 p-8 text-center">
                            {verificationStatus === "REJECTED" ? (
                              <>
                                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                                <p className="text-sm font-medium text-foreground mb-1">Profile was rejected</p>
                                <p className="text-xs text-muted-foreground mb-4">Update your details and submit again for review. Use the buttons above or retry to load saved details.</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {useRealApi && <Button size="sm" variant="outline" onClick={() => fetchProfileFromDb()}>Retry load</Button>}
                                  <Button size="sm" variant="outline" data-demo-allow onClick={() => {
                                    if (demoMode) {
                                      setDemoLoginPromptCopy({
                                        title: "Sign in to update your profile",
                                        message: "Profile changes require a real account. Sign in to continue, or cancel to keep browsing the demo.",
                                      });
                                      setDemoLoginPromptOpen(true);
                                    } else setProfileUpdateDialogOpen(true);
                                  }}>Update profile</Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-foreground mb-1">No profile details yet</p>
                                <p className="text-xs text-muted-foreground mb-4">Use <strong>Update profile</strong> to add your details, then click the <strong>Verify</strong> badge to submit for admin review.</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <button
                                    type="button"
                                    data-demo-allow
                                    onClick={() => {
                                      if (demoMode) {
                                        setDemoLoginPromptCopy({
                                          title: "Sign in to update your profile",
                                          message: "Profile changes require a real account. Sign in to continue, or cancel to keep browsing the demo.",
                                        });
                                        setDemoLoginPromptOpen(true);
                                      } else setProfileUpdateDialogOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-2.5 py-1 text-xs font-medium transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Update profile
                                  </button>
                                </div>
                                {profileError && useRealApi && (
                                  <Button size="sm" variant="ghost" className="mt-4 text-muted-foreground" onClick={() => fetchProfileFromDb()}>Retry load</Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!profileLoading && (
                  <div className="mt-8">
                    <TwoFactorSettings initialEnabled={profile2faForUi} onEnabledChange={setProfile2faEnabled} hideEnableButton />
                  </div>
                )}
                </div>
              </div>
            )}
        </DashboardNavShell>
      </div>

      {/* Update Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={(open) => { setProfileDialogOpen(open); if (!open) setProfileForm({ email: "", phone: "" }); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Update profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDemoProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit profile for verification (tenant, real API) */}
      <Dialog open={profileSubmitDialogOpen} onOpenChange={setProfileSubmitDialogOpen}>
        <DialogContent
          className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]"
          onPointerDownOutside={(e) => {
            if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
            <DialogHeader className="space-y-1 text-left"><DialogTitle className="text-xl font-semibold tracking-tight">Submit profile for verification</DialogTitle></DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">Complete the form so admin can verify your profile. You can request visits/rentals after approval.</p>
          </div>
          <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-background px-5 py-4 sm:px-7">
            <ThemeProvider theme={tenantProfileMuiTheme}>
              <TenantProfileMuiForm form={profileSubmitForm} setForm={setProfileSubmitForm} />
            </ThemeProvider>
          </div>
          <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => setProfileSubmitDialogOpen(false)}>Cancel</Button>
              <Button className="min-h-10 w-full sm:w-auto" onClick={handleSubmitProfileForReview} disabled={submittingProfile}>
                {submittingProfile ? "Submitting..." : "Submit for review"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileUpdateDialog
        open={profileUpdateDialogOpen}
        onOpenChange={setProfileUpdateDialogOpen}
        description="Update your profile details. Click the Verify badge above to submit for review."
        saveDisabled={!canSaveProfileUpdate}
        saving={updatingProfile}
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdateProfileClick();
        }}
      >
        <ThemeProvider theme={tenantProfileMuiTheme}>
          <TenantProfileMuiForm form={profileSubmitForm} setForm={setProfileSubmitForm} />
        </ThemeProvider>
      </ProfileUpdateDialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmAction.open} onOpenChange={(open) => !open && setConfirmAction((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{confirmAction.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmAction.description}</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button variant={confirmAction.variant === "destructive" ? "destructive" : "default"} onClick={runConfirm}>{confirmAction.confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={timelineDialog.open}
        onOpenChange={(open) => !open && setTimelineDialog({ open: false, applicationId: null, events: [] })}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Timeline</DialogTitle>
            <DialogDescription>
              Track where your rental request currently stands.
            </DialogDescription>
          </DialogHeader>
          {timelineDialog.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events available.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {timelineDialog.events.map((ev, idx) => (
                <div key={`${ev.stage}-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-sm font-medium text-foreground">{ev.stage.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.occurredAt ? new Date(ev.occurredAt).toLocaleString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTimelineDialog({ open: false, applicationId: null, events: [] })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={propertyInfoDialog.open}
        onOpenChange={(open) => !open && setPropertyInfoDialog({ open: false, title: "", location: "", price: 0, status: "", subtitle: "", propertyId: undefined, leaseId: undefined, itemType: undefined })}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Title</p>
              <p className="font-medium text-foreground">{propertyInfoDialog.title || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium text-foreground">{propertyInfoDialog.location || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-medium text-foreground">₹{Number(propertyInfoDialog.price ?? 0).toLocaleString()}/month</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium text-foreground">{propertyInfoDialog.status || "—"}</p>
              </div>
            </div>
            {propertyInfoDialog.subtitle ? (
              <div>
                <p className="text-xs text-muted-foreground">Info</p>
                <p className="font-medium text-foreground">{propertyInfoDialog.subtitle}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            {propertyInfoDialog.itemType === "SAVED" && propertyInfoDialog.propertyId ? (
              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground">
                  You cannot view all details from saved properties directly. Please visit the Properties page to view complete listing details.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/properties">
                    <UtilityActionButton label="Visit Properties" icon={Search} tone="sky" size="md" />
                  </Link>
                  <UtilityActionButton
                    label="Close"
                    icon={X}
                    tone="rose"
                    size="md"
                    onClick={() => setPropertyInfoDialog({ open: false, title: "", location: "", price: 0, status: "", subtitle: "", propertyId: undefined, leaseId: undefined, itemType: undefined })}
                  />
                </div>
              </div>
            ) : null}
            {propertyInfoDialog.itemType === "RENTED" && propertyInfoDialog.leaseId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const leaseId = propertyInfoDialog.leaseId!;
                  getLeaseDashboard(leaseId)
                    .then(() => {
                      selectTab("my-properties");
                      toastSuccess("Lease details refreshed", "You are still in My Properties.");
                    })
                    .catch((err) => toastError("Could not open lease details", (err as Error)?.message))
                    .finally(() => {
                      setPropertyInfoDialog({ open: false, title: "", location: "", price: 0, status: "", subtitle: "", propertyId: undefined, leaseId: undefined, itemType: undefined });
                    });
                }}
              >
                Refresh lease details
              </Button>
            ) : null}
            {propertyInfoDialog.itemType !== "SAVED" ? (
              <Button type="button" onClick={() => setPropertyInfoDialog({ open: false, title: "", location: "", price: 0, status: "", subtitle: "", propertyId: undefined, leaseId: undefined, itemType: undefined })}>
                Close
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise complaint — same shell as profile */}
      <Dialog open={complaintDialog} onOpenChange={(open) => { if (!open) setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" }); setComplaintDialog(open); }}>
        <DialogContent
          className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]"
          onPointerDownOutside={(e) => {
            if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
            <DialogHeader className="space-y-1 text-left"><DialogTitle className="text-xl font-semibold tracking-tight">Raise a complaint</DialogTitle></DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">Select your property and describe the issue. Priority helps the owner respond.</p>
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => { e.preventDefault(); handleRaiseComplaint(); }}
          >
            <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-background px-5 py-4 sm:px-7">
              <ThemeProvider theme={tenantProfileMuiTheme}>
                <RaiseComplaintMuiFields
                  properties={complaintPropertyOptions.map((p) => ({ id: p.id, title: p.title }))}
                  propertyId={complaintForm.propertyId}
                  onPropertyId={(id) => setComplaintForm((f) => ({ ...f, propertyId: id, relatedUserId: 0 }))}
                  headline={complaintForm.subject}
                  onHeadline={(v) => setComplaintForm((f) => ({ ...f, subject: v }))}
                  description={complaintForm.description}
                  onDescription={(v) => setComplaintForm((f) => ({ ...f, description: v }))}
                  priority={complaintForm.priority}
                  onPriority={(v) => setComplaintForm((f) => ({ ...f, priority: v }))}
                  showAgainstSelect={Boolean(useRealApi)}
                  relatedUserId={complaintForm.relatedUserId}
                  onRelatedUserId={(id) => setComplaintForm((f) => ({ ...f, relatedUserId: id }))}
                  againstOptions={againstOptions}
                  againstLoading={againstOptionsLoading}
                  descriptionRequired={Boolean(useRealApi)}
                />
              </ThemeProvider>
            </div>
            <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <Button type="button" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => setComplaintDialog(false)}>Cancel</Button>
                <Button
                  type="submit"
                  className="min-h-10 w-full sm:w-auto"
                  disabled={
                    !complaintForm.subject?.trim() ||
                    (useRealApi ? !complaintForm.description?.trim() : false) ||
                    !complaintForm.propertyId
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Submit
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {useRealApi && (
        <>
          <Dialog open={updateProfileFirstDialogOpen} onOpenChange={setUpdateProfileFirstDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Profile required
                </DialogTitle>
                <DialogDescription>
                  Update your profile, then submit for review.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setUpdateProfileFirstDialogOpen(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <SubmitProfileForReviewDialog
            open={verifySubmitDialogOpen}
            onOpenChange={setVerifySubmitDialogOpen}
            submitting={submittingProfile}
            onConfirm={async () => {
              await handleSubmitProfileForReview();
            }}
          />
        </>
      )}

      {demoMode && (
        <DemoModeLoginPrompt
          open={demoLoginPromptOpen}
          onOpenChange={(open) => {
            setDemoLoginPromptOpen(open);
            if (!open) setDemoLoginPromptCopy({});
          }}
          title={demoLoginPromptCopy.title}
          message={demoLoginPromptCopy.message ?? "Please sign in to access the complete feature. Demo mode shows a preview only."}
        />
      )}
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

      <Dialog open={verifySuccessDialog.open} onOpenChange={(open) => setVerifySuccessDialog((p) => ({ ...p, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Profile submitted
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{verifySuccessDialog.message}</p>
          <DialogFooter>
            <Button onClick={() => setVerifySuccessDialog({ open: false, message: "" })}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Dashboard;
