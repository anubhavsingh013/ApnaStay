import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher, { getDemoUser, subscribeDemoUser } from "@/features/demo/DemoRoleSwitcher";
import PropertyCard from "@/components/property/PropertyCard";
import { properties as staticProperties } from "@/constants/properties";
import { useDemoData, type Complaint } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProfile, get2faStatus, submitProfileForReview, updateProfile, getProperties as getApiProperties, getComplaints, createComplaint, getUserIdByUsername, getDecodedToken, type ProfileDTO, type PropertyDTO, type ComplaintDTO, type ComplaintPriority, type ComplaintStatus } from "@/lib/api";
import { VerificationBadge, type VerificationStatus } from "@/components/auth/VerificationBadge";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";
import { indianStates, isPincodeValidForState, getCitiesForState, statePincodeRanges } from "@/constants/indianStates";
import {
  Heart, CalendarDays, User, Search, Bell, FileText,
  CreditCard, AlertCircle, Plus, IndianRupee, MessageSquare,
  ChevronRight, Pencil, CheckCircle, Eye, MapPin,
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
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { formatDob } from "@/lib/utils";

const TENANTS = ["sneha_tenant"];

function formatMobileDisplay(mobile: string | null | undefined): string {
  if (!mobile?.trim()) return "—";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  return mobile;
}

const tabs = [
  { label: "Overview", icon: Search, id: "overview" },
  { label: "Account", icon: User, id: "profile" },
  { label: "Properties", icon: Heart, id: "my-properties" },
  { label: "Complaints", icon: FileText, id: "complaints" },
  { label: "Bookings", icon: CalendarDays, id: "bookings" },
  { label: "Payments", icon: CreditCard, id: "payments" },
  { label: "Alerts", icon: Bell, id: "notifications" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, dashboardPath } = useAuth();
  const { toast } = useToast();
  const { demoMode, properties, bookings, payments, makePayment, complaints, raiseComplaint, notifications, markNotificationRead, getNotificationsFor, isTenantProfileApproved, tenantProfiles, updateTenantProfile, submitTenantProfile } = useDemoData();
  const [activeTab, setActiveTab] = useState("overview");
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
    address: "", city: "", state: "", pinCode: "", stateCode: "",
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [pendingBannerDismissed, setPendingBannerDismissed] = useState(false);
  const [rejectedBannerDismissed, setRejectedBannerDismissed] = useState(false);
  const [profile2faEnabled, setProfile2faEnabled] = useState<boolean | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [demoLoginPromptOpen, setDemoLoginPromptOpen] = useState(false);
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

  // When coming with openProfile state, switch to Account tab
  useEffect(() => {
    if ((location.state as { openProfile?: boolean })?.openProfile) {
      setActiveTab("profile");
      navigate("/dashboard", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Redirect to correct dashboard if user role doesn't match (e.g. owner/broker/admin should not stay on tenant dashboard)
  useEffect(() => {
    if (user && dashboardPath && dashboardPath !== "/dashboard") {
      navigate(dashboardPath, { replace: true });
    }
  }, [user, dashboardPath, navigate]);

  const useRealApi = !demoMode && user;

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
          const stateCode = indianStates.find((s) => s.name === data.state)?.code ?? "";
          setProfileSubmitForm({
            fullName: data.fullName || "", gender: data.gender || "Male", dateOfBirth: data.dateOfBirth || "",
            aadharNumber: data.aadharNumber || "", mobile: mobileFormValue, idType: data.idType || "Aadhar", idNumber: data.idNumber || "",
            address: data.address || "", city: data.city || "", state: data.state || "", pinCode: data.pinCode || "", stateCode,
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
          toast({ title: "Profile load failed", description: "Please try again later.", variant: "destructive" });
        }
      })
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    fetchProfileFromDb();
  }, [useRealApi]);

  useEffect(() => {
    if (useRealApi && activeTab === "profile") fetchProfileFromDb();
  }, [activeTab, useRealApi]);

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
      const stateCode = indianStates.find((s) => s.name === demoProfile.state)?.code ?? "";
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
        state: demoProfile.state || "",
        pinCode: demoProfile.pincode || "",
        stateCode,
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
      const stateCode = indianStates.find((s) => s.name === demoProfile.state)?.code ?? "";
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
        state: demoProfile.state || "",
        pinCode: demoProfile.pincode || "",
        stateCode,
      };
      setProfileSubmitForm(newForm);
      profileUpdateInitialRef.current = JSON.stringify(newForm);
    } else if (useRealApi && apiProfile) {
      const { countryCode, mobile } = parseMobileValue(apiProfile.mobile || "");
      const mobileFormValue = mobile ? `${countryCode || "91"}|${mobile}` : "";
      const stateCode = indianStates.find((s) => s.name === apiProfile.state)?.code ?? "";
      const newForm = {
        fullName: apiProfile.fullName || "",
        gender: apiProfile.gender || "Male",
        dateOfBirth: apiProfile.dateOfBirth || "",
        aadharNumber: apiProfile.aadharNumber || "",
        mobile: mobileFormValue,
        idType: apiProfile.idType || "Aadhar",
        idNumber: apiProfile.idNumber || "",
        address: apiProfile.address || "",
        city: apiProfile.city || "",
        state: apiProfile.state || "",
        pinCode: apiProfile.pinCode || "",
        stateCode,
      };
      setProfileSubmitForm(newForm);
      profileUpdateInitialRef.current = JSON.stringify(newForm);
    } else {
      setProfileSubmitForm((f) => ({ ...f, fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", idType: "Aadhar", idNumber: "", address: "", city: "", state: "", pinCode: "", stateCode: "" }));
      profileUpdateInitialRef.current = null;
    }
  }, [profileUpdateDialogOpen, demoMode, demoProfile, useRealApi, apiProfile]);

  const [complaintDialog, setComplaintDialog] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" as ComplaintPriority });
  const [apiComplaints, setApiComplaints] = useState<ComplaintDTO[]>([]);
  const [apiComplaintsLoading, setApiComplaintsLoading] = useState(false);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | "">("");
  const [apiPropertiesForComplaint, setApiPropertiesForComplaint] = useState<PropertyDTO[]>([]);
  const [againstOptions, setAgainstOptions] = useState<{ userId: number; userName: string }[]>([]);
  const [againstOptionsLoading, setAgainstOptionsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", phone: "" });

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
  const myPayments = payments.filter(p => p.tenantName === tenantForData);
  const displayPayments = demoMode ? [] : myPayments;
  const myComplaintsDemo = complaints.filter(c => c.raisedBy === tenantForData || c.againstUser === tenantForData);
  const myComplaintsAll = useRealApi ? apiComplaints : myComplaintsDemo;
  const myComplaints = complaintStatusFilter ? myComplaintsAll.filter((c) => c.status === complaintStatusFilter) : myComplaintsAll;
  const openComplaintsCount = myComplaintsAll.filter((c) => c.status === "OPEN").length;
  const showComplaintsCount = useRealApi ? (apiComplaintsLoading ? "…" : openComplaintsCount) : openComplaintsCount;
  const myNotifications = demoMode ? [] : getNotificationsFor(tenantForData, "TENANT");

  useEffect(() => {
    if (!useRealApi || (activeTab !== "complaints" && activeTab !== "overview")) return;
    setApiComplaintsLoading(true);
    getComplaints()
      .then((res) => {
        const list = (res as { data?: ComplaintDTO[] }).data;
        if (Array.isArray(list)) setApiComplaints(list);
      })
      .catch(() => setApiComplaints([]))
      .finally(() => setApiComplaintsLoading(false));
  }, [useRealApi, activeTab]);

  useEffect(() => {
    if (!useRealApi || !complaintDialog) return;
    getApiProperties()
      .then((res) => {
        const list = (res as { data?: PropertyDTO[] }).data;
        if (Array.isArray(list)) setApiPropertiesForComplaint(list);
      })
      .catch(() => setApiPropertiesForComplaint([]));
  }, [useRealApi, complaintDialog]);

  useEffect(() => {
    if (!useRealApi || !complaintForm.propertyId) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    const prop = apiPropertiesForComplaint.find((p) => p.id === complaintForm.propertyId);
    if (!prop?.ownerUserName?.trim()) {
      setAgainstOptions([]);
      setComplaintForm((f) => ({ ...f, relatedUserId: 0 }));
      return;
    }
    setAgainstOptionsLoading(true);
    const ownerId = (prop as PropertyDTO & { ownerId?: number }).ownerId;
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
  }, [useRealApi, complaintForm.propertyId, apiPropertiesForComplaint]);
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const myRentedProperties = staticProperties.filter(p => p.tenantUserName === tenantForData);

  const handleRaiseComplaint = async () => {
    if (useRealApi) {
      if (!complaintForm.subject?.trim() || !complaintForm.description?.trim() || !complaintForm.propertyId) {
        toast({ title: "Missing fields", description: "Subject, description, and property are required.", variant: "destructive" });
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
        toast({ title: "Complaint raised", description: "Your complaint has been submitted successfully." });
        setComplaintDialog(false);
        setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
        getComplaints().then((res) => {
          const list = (res as { data?: ComplaintDTO[] }).data;
          if (Array.isArray(list)) setApiComplaints(list);
        });
      } catch (err: unknown) {
        toast({ title: "Failed to raise complaint", description: (err as Error)?.message ?? "Please try again.", variant: "destructive" });
      }
      return;
    }
    if (!complaintForm.subject?.trim() || !complaintForm.propertyId) return;
    const prop = properties.find(p => p.id === complaintForm.propertyId);
    raiseComplaint({ title: complaintForm.subject, description: complaintForm.description, raisedBy: tenantForData, raisedByRole: "TENANT", againstUser: "", againstRole: "OWNER", propertyId: complaintForm.propertyId, propertyTitle: prop?.title || "", priority: complaintForm.priority as Complaint["priority"] });
    toast({ title: "Complaint raised" });
    setComplaintDialog(false);
    setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" });
  };

  const handleMakePayment = (id: number) => {
    if (demoMode) return;
    makePayment(id);
    toast({ title: "Payment successful", description: "Rent paid successfully" });
  };

  const handleSaveDemoProfile = () => {
    if (!profileForm.email?.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated", description: "Your changes have been saved." });
    setProfileDialogOpen(false);
  };

  const getMobileForApi = () => {
    const { countryCode, mobile } = parseMobileValue(profileSubmitForm.mobile);
    return formatMobileForApi(countryCode, mobile);
  };

  const handleUpdateProfileClick = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = f.stateCode ? (indianStates.find((s) => s.code === f.stateCode)?.name ?? f.state) : f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !f.address?.trim() || !stateName?.trim() || !f.city?.trim() || !f.pinCode?.trim()) {
      toast({ title: "Missing fields", description: "Fill all mandatory fields (name, DOB, mobile, address, state, city, pin code).", variant: "destructive" });
      return;
    }
    if (aadharVal.length !== 12) {
      toast({ title: "Aadhar required", description: "Aadhar number must be 12 digits.", variant: "destructive" });
      return;
    }
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
      return;
    }
    openConfirm("Update profile?", "Your profile details will be saved. Click the Verify badge to submit for review.", "Save", "default", () => handleUpdateProfile());
  };

  const handleUpdateProfile = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = f.stateCode ? (indianStates.find((s) => s.code === f.stateCode)?.name ?? f.state) : f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !f.address?.trim() || !stateName?.trim() || !f.city?.trim() || !f.pinCode?.trim()) {
      toast({ title: "Missing fields", description: "Fill all mandatory fields (name, DOB, mobile, address, state, city, pin code).", variant: "destructive" });
      return;
    }
    if (aadharVal.length !== 12) {
      toast({ title: "Aadhar required", description: "Aadhar number must be 12 digits.", variant: "destructive" });
      return;
    }
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
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
        address: f.address.trim(),
        city: f.city.trim(),
        state: stateName.trim(),
        pincode: f.pinCode.trim(),
      });
      toast({ title: "Profile updated", description: "Your changes have been saved. Click Verify to submit for review." });
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
      address: f.address.trim(),
      city: f.city.trim(),
      state: stateName.trim(),
      pinCode: f.pinCode.trim(),
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
          const stateCode = indianStates.find((s) => s.name === data.state)?.code ?? "";
          setProfileSubmitForm({
            fullName: data.fullName || "", gender: data.gender || "Male", dateOfBirth: data.dateOfBirth || "",
            aadharNumber: data.aadharNumber || "", mobile: mobileFormValue, idType: data.idType || "Aadhar", idNumber: data.idNumber || "",
            address: data.address || "", city: data.city || "", state: data.state || "", pinCode: data.pinCode || "", stateCode,
          });
        }
        toast({ title: "Profile updated", description: "Your profile has been updated. Click Verify to submit for review." });
        setProfileUpdateDialogOpen(false);
        setProfileUpdatedNeedsResubmit(true);
        fetchProfileFromDb();
      })
      .catch((err) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }))
      .finally(() => setUpdatingProfile(false));
  };

  const handleSubmitProfileForReview = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = f.stateCode ? (indianStates.find((s) => s.code === f.stateCode)?.name ?? f.state) : f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !f.address?.trim() || !stateName?.trim() || !f.city?.trim() || !f.pinCode?.trim()) {
      toast({ title: "Missing fields", description: "Fill all mandatory fields (name, DOB, mobile, address, state, city, pin code).", variant: "destructive" });
      return;
    }
    if (aadharVal.length !== 12) {
      toast({ title: "Aadhar required", description: "Aadhar number must be 12 digits.", variant: "destructive" });
      return;
    }
    if (!isPincodeValidForState(f.pinCode.trim(), stateName)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
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
        address: f.address.trim(),
        city: f.city.trim(),
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
      address: f.address.trim(),
      city: f.city.trim(),
      state: stateName.trim(),
      pinCode: f.pinCode.trim(),
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
      .catch((err) => toast({ title: "Submission failed", description: err?.message, variant: "destructive" }))
      .finally(() => setSubmittingProfile(false));
  };

  const isProfileUpdateFormValid = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || f.idNumber || "").trim().replace(/\D/g, "");
    const stateName = f.stateCode ? (indianStates.find((s) => s.code === f.stateCode)?.name ?? f.state) : f.state;
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !f.address?.trim() || !stateName?.trim() || !f.city?.trim() || !f.pinCode?.trim()) return false;
    if (aadharVal.length !== 12) return false;
    if (stateName && !isPincodeValidForState(f.pinCode.trim(), stateName)) return false;
    return true;
  };
  const hasProfileUpdateFormChanged = () => {
    if (!profileUpdateInitialRef.current) return true;
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
      address: apiProfile.address || "",
      city: apiProfile.city || "",
      state: apiProfile.state || "",
      pinCode: apiProfile.pinCode || "",
      stateCode: sc,
    });
    setVerifySubmitDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      <div className="container mx-auto px-4 py-4 md:py-8">
        {demoMode && (
          <div className="mb-4 p-3 bg-accent/50 border border-accent rounded-xl flex items-center gap-2 text-sm text-accent-foreground">
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
                <Link to="/dashboard" state={{ openProfile: true }}>Account</Link>
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
                <Link to="/dashboard" state={{ openProfile: true }}>Account</Link>
              </Button>
              <Button size="sm" variant="ghost" className="text-amber-800 dark:text-amber-200 h-8 px-2" onClick={() => setPendingBannerDismissed(true)} aria-label="Dismiss">
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500/70 dark:border-l-sky-400/50 pl-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome, {displayName}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!demoMode && (
              <Link to="/properties" className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-0">
                <Search className="h-3.5 w-3.5" /> Browse Properties
              </Link>
            )}
          </div>
        </div>

        {/* Mobile horizontal tabs */}
        <div className="flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4 md:hidden scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${activeTab === t.id ? "border-sky-500/40 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "notifications" && unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-medium">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sticky top-20 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 ring-1 ring-slate-100 dark:ring-slate-800/80 border-l-4 border-l-sky-500/80 dark:border-l-sky-400/60">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 dark:from-sky-400/25 dark:to-sky-500/15 flex items-center justify-center ring-2 ring-sky-400/20 dark:ring-sky-500/30 shrink-0"><User className="h-5 w-5 text-sky-600 dark:text-sky-400" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 text-xs font-semibold tracking-wide">Tenant</span>
                    <VerificationBadge status={verificationStatus} showIcon={true} className="text-[10px]" approvedAsActiveStyle needsResubmit={profileUpdatedNeedsResubmit} onVerifyClick={handleVerifyClick} />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${activeTab === t.id ? "border-sky-300 dark:border-sky-600/60 bg-sky-50/80 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 shadow-sm" : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <t.icon className="h-4 w-4 shrink-0" />
                    {t.label}
                    {t.id === "notifications" && unreadCount > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile action buttons */}
            <div className="flex gap-2 sm:hidden">
              <Link to="/properties" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-500/50 bg-transparent text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-3 py-1.5 text-xs font-medium transition-colors">
                <Search className="h-3.5 w-3.5" /> Browse Properties
              </Link>
            </div>

            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Heart, label: "My Properties", value: myRentedProperties.length, sub: null, iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", tab: "my-properties" },
                    { icon: CalendarDays, label: "Bookings", value: myBookings.length, sub: myBookings.filter(b => b.status === "REQUESTED" || b.status === "APPROVED").length > 0 ? `${myBookings.filter(b => b.status === "REQUESTED" || b.status === "APPROVED").length} active` : null, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", tab: "bookings" },
                    { icon: CreditCard, label: "Payments", value: displayPayments.length, sub: displayPayments.filter(p => p.status !== "PAID").length > 0 ? `${displayPayments.filter(p => p.status !== "PAID").length} pending` : null, iconBg: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600 dark:text-sky-400", tab: "payments" },
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

            {activeTab === "my-properties" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <h2 className="text-base font-bold text-foreground mb-3">My Rented Properties</h2>
                {myRentedProperties.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No rented properties yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Properties you rent will appear here. Browse and request a rental to get started.</p>
                    <Link to="/properties" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                      <CheckCircle className="h-3.5 w-3.5" /> Browse properties
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myRentedProperties.map(p => <PropertyCard key={p.id} property={p} />)}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-foreground">Property Visit Requests</h2>
                  <Link to="/properties" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                    <Plus className="h-3.5 w-3.5" /> Book Visit
                  </Link>
                </div>
                {myBookings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No visit requests yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Browse properties and book a visit from the property detail page.</p>
                    <Link to="/properties" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                      <Plus className="h-3.5 w-3.5" /> Browse Properties
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myBookings.map(b => (
                      <div key={b.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-card-foreground truncate">{b.propertyTitle}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Owner: {b.ownerName}</p>
                          </div>
                          <Badge variant={b.status === "APPROVED" ? "default" : b.status === "REQUESTED" ? "secondary" : b.status === "COMPLETED" ? "outline" : "destructive"} className="shrink-0">{b.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(b.visitDate).toLocaleDateString()}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{b.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Payment History</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Rent and other payments you've made.</p>
                    </div>
                  </div>
                </div>
                {displayPayments.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No payments yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Your rent and other payment history will appear here once you have active bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayPayments.map(p => (
                      <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-card-foreground truncate">{p.propertyTitle}</p>
                            <p className="text-xs text-muted-foreground">{p.month}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">₹{p.amount.toLocaleString()}</p>
                            <Badge variant={p.status === "PAID" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"} className="text-[10px] mt-0.5">{p.status}</Badge>
                          </div>
                        </div>
                        {p.status !== "PAID" && (
                          <Button size="sm" className="w-full mt-2" onClick={() => handleMakePayment(p.id)}>
                            <IndianRupee className="h-3 w-3 mr-1" /> Pay Now
                          </Button>
                        )}
                        {p.status === "PAID" && p.paidAt && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">Paid on {new Date(p.paidAt).toLocaleDateString()}</p>
                        )}
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
                          <p className="text-xs text-muted-foreground">View and track complaints you raised. Use the filter or raise a new one.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusFilterDropdown value={complaintStatusFilter} onChange={setComplaintStatusFilter} />
                      <button
                        type="button"
                        onClick={() => setComplaintDialog(true)}
                        disabled={apiComplaintsLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Raise
                      </button>
                    </div>
                  </div>
                </div>
                {apiComplaintsLoading ? (
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
                    {myComplaints.map((c: ComplaintDTO | (Complaint & { subject?: string; relatedUserName?: string })) => {
                      const subject = "subject" in c ? c.subject : (c as Complaint).title;
                      const sub = "relatedUserName" in c ? (c as ComplaintDTO).relatedUserName : (c as Complaint).againstUser;
                      const propLabel = "propertyTitle" in c && (c as Complaint).propertyTitle ? (c as Complaint).propertyTitle : `Property #${(c as ComplaintDTO).propertyId}`;
                      const status = c.status;
                      const priority = c.priority;
                      const statusCls = status === "OPEN" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300" : status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300" : status === "RESOLVED" || status === "CLOSED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300" : "bg-muted text-muted-foreground";
                      const priorityCls = priority === "HIGH" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300" : priority === "MEDIUM" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200 border-slate-300";
                      return (
                        <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-card-foreground truncate">{subject}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{propLabel}{sub ? ` • Related: ${sub}` : ""}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Badge variant="outline" className={`text-[10px] border ${priorityCls}`}>{priority}</Badge>
                              <Badge variant="outline" className={`text-[10px] border ${statusCls}`}>{status}</Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2">{new Date(c.createdAt).toLocaleDateString()}</p>
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

            {activeTab === "profile" && (
              <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 overflow-hidden">
                {/* Header with subtle gradient */}
                <div className="bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-900/50 dark:to-sky-950/20 px-5 md:px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">My Profile</h2>
                      <VerificationBadge status={verificationStatus} showIcon className="text-xs" approvedAsActiveStyle needsResubmit={profileUpdatedNeedsResubmit} onVerifyClick={handleVerifyClick} />
                      <TwoFactorBadge enabled={profile2faEnabled ?? false} className="text-xs" onEnableClick={(profile2faEnabled === false) ? (demoMode ? () => setDemoLoginPromptOpen(true) : () => setTwoFactorDialogOpen(true)) : undefined} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { if (demoMode) { setDemoLoginPromptOpen(true); return; } if (demoProfile) { const { countryCode, mobile } = parseMobileValue(demoProfile.mobile || ""); const sc = indianStates.find((s) => s.name === demoProfile.state)?.code ?? ""; setProfileSubmitForm({ fullName: demoProfile.name || "", gender: demoProfile.gender || "Male", dateOfBirth: demoProfile.dob || "", aadharNumber: demoProfile.idNumber || "", mobile: mobile ? `${countryCode || "91"}|${mobile}` : "", idType: demoProfile.idType || "Aadhar", idNumber: demoProfile.idNumber || "", address: demoProfile.address || "", city: demoProfile.city || "", state: demoProfile.state || "", pinCode: demoProfile.pincode || "", stateCode: sc }); } else if (apiProfile) { const { countryCode, mobile } = parseMobileValue(apiProfile.mobile || ""); const sc = indianStates.find((s) => s.name === apiProfile.state)?.code ?? ""; setProfileSubmitForm({ fullName: apiProfile.fullName || "", gender: apiProfile.gender || "Male", dateOfBirth: apiProfile.dateOfBirth || "", aadharNumber: apiProfile.aadharNumber || "", mobile: mobile ? `${countryCode || "91"}|${mobile}` : "", idType: apiProfile.idType || "Aadhar", idNumber: apiProfile.idNumber || "", address: apiProfile.address || "", city: apiProfile.city || "", state: apiProfile.state || "", pinCode: apiProfile.pinCode || "", stateCode: sc }); } setProfileUpdateDialogOpen(true); }}
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
                {profileLoading && useRealApi ? (
                  <div className="py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-3" />
                    <p className="text-sm text-muted-foreground">Loading profile…</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Account info */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-sky-500/70" /> Account
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                          <p className="text-sm font-medium text-foreground truncate">{decodedToken?.sub ?? (useRealApi && apiProfile ? apiProfile.userName : displayName)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                          <p className="text-sm font-medium text-foreground truncate">{decodedToken?.email ?? (useRealApi && apiProfile ? (apiProfile.email ?? apiProfile.userName) : (demoMode ? (demoProfile?.email ?? `${currentTenant.replace(/_tenant$/, "")}@gmail.com`) : (user?.username ?? "")))}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex flex-col justify-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                          <Badge variant="secondary" className="w-fit">Tenant</Badge>
                        </div>
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
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aadhar / ID number</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.idType && apiProfile.idNumber ? `${apiProfile.idType}: ${apiProfile.idNumber}` : (apiProfile.aadharNumber || apiProfile.idNumber || "—")}</p>
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
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aadhar / ID number</p>
                                <p className="text-sm font-medium text-foreground">{demoProfile.idType && demoProfile.idNumber ? `${demoProfile.idType}: ${demoProfile.idNumber}` : (demoProfile.idNumber || "—")}</p>
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
                                  <Button size="sm" variant="outline" onClick={() => setProfileUpdateDialogOpen(true)}>Update profile</Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-foreground mb-1">No profile details yet</p>
                                <p className="text-xs text-muted-foreground mb-4">Use <strong>Update profile</strong> to add your details, then click the <strong>Verify</strong> badge to submit for admin review.</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setProfileUpdateDialogOpen(true)}
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

                {myRentedProperties.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                    <h3 className="text-sm font-semibold text-foreground mb-2">My Rented Properties</h3>
                    <div className="space-y-2">
                      {myRentedProperties.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-secondary-foreground truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground">Owner: {p.ownerUserName}</p>
                          </div>
                          <Badge className="shrink-0">Rented</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!profileLoading && (
                  <div className="mt-8">
                    <TwoFactorSettings initialEnabled={profile2faEnabled} onEnabledChange={setProfile2faEnabled} hideEnableButton />
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Submit profile for verification</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Complete the form so admin can verify your profile. You can request visits/rentals after approval.</p>
          <div className="space-y-6 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h3>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5 w-full">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.fullName} onChange={e => setProfileSubmitForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Sneha Kumar" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={profileSubmitForm.gender} onValueChange={v => setProfileSubmitForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="w-full">
                  <DatePickerInput label="Date of birth *" value={profileSubmitForm.dateOfBirth} onChange={v => setProfileSubmitForm(f => ({ ...f, dateOfBirth: v }))} maxDate={new Date()} placeholder="Select date" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Aadhar / ID number <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.aadharNumber || profileSubmitForm.idNumber} onChange={e => setProfileSubmitForm(f => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12), idNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))} placeholder="12 digits" maxLength={12} className="h-10 w-full" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Mobile <span className="text-destructive">*</span></Label>
                  <MobileInput hideLabel compact value={profileSubmitForm.mobile} onChange={(v) => setProfileSubmitForm(f => ({ ...f, mobile: v }))} placeholder="9876543210" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Address Details</h3>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5 w-full">
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Select value={profileSubmitForm.stateCode} onValueChange={v => setProfileSubmitForm(f => ({ ...f, stateCode: v, state: indianStates.find(s => s.code === v)?.name ?? "", city: "", pinCode: "" }))}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-60">{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>District / City <span className="text-destructive">*</span></Label>
                  {getCitiesForState(profileSubmitForm.stateCode).length > 0 ? (
                    <Select value={profileSubmitForm.city} onValueChange={v => setProfileSubmitForm(f => ({ ...f, city: v }))} disabled={!profileSubmitForm.stateCode}>
                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder={profileSubmitForm.stateCode ? "Select City" : "Select state first"} /></SelectTrigger>
                      <SelectContent className="max-h-60">{getCitiesForState(profileSubmitForm.stateCode).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={profileSubmitForm.city} onChange={e => setProfileSubmitForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Bangalore" disabled={!profileSubmitForm.stateCode} className="h-10 w-full" />
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Pin code <span className="text-destructive">*</span></Label>
                  {statePincodeRanges[profileSubmitForm.stateCode]?.samples?.length ? (
                    <Select value={profileSubmitForm.pinCode} onValueChange={v => setProfileSubmitForm(f => ({ ...f, pinCode: v }))}>
                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select Pin Code" /></SelectTrigger>
                      <SelectContent>{(statePincodeRanges[profileSubmitForm.stateCode]?.samples ?? []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input placeholder="e.g. 560001" maxLength={6} value={profileSubmitForm.pinCode} onChange={e => setProfileSubmitForm(f => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={`h-10 w-full ${profileSubmitForm.stateCode && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.stateCode) ? "border-destructive" : ""}`} />
                      {profileSubmitForm.stateCode && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.stateCode) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
                    </>
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.address} onChange={e => setProfileSubmitForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address, locality" className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProfileSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitProfileForReview} disabled={submittingProfile}>
              {submittingProfile ? "Submitting..." : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update profile (tenant, real API) — same form, PUT only */}
      <Dialog open={profileUpdateDialogOpen} onOpenChange={setProfileUpdateDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Update profile</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Update your profile details. Click the Verify badge above to submit for review.</p>
          <div className="space-y-6 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h3>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5 w-full">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.fullName} onChange={e => setProfileSubmitForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Sneha Kumar" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={profileSubmitForm.gender} onValueChange={v => setProfileSubmitForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="w-full">
                  <DatePickerInput label="Date of birth *" value={profileSubmitForm.dateOfBirth} onChange={v => setProfileSubmitForm(f => ({ ...f, dateOfBirth: v }))} maxDate={new Date()} placeholder="Select date" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Aadhar / ID number <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.aadharNumber || profileSubmitForm.idNumber} onChange={e => setProfileSubmitForm(f => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12), idNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))} placeholder="12 digits" maxLength={12} className="h-10 w-full" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Mobile <span className="text-destructive">*</span></Label>
                  <MobileInput hideLabel compact value={profileSubmitForm.mobile} onChange={(v) => setProfileSubmitForm(f => ({ ...f, mobile: v }))} placeholder="9876543210" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Address Details</h3>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5 w-full">
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Select value={profileSubmitForm.stateCode} onValueChange={v => setProfileSubmitForm(f => ({ ...f, stateCode: v, state: indianStates.find(s => s.code === v)?.name ?? "", city: "", pinCode: "" }))}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-60">{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>District / City <span className="text-destructive">*</span></Label>
                  {getCitiesForState(profileSubmitForm.stateCode).length > 0 ? (
                    <Select value={profileSubmitForm.city} onValueChange={v => setProfileSubmitForm(f => ({ ...f, city: v }))} disabled={!profileSubmitForm.stateCode}>
                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder={profileSubmitForm.stateCode ? "Select City" : "Select state first"} /></SelectTrigger>
                      <SelectContent className="max-h-60">{getCitiesForState(profileSubmitForm.stateCode).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={profileSubmitForm.city} onChange={e => setProfileSubmitForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Bangalore" disabled={!profileSubmitForm.stateCode} className="h-10 w-full" />
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Pin code <span className="text-destructive">*</span></Label>
                  {statePincodeRanges[profileSubmitForm.stateCode]?.samples?.length ? (
                    <Select value={profileSubmitForm.pinCode} onValueChange={v => setProfileSubmitForm(f => ({ ...f, pinCode: v }))}>
                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select Pin Code" /></SelectTrigger>
                      <SelectContent>{(statePincodeRanges[profileSubmitForm.stateCode]?.samples ?? []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input placeholder="e.g. 560001" maxLength={6} value={profileSubmitForm.pinCode} onChange={e => setProfileSubmitForm(f => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={`h-10 w-full ${profileSubmitForm.stateCode && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.stateCode) ? "border-destructive" : ""}`} />
                      {profileSubmitForm.stateCode && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.stateCode) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
                    </>
                  )}
                </div>
                <div className="space-y-1.5 w-full">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <Input value={profileSubmitForm.address} onChange={e => setProfileSubmitForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address, locality" className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProfileUpdateDialogOpen(false)} className="border-2 border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-500 dark:hover:border-slate-400">
              Cancel
            </Button>
            <Button onClick={handleUpdateProfileClick} disabled={!canSaveProfileUpdate || updatingProfile} className="border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:border-emerald-700 dark:hover:border-emerald-600">
              {updatingProfile ? "Saving..." : <><CheckCircle className="h-4 w-4 mr-2" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onOpenChange={(open) => { if (!open) setComplaintForm({ subject: "", description: "", propertyId: 0, relatedUserId: 0, priority: "MEDIUM" }); setComplaintDialog(open); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Raise a Complaint</DialogTitle></DialogHeader>
          <form
            className="space-y-4 py-2"
            onSubmit={(e) => { e.preventDefault(); handleRaiseComplaint(); }}
          >
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={complaintForm.propertyId?.toString() || ""} onValueChange={v => setComplaintForm(f => ({ ...f, propertyId: +v, relatedUserId: 0 }))}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {(useRealApi ? apiPropertiesForComplaint : (demoMode ? properties.filter(p => p.status === "RENTED" && p.tenantUserName === tenantForData) : properties).map(p => ({ id: p.id, title: p.title }))).map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {useRealApi && (
              <div className="space-y-2">
                <Label>Against (optional)</Label>
                <Select
                  value={complaintForm.relatedUserId && complaintForm.relatedUserId > 0 ? String(complaintForm.relatedUserId) : "__none__"}
                  onValueChange={(v) => setComplaintForm((f) => ({ ...f, relatedUserId: v === "__none__" ? 0 : Number(v) }))}
                  disabled={againstOptionsLoading || !complaintForm.propertyId}
                >
                  <SelectTrigger><SelectValue placeholder={againstOptionsLoading ? "Loading…" : complaintForm.propertyId ? "Select someone (optional)" : "Select a property first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {againstOptions.map((o) => <SelectItem key={o.userId} value={o.userId.toString()}>{o.userName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {complaintForm.propertyId && !againstOptionsLoading && againstOptions.length === 0 && <p className="text-xs text-muted-foreground">No one associated with this property to select.</p>}
              </div>
            )}
            <div className="space-y-2"><Label>Subject</Label><Input value={complaintForm.subject} onChange={e => setComplaintForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief subject" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={complaintForm.description} onChange={e => setComplaintForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue..." rows={3} /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={complaintForm.priority} onValueChange={v => setComplaintForm(f => ({ ...f, priority: v as ComplaintPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setComplaintDialog(false)}>Cancel</Button>
              <button
                type="submit"
                disabled={!complaintForm.subject?.trim() || !complaintForm.description?.trim() || !complaintForm.propertyId}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Submit
              </button>
            </DialogFooter>
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

      {demoMode && <DemoModeLoginPrompt open={demoLoginPromptOpen} onOpenChange={setDemoLoginPromptOpen} message="Please sign in to access the complete feature. Demo mode shows a preview only." />}
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
