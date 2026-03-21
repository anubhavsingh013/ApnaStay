function nodeIsMuiPickerOverlay(node: EventTarget | null): boolean {
  const el = node as HTMLElement | null;
  if (!el || typeof el !== "object") return false;
  if (el.nodeType !== 1) return false;
  if (el.classList?.contains("MuiPopper-root")) return true;
  if (el.classList?.contains("MuiModal-root")) return true;
  if (el.classList?.contains("MuiDialog-root")) return true;
  return Boolean(el.closest?.(".MuiPopper-root, .MuiModal-root, .MuiDialog-container"));
}

/**
 * Radix Dialog closes on outside interaction. MUI DatePicker renders in a portal, so those
 * clicks must not dismiss the profile dialog.
 */
export function shouldPreventDialogCloseForMuiPicker(
  target: EventTarget | null,
  nativeEvent?: Event | null,
): boolean {
  if (nodeIsMuiPickerOverlay(target)) return true;
  const ev = nativeEvent ?? (target as unknown as Event);
  const path = typeof ev?.composedPath === "function" ? ev.composedPath() : [];
  for (const n of path) {
    if (nodeIsMuiPickerOverlay(n)) return true;
  }
  return false;
}
