import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { MuiMobileField } from "@/components/profile/MuiMobileField";
import { User } from "lucide-react";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";
import { ProfileLocationMuiSection } from "@/components/profile/shared/ProfileLocationMuiSection";
import type { ProfileLocationFields } from "@/components/profile/shared/profileLocationTypes";

export type TenantProfileFormFields = ProfileLocationFields & {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber: string;
  idNumber: string;
  idType?: string;
  mobile: string;
};

type Props = {
  form: TenantProfileFormFields;
  setForm: React.Dispatch<React.SetStateAction<TenantProfileFormFields>>;
};

export function TenantProfileMuiForm({ form, setForm }: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <User style={{ width: 16, height: 16, opacity: 0.85 }} />
          Personal details
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            label="Full name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="e.g. Sneha Kumar"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required
            select
            label="Gender"
            {...muiNativeSelectTextFieldProps}
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </TextField>
          <Box sx={{ width: "100%", minWidth: 0 }}>
            <DatePickerInput
              label="Date of birth"
              value={form.dateOfBirth}
              onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
              maxDate={new Date()}
            />
          </Box>
          <TextField
            required
            label="Aadhar / ID number"
            value={form.aadharNumber || form.idNumber}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 12);
              setForm((f) => ({ ...f, aadharNumber: d, idNumber: d }));
            }}
            placeholder="12 digits"
            inputProps={{ maxLength: 12 }}
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <Box sx={{ ...span2, width: "100%" }}>
            <MuiMobileField value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} />
          </Box>
        </Box>
      </Box>

      <ProfileLocationMuiSection form={form} setForm={setForm} />
    </Box>
  );
}
