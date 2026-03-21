import type { SxProps, Theme } from "@mui/material/styles";

/** Uniform MUI TextField sizing — matches mobile row height (40px). */
export const profileTextFieldSx: SxProps<Theme> = {
  width: "100%",
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    minHeight: 40,
    borderRadius: 1,
    bgcolor: (t) => (t.palette.mode === "dark" ? "grey.900" : "#fff"),
  },
  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
};

export const profileSectionTitleSx: SxProps<Theme> = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "text.secondary",
  mb: 2,
  pb: 1,
  borderBottom: "1px solid",
  borderColor: "divider",
  display: "flex",
  alignItems: "center",
  gap: 1,
};

export const profileGrid2: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 2,
  width: "100%",
  alignItems: "start",
};

export const span2: SxProps<Theme> = { gridColumn: { xs: "1", sm: "1 / -1" } };

/**
 * MUI TextField + native select: empty value still shows the first option’s text,
 * but the outlined label stays inside the field → overlap and a broken top border notch.
 */
export const muiNativeSelectTextFieldProps = {
  InputLabelProps: { shrink: true },
  SelectProps: { native: true, displayEmpty: true },
} as const;
