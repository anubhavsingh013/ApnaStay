import { useMemo } from "react";
import dayjs from "dayjs";
import TextField from "@mui/material/TextField";
import { ThemeProvider, createTheme } from "@mui/material/styles";

export interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
  className?: string;
  hideLabel?: boolean;
  placeholder?: string;
}

const fieldTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0284c7" },
    background: { default: "#fff", paper: "#fff" },
    text: { primary: "#0f172a", secondary: "#64748b" },
  },
});

function toYMD(s: string): string {
  if (!s?.trim()) return "";
  const d = dayjs(s);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

/**
 * Native `<input type="date">` (MUI TextField) so DOB works inside Radix dialogs:
 * no popper/modal stacking, full scroll/zoom in the browser date UI, reliable clicks.
 */
export function DatePickerInput({
  value,
  onChange: onValueChange,
  disabled = false,
  maxDate,
  minDate,
  label = "Date",
  className = "",
  hideLabel = false,
}: DatePickerInputProps) {
  const minStr = useMemo(() => (minDate ? dayjs(minDate).format("YYYY-MM-DD") : "1900-01-01"), [minDate]);
  const maxStr = useMemo(() => (maxDate ? dayjs(maxDate).format("YYYY-MM-DD") : ""), [maxDate]);
  const ymd = useMemo(() => toYMD(value), [value]);

  return (
    <div className={className}>
      <ThemeProvider theme={fieldTheme}>
        <TextField
          type="date"
          label={hideLabel ? undefined : label}
          value={ymd}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onValueChange(v);
          }}
          disabled={disabled}
          fullWidth
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          slotProps={{
            htmlInput: {
              min: minStr,
              ...(maxStr ? { max: maxStr } : {}),
            } as React.InputHTMLAttributes<HTMLInputElement>,
          }}
          sx={{
            width: "100%",
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              minHeight: 40,
              borderRadius: 1,
              color: "#0f172a",
            },
            "& .MuiOutlinedInput-input": { color: "#0f172a", cursor: "pointer" },
            "& .MuiInputLabel-root": { color: "#64748b", fontSize: "0.75rem" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
          }}
        />
      </ThemeProvider>
    </div>
  );
}
