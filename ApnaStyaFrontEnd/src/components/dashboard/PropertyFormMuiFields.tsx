import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import type { PropertyRequest } from "@/lib/api";
import { PROPERTY_IMAGE_UPLOAD_MAX_BYTES, PROPERTY_IMAGE_UPLOAD_MAX_FILES } from "@/lib/api";
import { indianStates, getCitiesForState, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { PROPERTY_TYPES, DESCRIPTION_MAX_LENGTH, COMMON_AMENITIES } from "@/utils/propertyConstants";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";
import { Building2, Ruler, MapPin, ImageIcon } from "lucide-react";

type AdminForm = PropertyRequest & { rating?: number | null; reviewCount?: number | null; isFeatured?: boolean };

interface Props {
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  /** Owner uses state **code**; Admin uses state **name**. */
  stateMode: "code" | "name";
  hideLatLong?: boolean;
  /** Rating, review count, featured (admin). */
  showAdminExtras?: boolean;
  disableRatingReview?: boolean;
  /** When set, shows file upload (stored on server). New files on edit replace previously uploaded photos for this listing. */
  uploadedFiles?: File[];
  onUploadedFilesChange?: (files: File[]) => void;
}

export function PropertyFormMuiFields({
  form,
  setForm,
  stateMode,
  hideLatLong = true,
  showAdminExtras = false,
  disableRatingReview = false,
  uploadedFiles = [],
  onUploadedFilesChange,
}: Props) {
  const stateCode =
    stateMode === "code"
      ? form.state
      : indianStates.find((s) => s.name === form.state)?.code ?? "";
  const formCities = stateCode ? getCitiesForState(stateCode) : [];
  const formPincodes = stateCode ? (statePincodeRanges[stateCode]?.samples ?? []) : [];
  const pinInvalid =
    form.pinCode.length === 6 && Boolean(stateCode) && !isPincodeValidForState(form.pinCode, stateCode);

  const setState = (v: string) => {
    if (stateMode === "code") {
      setForm((f) => ({ ...f, state: v, city: "", pinCode: "" }));
    } else {
      setForm((f) => ({ ...f, state: v, city: "", pinCode: "" }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, minHeight: 0 }}>
      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <Building2 style={{ width: 16, height: 16, opacity: 0.85 }} />
          Basic details
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Property title"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required
            label={`Description (${form.description.length} / ${DESCRIPTION_MAX_LENGTH})`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))}
            placeholder="Describe the property"
            multiline
            minRows={3}
            variant="outlined"
            size="small"
            inputProps={{ maxLength: DESCRIPTION_MAX_LENGTH }}
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required
            select
            label="Type"
            {...muiNativeSelectTextFieldProps}
            value={form.propertyType}
            onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </TextField>
          <TextField
            required
            type="number"
            label="Price (₹/month)"
            value={form.price || ""}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : 0 }))}
            placeholder="e.g. 25000"
            inputProps={{ min: 0 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
        </Box>
      </Box>

      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <Ruler style={{ width: 16, height: 16, opacity: 0.85 }} />
          Specifications
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            type="number"
            label="Bedrooms"
            value={form.bedrooms ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : null }))}
            inputProps={{ min: 0 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            type="number"
            label="Bathrooms"
            value={form.bathrooms ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : null }))}
            inputProps={{ min: 0 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            type="number"
            label="Area (sq ft)"
            value={form.area ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value ? Number(e.target.value) : null }))}
            inputProps={{ min: 0 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            select
            label="Furnishing"
            {...muiNativeSelectTextFieldProps}
            value={form.furnishing ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, furnishing: e.target.value || null }))}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="">Not specified</option>
            <option value="FURNISHED">Furnished</option>
            <option value="SEMI_FURNISHED">Semi furnished</option>
            <option value="UNFURNISHED">Unfurnished</option>
          </TextField>
          {showAdminExtras && (
            <>
              <TextField
                type="number"
                label="Rating (0–5)"
                value={form.rating ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value ? Number(e.target.value) : null }))}
                inputProps={{ min: 0, max: 5, step: 0.1 }}
                disabled={disableRatingReview}
                variant="outlined"
                size="small"
                sx={{ ...profileTextFieldSx, ...(disableRatingReview ? { opacity: 0.85 } : {}) }}
              />
              <TextField
                type="number"
                label="Review count"
                value={form.reviewCount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, reviewCount: e.target.value ? Number(e.target.value) : null }))}
                inputProps={{ min: 0 }}
                disabled={disableRatingReview}
                variant="outlined"
                size="small"
                sx={{ ...profileTextFieldSx, ...(disableRatingReview ? { opacity: 0.85 } : {}) }}
              />
            </>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.75 }}>
          Amenities
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {COMMON_AMENITIES.map((a) => {
            const selected = Array.isArray(form.amenities) && form.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    amenities: selected ? (f.amenities ?? []).filter((x) => x !== a) : [...(f.amenities ?? []), a],
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${selected ? "bg-sky-600 text-white border-sky-600 dark:bg-sky-500" : "bg-muted/50 border-slate-200 dark:border-slate-600 hover:bg-muted"}`}
              >
                {a}
              </button>
            );
          })}
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1, alignItems: "center" }}>
          {(form.amenities ?? [])
            .filter((a) => !COMMON_AMENITIES.includes(a))
            .map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {a}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))}
                  className="hover:text-destructive"
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          <input
            type="text"
            placeholder="Add custom (Enter)"
            className="min-w-[140px] flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && !(form.amenities ?? []).includes(v)) setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }));
                (e.target as HTMLInputElement).value = "";
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && !(form.amenities ?? []).includes(v)) {
                setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }));
                e.target.value = "";
              }
            }}
          />
        </Box>
        {showAdminExtras && (
          <FormControlLabel
            sx={{ mt: 1.5 }}
            control={
              <Checkbox
                checked={!!form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                size="small"
              />
            }
            label="Featured listing"
          />
        )}
      </Box>

      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <MapPin style={{ width: 16, height: 16, opacity: 0.85 }} />
          Location
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            label="Street address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required
            select
            label="State"
            {...muiNativeSelectTextFieldProps}
            value={stateMode === "code" ? form.state || "" : form.state || ""}
            onChange={(e) => setState(e.target.value)}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="">{stateMode === "code" ? "Select state" : "Select state"}</option>
            {stateMode === "code"
              ? indianStates.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))
              : indianStates.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
            {stateMode === "name" && form.state && !indianStates.some((s) => s.name === form.state) ? (
              <option value={form.state}>{form.state}</option>
            ) : null}
          </TextField>
          {formCities.length > 0 && stateMode === "code" ? (
            <TextField
              required
              select
              label="City"
              {...muiNativeSelectTextFieldProps}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              variant="outlined"
              size="small"
              sx={profileTextFieldSx}
            >
              <option value="">Select city</option>
              {formCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              label="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Bengaluru"
              variant="outlined"
              size="small"
              sx={profileTextFieldSx}
            />
          )}
          {formPincodes.length > 0 && stateMode === "code" ? (
            <TextField
              required
              select
              label="Pin code"
              {...muiNativeSelectTextFieldProps}
              value={form.pinCode || ""}
              onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value }))}
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            >
              <option value="">Select pin</option>
              {formPincodes.map((pc) => (
                <option key={pc} value={pc}>
                  {pc}
                </option>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              label="Pin code"
              value={form.pinCode}
              onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              placeholder="6 digits"
              inputProps={{ maxLength: 6 }}
              error={pinInvalid}
              helperText={pinInvalid ? "Does not match selected state" : " "}
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            />
          )}
          {!hideLatLong && (
            <>
              <TextField
                type="number"
                label="Latitude"
                value={form.latitude ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : null }))}
                inputProps={{ step: "any" }}
                variant="outlined"
                size="small"
                sx={profileTextFieldSx}
              />
              <TextField
                type="number"
                label="Longitude"
                value={form.longitude ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : null }))}
                inputProps={{ step: "any" }}
                variant="outlined"
                size="small"
                sx={profileTextFieldSx}
              />
            </>
          )}
        </Box>
      </Box>

      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <ImageIcon style={{ width: 16, height: 16, opacity: 0.85 }} />
          Media
        </Box>
        {onUploadedFilesChange ? (
          <Box sx={{ width: "100%", mt: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Upload images (optional) — max {PROPERTY_IMAGE_UPLOAD_MAX_FILES} files, {Math.round(PROPERTY_IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB each (JPEG, PNG, WebP, GIF). On edit,
              choosing new files replaces photos stored on the server for this listing.
            </Typography>
            <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-background px-3 py-2 text-sm font-medium hover:bg-muted dark:border-slate-600">
              <span className="pointer-events-none">Choose files</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => {
                  const list = e.target.files;
                  if (!list?.length) return;
                  const next = [...uploadedFiles];
                  for (let i = 0; i < list.length; i++) {
                    if (next.length >= PROPERTY_IMAGE_UPLOAD_MAX_FILES) break;
                    const f = list.item(i)!;
                    if (f.size > PROPERTY_IMAGE_UPLOAD_MAX_BYTES) continue;
                    next.push(f);
                  }
                  onUploadedFilesChange(next);
                  e.target.value = "";
                }}
              />
            </label>
            {uploadedFiles.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                {uploadedFiles.map((f, idx) => (
                  <span
                    key={`${f.name}-${idx}-${f.size}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-muted/40 px-2 py-1 text-xs dark:border-slate-600"
                  >
                    {f.name.slice(0, 24)}
                    {f.name.length > 24 ? "…" : ""}
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => onUploadedFilesChange(uploadedFiles.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Connect to the live API to upload property photos here.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
