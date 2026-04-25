import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Pencil, Trash2, UserPen, UserRound } from "lucide-react";
import { deleteProfilePhoto, resolveApiMediaUrl, uploadProfilePhoto } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actionBtnBase =
  "box-border inline-flex h-9 min-h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";

const editPhotoClass = `${actionBtnBase} border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:border-slate-400 focus-visible:ring-slate-400/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`;

const removePhotoClass = `${actionBtnBase} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 focus-visible:ring-red-400/40 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60`;

const updateProfileClass = `${actionBtnBase} border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:border-violet-400 focus-visible:ring-violet-400/50 dark:border-violet-700 dark:bg-violet-950/45 dark:text-violet-200 dark:hover:bg-violet-900/50`;

/** Same styling as update control; keeps older references / partial bundles from throwing. */
const PROFILE_ACTION_BUTTON_CLASS = updateProfileClass;

function initialsFrom(name: string | undefined, username: string | undefined): string {
  const n = (name ?? "").trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  const u = (username ?? "").trim();
  if (u.length >= 2) return u.slice(0, 2).toUpperCase();
  if (u.length === 1) return u.toUpperCase();
  return "?";
}

type Props = {
  userId: number | null | undefined;
  profilePictureUrl?: string | null;
  displayName?: string;
  username?: string;
  /** When true, photo actions show demo prompt instead of calling API. */
  demoMode?: boolean;
  onDemoAction?: () => void;
  editable?: boolean;
  /** Refetch profile (or merge state) after upload/delete. */
  onMetaUpdated?: () => void;
  /** Opens profile details editor (e.g. tenant dashboard dialog). */
  onUpdateProfile?: () => void;
  updateProfileDisabled?: boolean;
};

export function ProfilePhotoSection({
  userId,
  profilePictureUrl,
  displayName,
  username,
  demoMode,
  onDemoAction,
  editable = true,
  onMetaUpdated,
  onUpdateProfile,
  updateProfileDisabled = false,
}: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [imgBroken, setImgBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!profilePictureUrl) setCacheBust(0);
  }, [profilePictureUrl]);

  useEffect(() => {
    setImgBroken(false);
  }, [profilePictureUrl, userId, cacheBust]);

  const imageSrc = useMemo(() => {
    const q = cacheBust ? `?v=${cacheBust}` : "";
    if (profilePictureUrl) return resolveApiMediaUrl(profilePictureUrl) + q;
    if (userId != null && cacheBust) return resolveApiMediaUrl(`/api/profile/photo/${userId}`) + q;
    return null;
  }, [profilePictureUrl, userId, cacheBust]);

  const showPhoto = Boolean(imageSrc) && !imgBroken;
  const initials = initialsFrom(displayName, username);
  const showRemove = Boolean((profilePictureUrl || cacheBust) && !demoMode);
  const showUpdate = typeof onUpdateProfile === "function";
  const actionCount = (editable ? 1 : 0) + (editable && showRemove ? 1 : 0) + (showUpdate ? 1 : 0);
  const actionGridCols =
    actionCount <= 1
      ? "grid-cols-1"
      : actionCount === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-3";

  const runDemoGuard = () => {
    if (demoMode) {
      onDemoAction?.();
      return true;
    }
    return false;
  };

  const handlePick = () => {
    if (runDemoGuard()) return;
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || runDemoGuard()) return;
    setBusy(true);
    try {
      await uploadProfilePhoto(file);
      setCacheBust(Date.now());
      toastSuccess("Profile photo updated");
      onMetaUpdated?.();
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Try a JPEG, PNG, WebP, or GIF under 7 MB.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (runDemoGuard()) return;
    setRemoveConfirmOpen(false);
    setBusy(true);
    try {
      await deleteProfilePhoto();
      setCacheBust(0);
      toastSuccess("Profile photo removed");
      onMetaUpdated?.();
    } catch (err) {
      toastError("Could not remove photo", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />

      <button
        type="button"
        onClick={() => showPhoto && setViewerOpen(true)}
        disabled={!showPhoto}
        className="relative shrink-0 mx-auto sm:mx-0 rounded-full p-0.5 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-90"
        aria-label={showPhoto ? "View profile photo" : "Profile photo placeholder"}
      >
        <div className="h-36 w-36 sm:h-44 sm:w-44 rounded-full bg-card border-4 border-background overflow-hidden flex items-center justify-center shadow-xl ring-2 ring-white/70 dark:ring-slate-700/60">
          {showPhoto ? (
            <img
              src={imageSrc!}
              alt=""
              className="h-full w-full object-cover object-top"
              decoding="async"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground tracking-tight">{initials}</span>
          )}
        </div>
        {editable && !demoMode && (
          <span
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white shadow-md border-2 border-background pointer-events-none"
            aria-hidden
          >
            <Camera className="h-4 w-4" />
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile photo</p>
        {(editable || showUpdate) && (
          <div
            className={cn(
              "grid w-full max-w-md gap-1.5 sm:gap-2 mx-auto sm:mx-0",
              actionGridCols,
            )}
          >
            {editable ? (
              <button
                type="button"
                disabled={busy}
                onClick={handlePick}
                className={editPhotoClass}
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Edit
              </button>
            ) : null}
            {editable && showRemove ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemoveConfirmOpen(true)}
                className={removePhotoClass}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Remove
              </button>
            ) : null}
            {showUpdate ? (
              <button
                type="button"
                data-demo-allow
                disabled={updateProfileDisabled}
                onClick={() => onUpdateProfile?.()}
                className={cn(PROFILE_ACTION_BUTTON_CLASS, "whitespace-nowrap")}
              >
                <UserPen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Update profile
              </button>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-lg [&>button]:text-white [&>button]:opacity-90">
          <div className="relative rounded-2xl overflow-hidden bg-black/90 ring-1 ring-white/10">
            {imageSrc && (
              <img src={imageSrc} alt="Profile" className="w-full max-h-[80vh] object-contain" />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center gap-2 text-white/90 text-sm">
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayName || username || "Profile"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Remove profile photo?</h3>
            <p className="text-sm text-muted-foreground">
              Do you want to remove the photo?
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRemoveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleRemove}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
