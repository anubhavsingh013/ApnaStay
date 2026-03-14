import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { indianStates, indianCities, commonLocalities, commonPoliceStations, statePincodeRanges, getCitiesForState, isPincodeValidForState } from "@/constants/indianStates";
import { useDemoData } from "@/features/demo/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Phone, Mail, FileText } from "lucide-react";
import { getDemoUser } from "@/features/demo/DemoRoleSwitcher";
import { getProfile, submitProfileForReview, type ProfileDTO } from "@/lib/api";
import { MobileInput, parseMobileValue, formatMobileForApi } from "@/components/auth/MobileInput";

const genderOptions = ["Male", "Female", "Other"];

const SuggestionList = ({ suggestions, onSelect, visible }: { suggestions: string[]; onSelect: (val: string) => void; visible: boolean }) => {
  if (!visible || suggestions.length === 0) return null;
  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
      {suggestions.map((s) => (
        <button key={s} type="button" className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}>
          {s}
        </button>
      ))}
    </div>
  );
};

function mapApiProfileToForm(d: ProfileDTO) {
  const stateCode = indianStates.find((s) => s.name === d.state)?.code ?? d.state;
  return {
    name: d.fullName || "",
    gender: d.gender || "",
    dob: d.dateOfBirth || "",
    aadhar: d.aadharNumber || "",
    mobile: d.mobile || "",
    email: d.email || "",
    village: d.address?.split(",")[0]?.trim() || d.city || "",
    postOffice: "",
    policeStation: "",
    state: stateCode,
    district: d.city || "",
    pincode: d.pinCode || "",
  };
}

const OwnerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { demoMode, ownerProfiles, submitOwnerProfile } = useDemoData();
  const currentOwner = demoMode ? (getDemoUser() || "rajesh_owner") : (user?.username ?? "");
  const existingDemoProfile = ownerProfiles.find((p) => p.ownerUser === currentOwner);

  const [name, setName] = useState(existingDemoProfile?.name || "");
  const [gender, setGender] = useState(existingDemoProfile?.gender || "");
  const [dob, setDob] = useState(existingDemoProfile?.dob || "");
  const [aadhar, setAadhar] = useState(existingDemoProfile?.aadhar || "");
  const [mobile, setMobile] = useState(existingDemoProfile?.mobile || "");
  const [email, setEmail] = useState(existingDemoProfile?.email || "");
  const [village, setVillage] = useState(existingDemoProfile?.village || "");
  const [postOffice, setPostOffice] = useState(existingDemoProfile?.postOffice || "");
  const [policeStation, setPoliceStation] = useState(existingDemoProfile?.policeStation || "");
  const [state, setState] = useState(existingDemoProfile?.state || "");
  const [district, setDistrict] = useState(existingDemoProfile?.district || "");
  const [pincode, setPincode] = useState(existingDemoProfile?.pincode || "");

  const [apiProfile, setApiProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [villageFocused, setVillageFocused] = useState(false);
  const [policeFocused, setPoliceFocused] = useState(false);

  const useRealApi = !demoMode && user;

  useEffect(() => {
    if (!useRealApi) return;
    setLoading(true);
    getProfile("ROLE_OWNER")
      .then((res) => {
        const data = (res as { data?: ProfileDTO }).data;
        if (data) {
          setApiProfile(data);
          const f = mapApiProfileToForm(data);
          setName(f.name);
          setGender(f.gender);
          setDob(f.dob);
          setAadhar(f.aadhar);
          const { countryCode, mobile: m } = parseMobileValue(f.mobile);
          setMobile(m ? `${countryCode}|${m}` : "");
          setEmail(f.email || "");
          setVillage(f.village);
          setPostOffice(f.postOffice);
          setPoliceStation(f.policeStation);
          setState(f.state);
          setDistrict(f.district);
          setPincode(f.pincode);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [useRealApi]);

  const selectedState = useMemo(() => indianStates.find((s) => s.code === state), [state]);
  const districts = selectedState?.districts ?? [];
  const pincodes = state ? (statePincodeRanges[state]?.samples || []) : [];

  const villageSuggestions = useMemo(() => {
    if (!village || village.length < 2) return [];
    const all = [...commonLocalities, ...indianCities];
    return [...new Set(all.filter((c) => c.toLowerCase().includes(village.toLowerCase())))].slice(0, 8);
  }, [village]);

  const policeSuggestions = useMemo(() => {
    if (!policeStation || policeStation.length < 1) return [];
    return commonPoliceStations.filter((c) => c.toLowerCase().includes(policeStation.toLowerCase())).slice(0, 6);
  }, [policeStation]);

  const mobileForApi = parseMobileValue(mobile).mobile;
  const isFormComplete = name && gender && dob && aadhar.length === 12 && mobileForApi.length === 10 && email && village && postOffice && policeStation && state && district && pincode.length === 6;

  const existingProfile = useRealApi ? apiProfile : existingDemoProfile;
  const displayStatus = useRealApi ? apiProfile?.status : existingDemoProfile?.status;

  const handleSubmit = () => {
    if (!isFormComplete) return;
    if (state && pincode.length === 6 && !isPincodeValidForState(pincode, state)) {
      toast({ title: "Invalid pin code", description: "This pin code does not belong to the selected state.", variant: "destructive" });
      return;
    }
    if (useRealApi) {
      const stateName = indianStates.find((s) => s.code === state)?.name ?? state;
      setSubmitting(true);
      submitProfileForReview("ROLE_OWNER", {
        role: "ROLE_OWNER",
        fullName: name,
        gender,
        dateOfBirth: dob,
        aadharNumber: aadhar || null,
        mobile: formatMobileForApi(parseMobileValue(mobile).countryCode, parseMobileValue(mobile).mobile),
        firmName: null,
        licenseNumber: null,
        idType: null,
        idNumber: null,
        address: [village, postOffice, policeStation].filter(Boolean).join(", ") || village,
        city: district,
        state: stateName,
        pinCode: pincode,
      })
        .then((res) => {
          const data = (res as { data?: ProfileDTO }).data;
          if (data) setApiProfile(data);
          toast({ title: "Profile submitted for review", description: "Your profile will be reviewed by admin." });
          navigate("/owner/dashboard");
        })
        .catch((err) => toast({ title: "Submission failed", description: err?.message, variant: "destructive" }))
        .finally(() => setSubmitting(false));
    } else {
      const mobileStr = formatMobileForApi(parseMobileValue(mobile).countryCode, parseMobileValue(mobile).mobile);
      submitOwnerProfile({ ownerUser: currentOwner, name, gender, dob, aadhar, mobile: mobileStr, email, village, postOffice, policeStation, state, district, pincode });
      toast({ title: "Profile submitted for review", description: "Your profile will be reviewed by admin." });
      navigate("/owner/dashboard");
    }
  };

  const statusColor = displayStatus === "APPROVED" ? "default" : displayStatus === "REJECTED" ? "destructive" : "secondary";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {existingProfile ? "Update Profile" : "Owner Profile Setup"}
          </h1>
          {existingProfile && <Badge variant={statusColor} className="text-xs">{displayStatus}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {loading ? "Loading profile..." : existingProfile ? "Update your details. Changes will require re-approval." : "Complete your profile to get verified"}
        </p>

        <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-6 space-y-6">
          {/* Personal Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input placeholder="e.g. Rajesh Kumar" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>{genderOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date of Birth *</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DD/MM/YYYY" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Aadhar No *</Label>
                <Input placeholder="e.g. 123456789012" maxLength={12} value={aadhar} onChange={(e) => setAadhar(e.target.value.replace(/\D/g, "").slice(0, 12))} />
              </div>
              <MobileInput label="Mobile *" value={mobile} onChange={setMobile} placeholder="9876543210" />
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                <Input type="email" placeholder="e.g. rajesh@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Address Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State <span className="text-destructive">*</span></Label>
                <Select value={state} onValueChange={(v) => { setState(v); setDistrict(""); setPincode(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {indianStates.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">District <span className="text-destructive">*</span></Label>
                <Select value={district} onValueChange={setDistrict} disabled={!state}>
                  <SelectTrigger><SelectValue placeholder={state ? "Select District" : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {districts.map((d) => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pin Code <span className="text-destructive">*</span></Label>
                {pincodes.length > 0 ? (
                  <Select value={pincode} onValueChange={setPincode}>
                    <SelectTrigger><SelectValue placeholder="Select Pin Code" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {pincodes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input placeholder="e.g. 560001" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={state && pincode.length === 6 && !isPincodeValidForState(pincode, state) ? "border-destructive" : ""} />
                    {state && pincode.length === 6 && !isPincodeValidForState(pincode, state) && <p className="text-xs text-destructive">Pin code does not belong to selected state</p>}
                  </>
                )}
              </div>
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold">Village / Town / Locality *</Label>
                <Input placeholder="e.g. Gandhi Nagar" value={village} onChange={(e) => setVillage(e.target.value)} onFocus={() => setVillageFocused(true)} onBlur={() => setTimeout(() => setVillageFocused(false), 150)} />
                <SuggestionList suggestions={villageSuggestions} onSelect={(v) => { setVillage(v); setVillageFocused(false); }} visible={villageFocused} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Post Office *</Label>
                <Input placeholder="e.g. Sadar Post Office" value={postOffice} onChange={(e) => setPostOffice(e.target.value)} />
              </div>
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold">Police Station *</Label>
                <Input placeholder="e.g. Kotwali" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} onFocus={() => setPoliceFocused(true)} onBlur={() => setTimeout(() => setPoliceFocused(false), 150)} />
                <SuggestionList suggestions={policeSuggestions} onSelect={(v) => { setPoliceStation(v); setPoliceFocused(false); }} visible={policeFocused} />
              </div>
            </div>
          </div>

          <Button className="w-full gradient-teal border-0 text-primary-foreground h-11 text-sm hover:opacity-90 disabled:opacity-40" disabled={!isFormComplete || submitting || loading} onClick={handleSubmit}>
            <FileText className="h-4 w-4 mr-2" />
            {submitting ? "Submitting..." : existingProfile ? "Update & Resubmit for Review" : "Submit for Admin Review"}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OwnerProfile;
