import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { MuiMobileField } from "@/components/profile/MuiMobileField";
import { User } from "lucide-react";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";
import { ProfileLocationMuiSection } from "@/components/profile/shared/ProfileLocationMuiSection";
import type { ProfileLocationFields } from "@/components/profile/shared/profileLocationTypes";

export type BrokerProfileFormFields = ProfileLocationFields & {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber: string;
  mobile: string;
  firmName: string;
  licenseNumber: string;
};

type Props = {
  form: BrokerProfileFormFields;
  setForm: React.Dispatch<React.SetStateAction<BrokerProfileFormFields>>;
};

export function BrokerProfileMuiForm({ form, setForm }: Props) {
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
            placeholder="Your full name"
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
            label="Aadhar number"
            value={form.aadharNumber}
            onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
            placeholder="12 digits"
            inputProps={{ maxLength: 12 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <Box sx={{ ...span2, width: "100%" }}>
            <MuiMobileField value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} />
          </Box>
          <TextField
            required
            label="Firm name"
            value={form.firmName}
            onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))}
            placeholder="Your firm / company name"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required
            label="License number"
            value={form.licenseNumber}
            onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
            placeholder="RERA / license number"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
        </Box>
      </Box>

      <ProfileLocationMuiSection form={form} setForm={setForm} />
    </Box>
  );
}
