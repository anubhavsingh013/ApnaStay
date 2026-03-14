import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { forgotPassword } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists for this email, you’ll receive a password reset link.",
      });
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err?.message || "Could not send reset link. Try again.",
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
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 border border-stone-200/90">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <ApnaStayLogo variant="dark" size="large" showSlogan={true} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Forgot password?</h1>
                <p className="text-sm text-stone-600 mt-1">
                  {sent ? "We’ve sent you a link to reset your password." : "Enter your email and we’ll send you a reset link."}
                </p>
              </div>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <Mail className="h-10 w-10 text-primary mx-auto mb-2" />
                  <p className="text-sm text-stone-600">Check <strong className="text-stone-900">{email}</strong> for the reset link.</p>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:border-stone-300" asChild>
                  <Link to="/login"><ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send reset link
                    </span>
                  )}
                </Button>
                <Button variant="ghost" className="w-full text-stone-600 hover:text-stone-900" asChild>
                  <Link to="/login"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to sign in</Link>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
