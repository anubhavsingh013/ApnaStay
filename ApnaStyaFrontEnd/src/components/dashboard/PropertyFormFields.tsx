import type { PropertyRequest } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { indianStates, getCitiesForState, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { PROPERTY_TYPES, DESCRIPTION_MAX_LENGTH, COMMON_AMENITIES } from "@/utils/propertyConstants";

interface PropertyFormFieldsProps {
  form: PropertyRequest;
  setForm: React.Dispatch<React.SetStateAction<PropertyRequest>>;
  /** When true, latitude/longitude fields are not shown (e.g. owner add property). */
  hideLatLong?: boolean;
}

export function PropertyFormFields({ form, setForm, hideLatLong = true }: PropertyFormFieldsProps) {
  const formCities = form.state ? getCitiesForState(form.state) : [];
  const formPincodes = form.state ? (statePincodeRanges[form.state]?.samples ?? []) : [];

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Basic details</p>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Property title" />
          </div>
          <div className="grid gap-2">
            <Label>Description <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">({form.description.length} / {DESCRIPTION_MAX_LENGTH})</span></Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))} placeholder="Describe the property" rows={3} maxLength={DESCRIPTION_MAX_LENGTH} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.propertyType} onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v }))}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Price (₹/month) <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : 0 }))} placeholder="e.g. 25000" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Specifications</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="grid gap-2">
            <Label>Bedrooms</Label>
            <Input type="number" min={0} value={form.bedrooms ?? ""} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
          </div>
          <div className="grid gap-2">
            <Label>Bathrooms</Label>
            <Input type="number" min={0} value={form.bathrooms ?? ""} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
          </div>
          <div className="grid gap-2">
            <Label>Area (sq ft)</Label>
            <Input type="number" min={0} value={form.area ?? ""} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
          </div>
          <div className="grid gap-2">
            <Label>Furnishing</Label>
            <Select value={form.furnishing ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, furnishing: v || null }))}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FURNISHED">Furnished</SelectItem>
                <SelectItem value="SEMI_FURNISHED">Semi Furnished</SelectItem>
                <SelectItem value="UNFURNISHED">Unfurnished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Amenities</Label>
          <p className="text-xs text-muted-foreground">Select or add amenities.</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_AMENITIES.map((a) => {
              const selected = Array.isArray(form.amenities) && form.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    amenities: selected ? (f.amenities ?? []).filter((x) => x !== a) : [...(f.amenities ?? []), a],
                  }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${selected ? "bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500" : "bg-muted/50 border-slate-200 dark:border-slate-700 hover:bg-muted"}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.includes(a)).map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {a}
                <button type="button" onClick={() => setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))} className="hover:text-destructive" aria-label="Remove">×</button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add custom (e.g. Pet friendly)"
              className="flex-1 min-w-[120px] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
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
                if (v && !(form.amenities ?? []).includes(v)) { setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] })); e.target.value = ""; }
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Address</p>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Address <span className="text-destructive">*</span></Label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>State <span className="text-destructive">*</span></Label>
              <Select value={form.state || "_"} onValueChange={(v) => setForm((f) => ({ ...f, state: v === "_" ? "" : v, city: "", pinCode: "" }))}>
                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select state</SelectItem>{indianStates.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>City <span className="text-destructive">*</span></Label>
              {formCities.length > 0 ? (
                <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                  <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent className="max-h-60">{formCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input className="h-9 w-full" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Bengaluru" />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Pin code <span className="text-destructive">*</span></Label>
              {formPincodes.length > 0 ? (
                <Select value={form.pinCode || "_"} onValueChange={(v) => setForm((f) => ({ ...f, pinCode: v === "_" ? "" : v }))}>
                  <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select pin code" /></SelectTrigger>
                  <SelectContent className="max-h-60">{formPincodes.map((pc) => <SelectItem key={pc} value={pc}>{pc}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <div className="space-y-1">
                  <Input
                    className={`h-9 w-full ${form.pinCode.length === 6 && form.state && isPincodeValidForState(form.pinCode, form.state) ? "pr-8" : ""}`}
                    value={form.pinCode}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setForm((f) => ({ ...f, pinCode: v })); }}
                    placeholder="6 digits"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  {form.pinCode.length === 6 && form.state && !isPincodeValidForState(form.pinCode, form.state) && <p className="text-[10px] text-destructive">Pin code does not belong to selected state.</p>}
                </div>
              )}
            </div>
          </div>
          {!hideLatLong && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Latitude</Label><Input type="number" step="any" value={form.latitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" /></div>
              <div className="grid gap-2"><Label>Longitude</Label><Input type="number" step="any" value={form.longitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : null }))} placeholder="—" /></div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground border-b border-border/50 pb-1">Media</p>
        <p className="text-sm text-muted-foreground">Photos are added in the owner/admin dashboard with <strong>Choose files</strong> when the live API is enabled.</p>
      </div>
    </>
  );
}
