import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signin, verify2faLogin, get2faStatus, setStoredUser, sendPhoneCode, phoneVerifyAndLogin, setJwt } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";

type LoginMethod = "credentials" | "phone";
type PhoneStep = "enter" | "otp";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const from = (location.state as { from?: string; message?: string })?.from;
  const message = (location.state as { from?: string; message?: string })?.message;
  const [method, setMethod] = useState<LoginMethod>("credentials");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");
  const [otp, setOtp] = useState("");

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [temporaryToken, setTemporaryToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (roles: string[]) => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    const r = roles.map(r => r.toLowerCase());
    if (r.some(x => x.includes("admin"))) navigate("/admin");
    else if (r.some(x => x.includes("owner"))) navigate("/owner/dashboard");
    else if (r.some(x => x.includes("broker"))) navigate("/broker/dashboard");
    else navigate("/dashboard");
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await signin({ username, password });
      if ("requires2FA" in res && res.requires2FA && res.temporaryToken) {
        setJwt(res.temporaryToken);
        setTemporaryToken(res.temporaryToken);
        setTwoFactorRequired(true);
        setTwoFactorCode("");
        return;
      }
      const loginRes = res as { username?: string; userName?: string; roles: string[]; jwtToken: string };
      const loginUsername = loginRes.username ?? loginRes.userName ?? "";
      const is2faEnabled = await get2faStatus().then((r) => r.is2faEnabled).catch(() => false);
      if (is2faEnabled) {
        setTemporaryToken(loginRes.jwtToken);
        setTwoFactorRequired(true);
        setTwoFactorCode("");
        return;
      }
      setStoredUser({ username: loginUsername, roles: loginRes.roles });
      setUser({ username: loginUsername, roles: loginRes.roles });
      redirectAfterLogin(loginRes.roles);
    } catch (err: any) {
      const msg = err?.message || "Sign in failed";
      const isLocked = /locked/i.test(msg);
      toast({
        title: isLocked ? "Account locked" : "Sign in failed",
        description: isLocked ? "Contact support to unlock your account." : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6 || !temporaryToken) return;
    setLoading(true);
    try {
      const res = await verify2faLogin(twoFactorCode, temporaryToken);
      setUser({ username: res.username, roles: res.roles });
      setLoading(false);
      redirectAfterLogin(res.roles);
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.message || "Invalid 2FA code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setLoading(true);
    try {
      await sendPhoneCode({ phoneNumber });
      setPhoneStep("otp");
      toast({ title: "OTP Sent", description: `Verification code sent to ${phoneNumber}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) return;
    setLoading(true);
    try {
      const res = await phoneVerifyAndLogin({ phoneNumber, verificationCode: otp });
      setUser({ username: res.username, roles: res.roles });
      redirectAfterLogin(res.roles);
    } catch (err: any) {
      const msg = err?.message || "Verification failed";
      const isLocked = /locked/i.test(msg);
      toast({
        title: isLocked ? "Account locked" : "Verification failed",
        description: isLocked ? "Contact support to unlock your account." : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-stone-100 to-primary/10 flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-stone-200/40 blur-3xl" />
      </div>

      <div className="flex-1 relative flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 border border-stone-200/90 animate-scale-in">
            <div className="flex justify-center">
              <ApnaStayLogo variant="dark" size="large" showSlogan={true} />
            </div>

            {message && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
                {message}
              </div>
            )}

            {twoFactorRequired ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleVerify2FA(); }}>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm text-stone-600">
                    Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app.
                  </p>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={twoFactorCode} onChange={(val) => setTwoFactorCode(val)}>
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
                  disabled={twoFactorCode.length < 6 || loading}
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                  onClick={() => { setTwoFactorRequired(false); setTemporaryToken(""); setTwoFactorCode(""); }}
                >
                  <ArrowLeft className="h-3.5 w-3.5 inline mr-1 align-middle" /> Back to sign in
                </button>
              </form>
            ) : method === "credentials" ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Email / Username</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="text"
                      placeholder="your@email.com"
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-11 pr-12 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" className="rounded border-stone-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-stone-600">Remember me</Label>
                  </div>
                  <Link to="/forgot-password" className="text-sm text-primary font-medium hover:text-primary/80 transition-colors">Forgot password?</Link>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                  disabled={!username || !password || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Sign In
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {phoneStep === "enter" ? (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Phone Number</Label>
                      <div className="relative group">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                      disabled={!phoneNumber || loading}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Phone className="h-7 w-7 text-primary" />
                      </div>
                      <p className="text-sm text-stone-600">
                        Enter the 6-digit code sent to<br />
                        <strong className="text-stone-900">{phoneNumber}</strong>
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
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <button type="button" className="w-full text-sm text-primary font-medium hover:text-primary/80 transition-colors" onClick={() => { setPhoneStep("enter"); setOtp(""); }}>
                      Change phone number
                    </button>
                  </form>
                )}
                <button type="button" className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors py-2" onClick={() => { setMethod("credentials"); setPhoneStep("enter"); setOtp(""); }}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to email login
                </button>
              </div>
            )}

            {!twoFactorRequired && method === "credentials" && (
              <>
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
            )}

            <p className="text-center text-sm text-stone-600 pt-2">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign up free</Link>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-stone-500">
            <Lock className="h-3 w-3" />
            <span>256-bit SSL encrypted • Your data is secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
