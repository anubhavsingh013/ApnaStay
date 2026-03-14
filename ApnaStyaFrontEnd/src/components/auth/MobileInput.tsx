import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+971", label: "🇦🇪 +971" },
  { value: "+61", label: "🇦🇺 +61" },
  { value: "+81", label: "🇯🇵 +81" },
  { value: "+86", label: "🇨🇳 +86" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+65", label: "🇸🇬 +65" },
];

const MOBILE_MAX_LENGTH = 10;

/** Parse stored value "countryCode|mobile" or "+91 9876543210" into { countryCode, mobile } */
export function parseMobileValue(value: string): { countryCode: string; mobile: string } {
  if (!value || !value.trim()) return { countryCode: "+91", mobile: "" };
  const parts = value.split("|");
  if (parts.length >= 2) return { countryCode: parts[0] || "+91", mobile: parts[1].replace(/\D/g, "").slice(0, MOBILE_MAX_LENGTH) };
  const withPlus = value.trim().startsWith("+");
  if (withPlus) {
    const match = value.trim().match(/^(\+\d+)\s*(\d*)$/);
    if (match) return { countryCode: match[1], mobile: match[2].replace(/\D/g, "").slice(0, MOBILE_MAX_LENGTH) };
  }
  const digits = value.replace(/\D/g, "").slice(0, MOBILE_MAX_LENGTH);
  if (digits.length === 10 && !value.includes("+")) return { countryCode: "+91", mobile: digits };
  return { countryCode: "+91", mobile: digits };
}

/** Format for API: "countryCode mobile" e.g. "+91 9876543210" */
export function formatMobileForApi(countryCode: string, mobile: string): string {
  const m = mobile.replace(/\D/g, "").slice(0, MOBILE_MAX_LENGTH);
  return m ? `${countryCode} ${m}` : "";
}

interface MobileInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  /** When true, do not render the label (parent provides it to avoid duplicate "Mobile" field) */
  hideLabel?: boolean;
  /** When true, use Flowbite-style layout: country code + input flush, full width */
  compact?: boolean;
}

/**
 * Flowbite-style phone input with country code dropdown.
 * Full width, same height as other form fields. Aligned like Flowbite's "Phone input country code".
 * @see https://flowbite.com/docs/forms/phone-input/
 */
export function MobileInput({ label = "Mobile", value, onChange, placeholder = "9876543210", required, className = "", id, hideLabel = false, compact = false }: MobileInputProps) {
  const { countryCode, mobile } = parseMobileValue(value);

  const handleCountryChange = (code: string) => {
    const newVal = mobile ? `${code}|${mobile}` : "";
    onChange(newVal);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, MOBILE_MAX_LENGTH);
    onChange(raw ? `${countryCode}|${raw}` : "");
  };

  const displayLabel = (label && label.replace(/\s*\*$/, "").trim()) || "Mobile";
  const showRequired = required !== false;

  const inputBaseClass = "block w-full px-3 py-2.5 h-10 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50";

  if (compact) {
    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {!hideLabel && (
          <Label htmlFor={id}>
            {displayLabel}
            {showRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <div className="flex items-center -space-x-px w-full">
          <Select value={countryCode} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-[88px] shrink-0 h-10 text-sm rounded-l-lg rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            maxLength={MOBILE_MAX_LENGTH}
            placeholder={placeholder}
            value={mobile}
            onChange={handleMobileChange}
            className={`flex-1 min-w-0 rounded-l-none rounded-r-lg ${inputBaseClass}`}
          />
        </div>
        <p className="text-xs text-muted-foreground">{MOBILE_MAX_LENGTH} digits only</p>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {!hideLabel && (
        <Label htmlFor={id}>
          {displayLabel}
          {showRequired && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="flex items-center -space-x-px w-full">
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-[88px] shrink-0 h-10 text-sm rounded-l-lg rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          maxLength={MOBILE_MAX_LENGTH}
          placeholder={placeholder}
          value={mobile}
          onChange={handleMobileChange}
          className={`flex-1 min-w-0 rounded-l-none rounded-r-lg ${inputBaseClass}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{MOBILE_MAX_LENGTH} digits only</p>
    </div>
  );
}
