import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { MuiMobileField } from "@/components/profile/MuiMobileField";
import { User, MapPin } from "lucide-react";
import { indianStates, getCitiesForState, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";

export type TenantProfileFormFields = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber: string;
  idNumber: string;
  idType?: string;
  mobile: string;
  stateCode: string;
  state: string;
  city: string;
  pinCode: string;
  address: string;
};

type Props = {
  form: TenantProfileFormFields;
  setForm: React.Dispatch<React.SetStateAction<TenantProfileFormFields>>;
};

export function TenantProfileMuiForm({ form, setForm }: Props) {
  const cities = getCitiesForState(form.stateCode);
  const pinSamples = statePincodeRanges[form.stateCode]?.samples ?? [];
  const pinInvalid =
    Boolean(form.stateCode) && form.pinCode.length === 6 && !isPincodeValidForState(form.pinCode, form.stateCode);

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

      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <MapPin style={{ width: 16, height: 16, opacity: 0.85 }} />
          Address details
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            select
            label="State"
            {...muiNativeSelectTextFieldProps}
            value={form.stateCode || ""}
            onChange={(e) => {
              const code = e.target.value;
              setForm((f) => ({
                ...f,
                stateCode: code,
                state: indianStates.find((s) => s.code === code)?.name ?? "",
                city: "",
                pinCode: "",
              }));
            }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="">Select state</option>
            {indianStates.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </TextField>

          {cities.length > 0 ? (
            <TextField
              required
              select
              label="District / City"
              {...muiNativeSelectTextFieldProps}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              disabled={!form.stateCode}
              variant="outlined"
              size="small"
              sx={profileTextFieldSx}
            >
              <option value="">{form.stateCode ? "Select city" : "Select state first"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              label="District / City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              disabled={!form.stateCode}
              placeholder="e.g. Bangalore"
              variant="outlined"
              size="small"
              sx={profileTextFieldSx}
            />
          )}

          {pinSamples.length > 0 ? (
            <TextField
              required
              select
              label="Pin code"
              {...muiNativeSelectTextFieldProps}
              value={form.pinCode}
              onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value }))}
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            >
              <option value="">Select pin code</option>
              {pinSamples.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </TextField>
          ) : (
            <TextField
              required
              label="Pin code"
              value={form.pinCode}
              onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              placeholder="e.g. 560001"
              inputProps={{ maxLength: 6 }}
              error={pinInvalid}
              helperText={pinInvalid ? "Does not match selected state" : " "}
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            />
          )}

          <TextField
            required
            label="Street address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="House no., street, locality"
            multiline
            minRows={2}
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
        </Box>
      </Box>
    </Box>
  );
}
