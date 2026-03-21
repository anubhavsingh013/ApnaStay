import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Phone, Eye, EyeOff, Users, Briefcase, ArrowLeft, Sparkles, Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signup, sendPhoneCode, phoneVerifyAndLogin } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/app-toast";
import { useAuth } from "@/contexts/AuthContext";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";

type SignupMethod = "form" | "phone";
type PhoneStep = "enter" | "otp";

const Signup = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [role, setRole] = useState<"tenant" | "owner" | "broker">("tenant");
  const [method, setMethod] = useState<SignupMethod>("form");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phoneOnly, setPhoneOnly] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);

  const roleMap: Record<string, string> = { tenant: "user", owner: "owner", broker: "broker" };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      toastError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await signup({
        username,
        password,
        email: email || undefined,
        role: [roleMap[role]],
      });
      toastSuccess("Account created!", res.message);
      navigate("/login");
    } catch (err: any) {
      toastError("Sign up failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendCode = async () => {
    if (!phoneOnly) return;
    setLoading(true);
    try {
      await sendPhoneCode({ phoneNumber: phoneOnly });
      setPhoneStep("otp");
      toastSuccess("OTP Sent", `Code sent to ${phoneOnly}`);
    } catch (err: any) {
      toastError("Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const res = await phoneVerifyAndLogin({ phoneNumber: phoneOnly, verificationCode: otp });
      setUser({ username: res.username, roles: res.roles });
      toastSuccess("Account created!", `Welcome ${res.username}`);
      navigate("/dashboard");
    } catch (err: any) {
      toastError("Verification failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleItems = [
    { value: "tenant" as const, label: "Tenant", icon: Users, desc: "Find homes" },
    { value: "owner" as const, label: "Owner", icon: User, desc: "List property" },
    { value: "broker" as const, label: "Broker", icon: Briefcase, desc: "Manage deals" },
  ];

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-stone-100 to-primary/10 flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-stone-200/40 blur-3xl" />
      </div>

      <div className="flex-1 relative flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-5 border border-stone-200/90 animate-scale-in">
            <div className="flex justify-center">
              <ApnaStayLogo variant="dark" size="large" showSlogan={true} />
            </div>

            {method === "form" && (
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-stone-100 border border-stone-200">
                {roleItems.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setRole(item.value)}
                    className={`relative flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all duration-300 ${
                      role === item.value
                        ? "bg-white text-primary shadow-sm border border-primary/25 ring-1 ring-primary/10 scale-[1.02]"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 transition-transform duration-300 ${role === item.value ? "scale-110" : ""}`} />
                    <span className="leading-tight">{item.label}</span>
                    <span className="text-[10px] text-stone-500 leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {method === "form" ? (
              <>
                <form className="space-y-3.5" onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Username</Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="johndoe" className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                      <Input type="email" placeholder="your@email.com" className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-11 pr-12 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-primary transition-all"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Confirm Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        className={`pl-11 pr-12 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm ${
                          passwordsMatch ? "border-primary/50" : passwordsMismatch ? "border-destructive/50" : ""
                        }`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-primary transition-all"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordsMismatch && <p className="text-xs text-destructive">Passwords don&apos;t match</p>}
                    {passwordsMatch && <p className="text-xs text-primary">Passwords match ✓</p>}
                  </div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <Checkbox id="terms" className="mt-0.5 rounded border-stone-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer text-stone-600 leading-relaxed">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms</Link>{" "}and{" "}
                      <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                    disabled={!username || !password || password !== confirmPassword || loading}
                  >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create Account
                    </span>
                  )}
                </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-stone-500 uppercase tracking-wider">Or continue with</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-all">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-all" onClick={() => setMethod("phone")}>
                    <Phone className="h-4 w-4 mr-2" /> Phone OTP
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {phoneStep === "enter" ? (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handlePhoneSendCode(); }}>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Phone Number</Label>
                      <div className="relative group">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                          value={phoneOnly}
                          onChange={(e) => setPhoneOnly(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                      disabled={!phoneOnly || loading}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handlePhoneVerify(); }}>
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Phone className="h-7 w-7 text-primary" />
                      </div>
                      <p className="text-sm text-stone-600">
                        Enter the 6-digit code sent to<br />
                        <strong className="text-stone-900">{phoneOnly}</strong>
                      </p>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                              <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border-stone-200 bg-stone-50 text-lg font-semibold text-stone-900 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                      disabled={otp.length < 6 || loading}
                    >
                      {loading ? "Verifying..." : "Verify & Create Account"}
                    </Button>
                    <button type="button" className="w-full text-sm text-primary font-medium hover:text-primary/80 transition-colors" onClick={() => { setPhoneStep("enter"); setOtp(""); }}>
                      Change phone number
                    </button>
                  </form>
                )}
                <button className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors py-2" onClick={() => { setMethod("form"); setPhoneStep("enter"); setOtp(""); }}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to form signup
                </button>
              </div>
            )}

            <p className="text-center text-sm text-stone-600 pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign in</Link>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-stone-500">
            <Shield className="h-3 w-3" />
            <span>256-bit SSL encrypted • Your data is secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
