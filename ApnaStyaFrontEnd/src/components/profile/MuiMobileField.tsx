import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormHelperText from "@mui/material/FormHelperText";
import { parseMobileValue } from "@/components/auth/MobileInput";

const COUNTRY_CODES: { value: string; label: string }[] = [
  { value: "+91", label: "+91 IN" },
  { value: "+1", label: "+1 US" },
  { value: "+44", label: "+44 UK" },
  { value: "+971", label: "+971 AE" },
  { value: "+61", label: "+61 AU" },
  { value: "+81", label: "+81 JP" },
  { value: "+86", label: "+86 CN" },
  { value: "+49", label: "+49 DE" },
  { value: "+33", label: "+33 FR" },
  { value: "+65", label: "+65 SG" },
];

const MOBILE_MAX = 10;

type Props = {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
};

/** Outlined-style phone row aligned with MUI TextField small (40px). */
export function MuiMobileField({ value, onChange, required = true, disabled }: Props) {
  const { countryCode, mobile } = parseMobileValue(value);

  const setPair = (cc: string, m: string) => {
    const digits = m.replace(/\D/g, "").slice(0, MOBILE_MAX);
    if (digits) onChange(`${cc}|${digits}`);
    else onChange("");
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="body2"
        component="label"
        sx={{
          display: "block",
          mb: 0.75,
          color: "text.secondary",
          fontSize: "0.75rem",
          lineHeight: 1.2,
        }}
      >
        Mobile
        {required && (
          <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>
            *
          </Box>
        )}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          width: "100%",
          minHeight: 40,
          borderRadius: 1,
          border: "1px solid",
          borderColor: (t) => (t.palette.mode === "dark" ? "grey.600" : "rgba(0, 0, 0, 0.23)"),
          overflow: "hidden",
          bgcolor: (t) => (t.palette.mode === "dark" ? "grey.900" : "#fff"),
          transition: "border-color 0.2s",
          "&:hover": {
            borderColor: "text.primary",
          },
          "&:focus-within": {
            borderWidth: "2px",
            borderColor: "primary.main",
            margin: "-1px",
          },
        }}
      >
        <Box
          component="select"
          disabled={disabled}
          value={countryCode}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPair(e.target.value, mobile)}
          sx={{
            border: 0,
            m: 0,
            py: 1,
            pl: 1.5,
            pr: 1,
            minWidth: 104,
            maxWidth: 120,
            flexShrink: 0,
            fontSize: "0.875rem",
            fontFamily: "inherit",
            bgcolor: (t) => (t.palette.mode === "dark" ? "grey.800" : "grey.50"),
            color: "text.primary",
            cursor: disabled ? "default" : "pointer",
            outline: "none",
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Box>
        <Box
          component="input"
          type="tel"
          inputMode="numeric"
          placeholder="9876543210"
          disabled={disabled}
          maxLength={MOBILE_MAX}
          value={mobile}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPair(countryCode, e.target.value)}
          sx={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: "none",
            px: 1.75,
            py: 1,
            fontSize: "0.875rem",
            fontFamily: "inherit",
            bgcolor: "transparent",
            color: "text.primary",
            "&::placeholder": { color: "text.disabled", opacity: 1 },
          }}
        />
      </Box>
      <FormHelperText sx={{ mx: 1.75, mt: 0.5 }}>Enter 10 digits (no spaces)</FormHelperText>
    </Box>
  );
}
