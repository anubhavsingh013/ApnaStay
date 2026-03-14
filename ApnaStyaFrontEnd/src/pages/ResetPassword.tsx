import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({ title: "Invalid link", description: "This reset link is invalid or expired.", variant: "destructive" });
    }
  }, [token, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || password !== confirmPassword) return;
    setLoading(true);
    try {
      // Backend may expect either the token from query or the full reset link URL; pass token (from ?token=...)
      await resetPassword(token, password);
      setSuccess(true);
      toast({
        title: "Password reset successfully",
        description: "You can now sign in with your new password.",
      });
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err?.message || "Could not reset password. The link may have expired.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const invalidToken = !token;
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
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 border border-stone-200/90">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <ApnaStayLogo variant="dark" size="large" showSlogan={true} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Set new password</h1>
                <p className="text-sm text-stone-600 mt-1">Enter your new password below.</p>
              </div>
            </div>

            {success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="text-stone-600">Password has been reset successfully. Redirecting to sign in...</p>
                <Button className="w-full h-12 rounded-xl shadow-md" asChild>
                  <Link to="/login">Go to sign in</Link>
                </Button>
              </div>
            ) : invalidToken ? (
              <div className="space-y-4 text-center">
                <p className="text-stone-600">This link is invalid or has expired. Request a new reset link from the sign-in page.</p>
                <Button variant="outline" className="w-full h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:border-stone-300" asChild>
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">New password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-11 pr-12 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Confirm password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      className={`pl-11 pr-12 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                        passwordsMatch ? "border-primary/50" : passwordsMismatch ? "border-destructive/50" : ""
                      }`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-primary"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordsMismatch && <p className="text-xs text-destructive">Passwords don&apos;t match</p>}
                  {passwordsMatch && <p className="text-xs text-primary">Passwords match ✓</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  disabled={!password || password !== confirmPassword || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    "Reset password"
                  )}
                </Button>
                <Button variant="ghost" className="w-full text-stone-600 hover:text-stone-900" asChild>
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
