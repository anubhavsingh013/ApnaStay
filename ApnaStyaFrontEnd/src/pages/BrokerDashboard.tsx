import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoRoleSwitcher from "@/features/demo/DemoRoleSwitcher";
import { useDemoData } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/app-toast";
import { getProfile, get2faStatus, submitProfileForReview, getDecodedToken, type ProfileDTO } from "@/lib/api";
import { VerificationBadge, type VerificationStatus } from "@/components/auth/VerificationBadge";
import { TwoFactorBadge } from "@/components/auth/TwoFactorBadge";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";
import { indianStates, isPincodeValidForState } from "@/constants/indianStates";
import {
  Building2, Users, Briefcase, User, Bell, Search, Eye, IndianRupee,
  AlertCircle, Plus, Handshake, Phone, ChevronRight, Pencil, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { SubmitProfileForReviewDialog } from "@/components/auth/SubmitProfileForReviewDialog";
import { DatePickerSelects } from "@/components/common/DatePickerSelects";
import { formatDob } from "@/lib/utils";

const DEMO_BROKER = "amit_broker";

const tabs = [
  { label: "Overview", icon: Briefcase, id: "overview" },
  { label: "Account", icon: User, id: "profile" },
  { label: "Properties", icon: Building2, id: "properties" },
  { label: "Clients", icon: Users, id: "clients" },
  { label: "Deals", icon: Handshake, id: "deals" },
  { label: "Alerts", icon: Bell, id: "notifications" },
];

interface Client {
  id: number; name: string; phone: string; email: string; lookingFor: string; budget: string;
  status: "ACTIVE" | "CLOSED" | "SEARCHING";
}

const seedClients: Client[] = [
  { id: 1, name: "Sneha Sharma", phone: "+91 98765 43210", email: "sneha@gmail.com", lookingFor: "2BHK Apartment in Bangalore", budget: "₹20K-30K/mo", status: "ACTIVE" },
  { id: 2, name: "Vikram Patel", phone: "+91 87654 32109", email: "vikram@outlook.com", lookingFor: "PG near Whitefield", budget: "₹8K-12K/mo", status: "SEARCHING" },
  { id: 3, name: "Meera Reddy", phone: "+91 76543 21098", email: "meera@gmail.com", lookingFor: "Office space in Hyderabad", budget: "₹40K-60K/mo", status: "CLOSED" },
];

const BrokerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, dashboardPath } = useAuth();
  const { demoMode, properties, bookings, requestBooking, notifications, markNotificationRead, getNotificationsFor, isBrokerProfileApproved, brokerProfiles, submitBrokerProfile } = useDemoData();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewProperty, setViewProperty] = useState<typeof properties[0] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [referDialog, setReferDialog] = useState(false);
  const [referPropId, setReferPropId] = useState<number | null>(null);
  const [referClientId, setReferClientId] = useState<number | null>(null);
  const [clientDialog, setClientDialog] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", lookingFor: "", budget: "" });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", phone: "" });
  const [apiApproved, setApiApproved] = useState<boolean | null>(null);
  const [apiProfile, setApiProfile] = useState<ProfileDTO | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSubmitDialogOpen, setProfileSubmitDialogOpen] = useState(false);
  const [verifySubmitDialogOpen, setVerifySubmitDialogOpen] = useState(false);
  const [profileSubmitForm, setProfileSubmitForm] = useState({
    fullName: "", gender: "Male", dateOfBirth: "", aadharNumber: "", mobile: "", firmName: "", licenseNumber: "",
    address: "", city: "", state: "", pinCode: "",
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profile2faEnabled, setProfile2faEnabled] = useState<boolean | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);

  useEffect(() => {
    if ((location.state as { openProfile?: boolean })?.openProfile) {
      navigate("/broker/dashboard", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (user && dashboardPath && dashboardPath !== "/broker/dashboard") {
      navigate(dashboardPath, { replace: true });
    }
  }, [user, dashboardPath, navigate]);

  const useRealApi = !demoMode && user;

  const fetchProfileFromDb = () => {
    if (!useRealApi) return;
    setProfileLoading(true);
    setProfileError(null);
    getProfile("ROLE_BROKER")
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data && typeof data.id === "number") {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
          const { countryCode, mobile } = parseMobileValue(data.mobile || "");
          const mobileFormValue = mobile ? `${countryCode}|${mobile}` : "";
          setProfileSubmitForm({
            fullName: data.fullName || "", gender: data.gender || "Male", dateOfBirth: data.dateOfBirth || "",
            aadharNumber: data.aadharNumber || "", mobile: mobileFormValue, firmName: data.firmName || "", licenseNumber: data.licenseNumber || "",
            address: data.address || "", city: data.city || "", state: data.state || "", pinCode: data.pinCode || "",
          });
        } else {
          setApiProfile(null);
          setApiApproved(false);
        }
      })
      .catch((err) => {
        const msg = err?.message || "";
        const isNotFound = /not found|profile not found|404/i.test(msg);
        setApiProfile(null);
        setApiApproved(false);
        if (isNotFound) {
          setProfileError(null);
        } else {
          setProfileError("Could not load profile");
          toastError("Profile load failed", "Please try again later.");
        }
      })
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    fetchProfileFromDb();
  }, [useRealApi]);

  useEffect(() => {
    if (demoMode) setClients([...seedClients]);
    else setClients([]);
  }, [demoMode]);

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

  const currentBroker = demoMode ? DEMO_BROKER : (user?.username ?? DEMO_BROKER);
  const brokerProfileApproved = demoMode ? isBrokerProfileApproved(currentBroker) : (apiApproved === true || apiProfile?.status === "APPROVED");
  const verificationStatus: VerificationStatus = demoMode
    ? (brokerProfiles.find((p) => p.brokerUser === currentBroker)?.status ?? null)
    : ((apiProfile?.status as VerificationStatus) ?? null);
  const myNotifications = getNotificationsFor(currentBroker, "BROKER");
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const myDeals = demoMode ? bookings.filter(b => b.brokerName === currentBroker) : [];
  const availableProps = demoMode ? properties.filter(p => p.status === "AVAILABLE") : [];
  const activeDeals = myDeals.filter(d => d.status === "REQUESTED" || d.status === "APPROVED");
  const displayClients = demoMode ? clients : [];
  const decodedToken = getDecodedToken();

  const filteredProperties = availableProps.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReferClient = () => {
    if (!brokerProfileApproved) {
      toastError("Profile approval required", "Get your broker profile approved to refer clients.");
      return;
    }
    if (!referPropId || !referClientId) return;
    const prop = availableProps.find(p => p.id === referPropId);
    const client = displayClients.find(c => c.id === referClientId);
    if (!prop || !client) return;
    requestBooking({ propertyId: prop.id, propertyTitle: prop.title, tenantName: client.email.split("@")[0] + "_tenant", ownerName: prop.ownerUserName, brokerName: currentBroker, visitDate: new Date(Date.now() + 3 * 86400000).toISOString(), type: "VISIT" });
    toastSuccess("Visit scheduled", `${client.name} referred to ${prop.title}`);
    setReferDialog(false); setReferPropId(null); setReferClientId(null);
  };

  const handleAddClient = () => {
    if (!clientForm.name) return;
    if (!demoMode) return;
    setClients(prev => [...prev, { ...clientForm, id: Date.now(), status: "SEARCHING" as const }]);
    toastSuccess("Client added"); setClientDialog(false);
    setClientForm({ name: "", phone: "", email: "", lookingFor: "", budget: "" });
  };

  const handleUpdateProfile = () => {
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

  const demoBrokerProfile = brokerProfiles.find((p) => p.brokerUser === currentBroker);

  useEffect(() => {
    if (profileSubmitDialogOpen && demoMode && demoBrokerProfile) {
      const { countryCode, mobile } = parseMobileValue(demoBrokerProfile.mobile || "");
      setProfileSubmitForm({
        fullName: demoBrokerProfile.name || "",
        gender: "Male",
        dateOfBirth: "",
        aadharNumber: "",
        mobile: mobile ? `${countryCode || "91"}|${mobile}` : "",
        firmName: demoBrokerProfile.firmName || "",
        licenseNumber: demoBrokerProfile.licenseNumber || "",
        address: demoBrokerProfile.address || "",
        city: demoBrokerProfile.city || "",
        state: demoBrokerProfile.state || "",
        pinCode: demoBrokerProfile.pincode || "",
      });
    }
  }, [profileSubmitDialogOpen, demoMode, demoBrokerProfile]);

  const handleSubmitProfileForReview = () => {
    const f = profileSubmitForm;
    const mobileStr = getMobileForApi();
    const aadharVal = (f.aadharNumber || "").trim().replace(/\D/g, "");
    if (!f.fullName?.trim() || !f.dateOfBirth || !mobileStr || !f.firmName?.trim() || !f.licenseNumber?.trim() || !f.address?.trim() || !f.state?.trim() || !f.city?.trim() || !f.pinCode?.trim()) {
      toastError("Missing fields", "Fill all mandatory fields including mobile (10 digits), firm name and license number.");
      return;
    }
    if (aadharVal.length !== 12) {
      toastError("Aadhar required", "Aadhar number must be 12 digits.");
      return;
    }
    if (f.state && !isPincodeValidForState(f.pinCode.trim(), f.state)) {
      toastError("Invalid pin code", "This pin code does not belong to the selected state.");
      return;
    }
    if (demoMode) {
      submitBrokerProfile({
        brokerUser: currentBroker,
        name: f.fullName.trim(),
        email: demoBrokerProfile?.email ?? `${currentBroker.replace(/_broker$/, "")}@gmail.com`,
        mobile: mobileStr,
        firmName: f.firmName.trim(),
        licenseNumber: f.licenseNumber.trim(),
        address: f.address.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        pincode: f.pinCode.trim(),
      });
      toastSuccess("Profile submitted", "Your broker profile has been submitted for admin review.");
      setProfileSubmitDialogOpen(false);
      return;
    }
    setSubmittingProfile(true);
    submitProfileForReview("ROLE_BROKER", {
      role: "ROLE_BROKER",
      fullName: f.fullName.trim(),
      gender: f.gender,
      dateOfBirth: f.dateOfBirth,
      aadharNumber: aadharVal || null,
      mobile: mobileStr,
      firmName: f.firmName.trim(),
      licenseNumber: f.licenseNumber.trim(),
      idType: null,
      idNumber: null,
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state.trim(),
      pinCode: f.pinCode.trim(),
    })
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data) {
          setApiProfile(data);
          setApiApproved(data.status === "APPROVED");
        }
        toastSuccess("Profile submitted", "Your broker profile has been submitted for admin review.");
        setProfileSubmitDialogOpen(false);
      })
      .catch((err) => toastError("Submission failed", err?.message))
      .finally(() => setSubmittingProfile(false));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900">
      <Navbar />
      {demoMode && <DemoRoleSwitcher />}

      <div className="container mx-auto px-4 py-4 md:py-8">
        {demoMode && (
          <div className="mb-4 p-3 bg-accent/50 border border-accent rounded-xl flex items-center gap-2 text-sm text-accent-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span><strong>Demo Mode</strong> — Viewing as <strong>{currentBroker}</strong></span>
          </div>
        )}
        {!brokerProfileApproved && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Your broker profile is pending approval. You cannot refer clients until approved.</span>
          </div>
        )}

        <div className="mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-700 border-l-4 border-l-violet-500/70 dark:border-l-violet-400/50 pl-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Broker Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome, {currentBroker} — Manage deals & clients</p>
          </div>
          <div className="hidden sm:flex gap-2 shrink-0">
            <button type="button" onClick={() => setReferDialog(true)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
              <CheckCircle className="h-3.5 w-3.5" /> Refer
            </button>
            <Link to="/properties" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
              <CheckCircle className="h-3.5 w-3.5" /> Browse
            </Link>
          </div>
        </div>

        {/* Mobile horizontal tabs */}
        <div className="flex overflow-x-auto gap-1 pb-3 mb-4 -mx-4 px-4 md:hidden scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${activeTab === t.id ? "border-violet-500/40 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.id === "notifications" && unreadCount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-medium">{unreadCount}</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sticky top-20 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 ring-1 ring-slate-100 dark:ring-slate-800/80 border-l-4 border-l-violet-500/80 dark:border-l-violet-400/60">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 dark:from-violet-400/25 dark:to-violet-500/15 flex items-center justify-center ring-2 ring-violet-400/20 dark:ring-violet-500/30 shrink-0"><Briefcase className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{currentBroker}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/15 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 text-xs font-semibold tracking-wide">Broker</span>
                    <VerificationBadge status={verificationStatus} showIcon className="text-[10px]" approvedAsActiveStyle onVerifyClick={(useRealApi || demoMode) ? () => setVerifySubmitDialogOpen(true) : undefined} />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${activeTab === t.id ? "border-violet-300 dark:border-violet-600/60 bg-violet-50/80 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 shadow-sm" : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <t.icon className="h-4 w-4 shrink-0" />{t.label}
                    {t.id === "notifications" && unreadCount > 0 && <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">{unreadCount}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile action buttons */}
            <div className="flex gap-2 sm:hidden">
              <button type="button" onClick={() => setReferDialog(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors">
                <CheckCircle className="h-3.5 w-3.5" /> Refer
              </button>
              <Link to="/properties" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors">
                <CheckCircle className="h-3.5 w-3.5" /> Browse
              </Link>
            </div>

            {/* Overview with clickable stats */}
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Building2, label: "Available", value: availableProps.length, color: "text-primary", tab: "properties" },
                    { icon: Users, label: "Clients", value: displayClients.length, color: "text-primary", tab: "clients" },
                    { icon: Handshake, label: "Active Deals", value: activeDeals.length, color: "text-amber-500", tab: "deals" },
                    { icon: IndianRupee, label: "Closed", value: myDeals.filter(d => d.status === "COMPLETED").length, color: "text-primary", tab: "deals" },
                  ].map(s => (
                    <button key={s.label} onClick={() => setActiveTab(s.tab)} className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4 text-left hover:shadow-lg hover:border-violet-300/60 dark:hover:border-violet-500/40 hover:bg-violet-50/40 dark:hover:bg-violet-900/20 transition-all duration-200 active:scale-[0.99] group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </button>
                  ))}
                </div>

              </>
            )}

            {activeTab === "properties" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <h2 className="text-base font-bold text-foreground">Available Properties</h2>
                  {availableProps.length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search..." className="pl-10 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                  )}
                </div>
                {filteredProperties.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">{availableProps.length === 0 ? "No available properties" : "No properties match your search"}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{availableProps.length === 0 ? "When properties are listed as available, they will appear here for you to refer to clients." : "Try a different search term."}</p>
                    {availableProps.length === 0 && (
                      <Link to="/properties" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                        <CheckCircle className="h-3.5 w-3.5" /> Browse properties
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProperties.map(p => (
                      <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{p.title}</p><p className="text-xs text-muted-foreground">{p.ownerUserName} • {p.city}</p></div>
                          <p className="text-sm font-bold text-foreground shrink-0">₹{p.price.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => setViewProperty(p)} className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/50 bg-transparent text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 h-7 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-0">
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button type="button" onClick={() => { setReferPropId(p.id); setReferDialog(true); }} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-7 px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                            <CheckCircle className="h-3 w-3" /> Refer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "clients" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-foreground">My Clients</h2>
                  {demoMode && (
                    <button type="button" onClick={() => setClientDialog(true)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-0">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>
                {displayClients.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No clients yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{demoMode ? "Add clients to refer them to properties. Use the Add button above." : "Client list will appear here when available."}</p>
                    {demoMode && (
                      <button type="button" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors" onClick={() => setClientDialog(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add client
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayClients.map(c => (
                      <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-card-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>
                          </div>
                          <Badge variant={c.status === "ACTIVE" ? "default" : c.status === "SEARCHING" ? "secondary" : "outline"} className="text-[10px] shrink-0">{c.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{c.lookingFor}</span>
                          <span className="font-medium">{c.budget}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "deals" && (
              <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-md shadow-slate-200/40 dark:shadow-slate-950/50 p-4">
                <h2 className="text-base font-bold text-foreground mb-3">My Deals & Referrals</h2>
                {myDeals.length === 0 ? (
                  <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Handshake className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No deals yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">When you refer clients to properties, your deals and referrals will appear here.</p>
                    {demoMode && (
                      <button type="button" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium transition-colors" onClick={() => setReferDialog(true)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Refer client
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myDeals.map(d => (
                      <div key={d.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/20 dark:bg-muted/10 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="text-sm font-semibold text-card-foreground truncate">{d.propertyTitle}</p><p className="text-xs text-muted-foreground">{d.tenantName} • {d.ownerName}</p></div>
                          <Badge variant={d.status === "APPROVED" ? "default" : d.status === "REQUESTED" ? "secondary" : d.status === "COMPLETED" ? "outline" : "destructive"} className="text-[10px] shrink-0">{d.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{new Date(d.visitDate).toLocaleDateString()}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{d.type}</Badge>
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
                  <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
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
                <div className="bg-gradient-to-r from-slate-50 to-violet-50/50 dark:from-slate-900/50 dark:to-violet-950/20 px-5 md:px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">Broker Profile</h2>
                      <VerificationBadge status={verificationStatus} showIcon className="text-xs" approvedAsActiveStyle onVerifyClick={(useRealApi || demoMode) ? () => setVerifySubmitDialogOpen(true) : undefined} />
                      <TwoFactorBadge enabled={profile2faEnabled ?? false} className="text-xs" onEnableClick={profile2faEnabled === false ? () => setTwoFactorDialogOpen(true) : undefined} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileSubmitDialogOpen(true)}
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
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent mb-3" />
                      <p className="text-sm text-muted-foreground">Loading profile…</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="w-1 h-4 rounded-full bg-violet-500/70" /> Account
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                            <p className="text-sm font-medium text-foreground truncate">{decodedToken?.sub ?? (useRealApi && apiProfile ? apiProfile.userName : currentBroker)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {decodedToken?.email ?? (useRealApi && apiProfile ? (apiProfile.email ?? apiProfile.userName) : (demoMode ? (demoBrokerProfile?.email ?? `${currentBroker.replace(/_broker$/, "")}@gmail.com`) : (user?.username ?? "—")))}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex flex-col justify-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                            <Badge variant="secondary" className="w-fit">Broker</Badge>
                          </div>
                        </div>
                      </div>
                      {(useRealApi || demoMode) && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-violet-500/70" /> Personal details
                          </h3>
                          {(useRealApi && apiProfile) ? (
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
                                <p className="text-sm font-medium text-foreground">{formatDob(apiProfile.dateOfBirth)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.gender || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Firm name</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.firmName || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">License number</p>
                                <p className="text-sm font-medium text-foreground">{apiProfile.licenseNumber || "—"}</p>
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
                          ) : demoBrokerProfile ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full name</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.name || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mobile</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.mobile || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.email || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Firm name</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.firmName || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">License number</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.licenseNumber || "—"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                <p className="text-sm font-medium text-foreground">{demoBrokerProfile.address ? `${demoBrokerProfile.address}, ${demoBrokerProfile.city}, ${demoBrokerProfile.state} – ${demoBrokerProfile.pincode}` : "—"}</p>
                              </div>
                              {(demoBrokerProfile.submittedAt || demoBrokerProfile.reviewedAt) && (
                                <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  {demoBrokerProfile.submittedAt && <span>Submitted: {new Date(demoBrokerProfile.submittedAt).toLocaleString()}</span>}
                                  {demoBrokerProfile.reviewedAt && <span>Reviewed: {new Date(demoBrokerProfile.reviewedAt).toLocaleString()}</span>}
                                </div>
                              )}
                              {demoBrokerProfile.status === "REJECTED" && demoBrokerProfile.adminNote && (
                                <div className="sm:col-span-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                                  <p className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide mb-1">Admin note</p>
                                  <p className="text-sm text-foreground">{demoBrokerProfile.adminNote}</p>
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
                                  onClick={() => setProfileSubmitDialogOpen(true)}
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
                              {profileError && useRealApi && (
                                <Button size="sm" variant="ghost" className="mt-4 text-muted-foreground" onClick={() => fetchProfileFromDb()}>Retry load</Button>
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
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broker profile submit for verification */}
      <Dialog open={profileSubmitDialogOpen} onOpenChange={setProfileSubmitDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit broker profile for verification</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Complete the form so admin can verify your broker profile. You can refer clients after approval.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Full name <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.fullName} onChange={e => setProfileSubmitForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender <span className="text-destructive">*</span></Label>
              <Select value={profileSubmitForm.gender} onValueChange={v => setProfileSubmitForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <DatePickerSelects label="Date of birth *" value={profileSubmitForm.dateOfBirth} onChange={v => setProfileSubmitForm(f => ({ ...f, dateOfBirth: v }))} maxDate={new Date()} />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhar number <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.aadharNumber} onChange={e => setProfileSubmitForm(f => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))} placeholder="12 digits" maxLength={12} />
            </div>
            <MobileInput value={profileSubmitForm.mobile} onChange={(v) => setProfileSubmitForm(f => ({ ...f, mobile: v }))} placeholder="9876543210" />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Firm name <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.firmName} onChange={e => setProfileSubmitForm(f => ({ ...f, firmName: e.target.value }))} placeholder="Your firm / company name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>License number <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.licenseNumber} onChange={e => setProfileSubmitForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="RERA / license number" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Address <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.address} onChange={e => setProfileSubmitForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label>State <span className="text-destructive">*</span></Label>
              <Select value={profileSubmitForm.state} onValueChange={v => setProfileSubmitForm(f => ({ ...f, state: v, city: "", pinCode: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{indianStates.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.city} onChange={e => setProfileSubmitForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Bangalore" />
            </div>
            <div className="space-y-1.5">
              <Label>Pin code <span className="text-destructive">*</span></Label>
              <Input value={profileSubmitForm.pinCode} onChange={e => setProfileSubmitForm(f => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="560001" maxLength={6} className={profileSubmitForm.state && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.state) ? "border-destructive" : ""} />
              {profileSubmitForm.state && profileSubmitForm.pinCode.length === 6 && !isPincodeValidForState(profileSubmitForm.pinCode, profileSubmitForm.state) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
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

      {/* Property Detail Dialog */}
      <Dialog open={!!viewProperty} onOpenChange={(open) => { if (!open) setViewProperty(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewProperty?.title}</DialogTitle></DialogHeader>
          {viewProperty && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-medium">{viewProperty.propertyType}</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Price</p><p className="text-sm font-medium">₹{viewProperty.price.toLocaleString()}/mo</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Bedrooms</p><p className="text-sm font-medium">{viewProperty.bedrooms}</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Owner</p><p className="text-sm font-medium">{viewProperty.ownerUserName}</p></div>
              <div className="space-y-1 col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{viewProperty.address}, {viewProperty.city}</p></div>
              <div className="space-y-1 col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewProperty.description}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refer Client Dialog */}
      <Dialog open={referDialog} onOpenChange={setReferDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Refer Client to Property</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Property</Label><Select value={referPropId?.toString() || ""} onValueChange={v => setReferPropId(+v)}><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger><SelectContent>{availableProps.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.title} — ₹{p.price.toLocaleString()}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Client</Label><Select value={referClientId?.toString() || ""} onValueChange={v => setReferClientId(+v)}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{displayClients.filter(c => c.status !== "CLOSED").map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setReferDialog(false)}>Cancel</Button>
            <Button onClick={handleReferClient} disabled={!referPropId || !referClientId}>Schedule Visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={(open) => { setProfileDialogOpen(open); if (!open) setProfileForm({ email: "", phone: "" }); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Update profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="your@email.com" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone (optional)</Label><Input type="tel" placeholder="+91 98765 43210" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Looking For</Label><Input value={clientForm.lookingFor} onChange={e => setClientForm(f => ({ ...f, lookingFor: e.target.value }))} placeholder="e.g. 2BHK in Bangalore" /></div>
            <div className="space-y-2"><Label>Budget</Label><Input value={clientForm.budget} onChange={e => setClientForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. ₹20K-30K/mo" /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setClientDialog(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!clientForm.name}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(useRealApi || demoMode) && (
        <SubmitProfileForReviewDialog
          open={verifySubmitDialogOpen}
          onOpenChange={setVerifySubmitDialogOpen}
          submitting={submittingProfile}
          onConfirm={() => setProfileSubmitDialogOpen(true)}
        />
      )}

      {(useRealApi || demoMode) && (
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

export default BrokerDashboard;
