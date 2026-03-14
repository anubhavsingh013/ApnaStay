import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Loader2, Smartphone, X } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { get2faStatus, enable2fa, verify2fa, disable2fa } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface TwoFactorSettingsProps {
  /** Called when 2FA is enabled or disabled so parent can update badge */
  onEnabledChange?: (enabled: boolean) => void;
  /** If provided, use this instead of fetching on mount (avoids duplicate API calls when parent already fetches) */
  initialEnabled?: boolean | null;
  /** When true, hide the "Enable 2FA" button; user must use the 2FA badge to enable */
  hideEnableButton?: boolean;
  /** When true and 2FA is off, auto-start the enable flow (e.g. when opened from badge click) */
  autoStartEnableFlow?: boolean;
  /** Optional: called when user clicks "Not now" in the enable confirmation (e.g. to close dialog) */
  onCancel?: () => void;
}

/** Normalize otpauth URL so Google Authenticator can read it (proper encoding for label per Key URI Format). */
function normalizeOtpauthUrl(url: string): string {
  const trimmed = url.trim().replace(/^["']|["']$/g, "");
  if (!trimmed.startsWith("otpauth://")) return trimmed;
  try {
    // Parse manually: @ in label can break new URL() (e.g. "user@example.com")
    const typeMatch = trimmed.match(/^otpauth:\/\/(totp|hotp)\//i);
    if (!typeMatch) return trimmed;
    const type = typeMatch[1].toLowerCase();
    const rest = trimmed.slice(typeMatch[0].length);
    const qIndex = rest.indexOf("?");
    const label = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
    const query = qIndex >= 0 ? rest.slice(qIndex + 1) : "";
    if (!query.includes("secret=")) return trimmed;
    const decodedLabel = decodeURIComponent(label);
    const [issuerPart, accountPart] = decodedLabel.includes(":") ? decodedLabel.split(":", 2).map((s) => s.trim()) : ["", decodedLabel.trim()];
    const enc = (s: string) => encodeURIComponent(s);
    const newLabel = issuerPart ? `${enc(issuerPart)}:${enc(accountPart)}` : enc(accountPart);
    return `otpauth://${type}/${newLabel}?${query}`;
  } catch {
    return trimmed;
  }
}

export function TwoFactorSettings({ onEnabledChange, initialEnabled, hideEnableButton = false, autoStartEnableFlow = false, onCancel }: TwoFactorSettingsProps = {}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(initialEnabled === undefined);
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [enableStep, setEnableStep] = useState<"idle" | "qr" | "verify">("idle");
  const [enableConfirmViewed, setEnableConfirmViewed] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disableSubmitting, setDisableSubmitting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await get2faStatus();
      setEnabled(res.is2faEnabled);
      if (!res.is2faEnabled) setEnableStep("idle");
      onEnabledChange?.(res.is2faEnabled);
    } catch {
      toast({ title: "Failed to load 2FA status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEnabled === undefined) fetchStatus();
  }, []);

  useEffect(() => {
    if (initialEnabled !== undefined) {
      setEnabled(initialEnabled ?? false);
      setLoading(initialEnabled === null);
    }
  }, [initialEnabled]);


  useEffect(() => {
    if (!otpauthUrl) return;
    const trimmed = otpauthUrl.trim().replace(/^["']|["']$/g, "");
    // Backend may return a direct QR image URL (e.g. api.qrserver.com)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setQrDataUrl(trimmed);
      return;
    }
    // Raw otpauth string: generate QR client-side
    const normalized = normalizeOtpauthUrl(trimmed);
    if (!normalized.startsWith("otpauth://")) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(normalized, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      type: "image/png",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [otpauthUrl]);

  const handleEnableStart = async () => {
    setEnableStep("qr");
    setOtpauthUrl("");
    setQrDataUrl("");
    setVerifyCode("");
    try {
      let url = await enable2fa();
      url = url.trim().replace(/^["']|["']$/g, "");
      setOtpauthUrl(url);
    } catch (err) {
      toast({ title: "Failed to enable 2FA", description: (err as Error)?.message, variant: "destructive" });
      setEnableStep("idle");
    }
  };

  const handleVerifyEnable = async () => {
    if (!/^\d{6}$/.test(verifyCode)) {
      toast({ title: "Enter a 6-digit code", variant: "destructive" });
      return;
    }
    setVerifySubmitting(true);
    try {
      await verify2fa(verifyCode);
      toast({ title: "2FA enabled", description: "Two-factor authentication is now on." });
      setEnabled(true);
      setEnableStep("idle");
      setOtpauthUrl("");
      setVerifyCode("");
      onEnabledChange?.(true);
    } catch (err) {
      toast({ title: "Invalid code", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleDisableConfirm = async () => {
    setDisableSubmitting(true);
    try {
      await disable2fa();
      toast({ title: "2FA disabled" });
      setEnabled(false);
      setDisableDialogOpen(false);
      onEnabledChange?.(false);
    } catch (err) {
      toast({ title: "Failed to disable 2FA", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setDisableSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading security settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-base font-semibold text-foreground">Two-Factor Authentication (2FA)</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Adds an extra layer of security by requiring a code from your authenticator app when signing in. Scan the QR code via Google Authenticator to enable 2FA.
      </p>

      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
            <ShieldCheck className="h-4 w-4" /> 2FA is enabled
          </div>
          <Button variant="outline" size="sm" className="border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDisableDialogOpen(true)}>
            <ShieldOff className="h-4 w-4 mr-1.5" /> Disable 2FA
          </Button>
        </div>
      ) : enableStep === "idle" ? (
        autoStartEnableFlow && !enableConfirmViewed ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Scan the QR code via Google Authenticator to enable 2FA.
            </p>
            <p className="text-sm font-medium text-foreground">Would you like to enable two-factor authentication?</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => { setEnableConfirmViewed(true); handleEnableStart(); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-4 py-2 text-sm font-medium hover:bg-blue-500/20 dark:hover:bg-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                Enable 2FA
              </button>
              <button
                type="button"
                onClick={() => onCancel?.()}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/50 bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-500/20 dark:hover:bg-slate-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : autoStartEnableFlow && enableConfirmViewed ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing 2FA setup…
          </div>
        ) : hideEnableButton ? (
          <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 px-3 py-2">
            2FA is off. Click the 2FA badge above to turn on.
          </p>
        ) : (
          <Button size="sm" onClick={handleEnableStart}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Enable 2FA
          </Button>
        )
      ) : (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Scan the QR code with Google Authenticator, then enter the 6-digit code below.</p>
          {qrDataUrl && (
            <div className="flex justify-center p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <img src={qrDataUrl} alt="Scan with Google Authenticator or any TOTP app" className="w-[240px] h-[240px]" />
            </div>
          )}
          {otpauthUrl && !qrDataUrl && (
            <p className="text-xs text-muted-foreground break-all font-mono bg-muted/50 p-2 rounded">Add this URL manually: {otpauthUrl}</p>
          )}
          <div className="space-y-2">
            <Label className="text-sm">Verification code</Label>
            <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
              <InputOTPGroup className="justify-center">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleVerifyEnable} disabled={verifyCode.length !== 6 || verifySubmitting}>
              {verifySubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Verify and enable
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEnableStep("idle"); setOtpauthUrl(""); setVerifyCode(""); }} disabled={verifySubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable 2FA</DialogTitle>
            <DialogDescription>Are you sure you want to turn off two-factor authentication? Your account will be less secure.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)} disabled={disableSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisableConfirm} disabled={disableSubmitting}>
              {disableSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
