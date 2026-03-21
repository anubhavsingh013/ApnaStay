import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { MuiMobileField } from "@/components/profile/MuiMobileField";
import { User, MapPin } from "lucide-react";
import { indianStates, statePincodeRanges, isPincodeValidForState } from "@/constants/indianStates";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";

export type OwnerProfileFormFields = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  aadharNumber: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
  pincode: string;
  village: string;
  postOffice: string;
  policeStation: string;
};

type Props = {
  form: OwnerProfileFormFields;
  setForm: React.Dispatch<React.SetStateAction<OwnerProfileFormFields>>;
};

export function OwnerProfileMuiForm({ form, setForm }: Props) {
  const stateRow = indianStates.find((s) => s.code === form.state);
  const districts = stateRow?.districts ?? [];
  const pinSamples = statePincodeRanges[form.state]?.samples ?? [];
  const pinInvalid =
    Boolean(form.state) && form.pincode.length === 6 && !isPincodeValidForState(form.pincode, form.state);

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
            placeholder="e.g. Rajesh Kumar"
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
            label="Aadhar No"
            value={form.aadharNumber}
            onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
            placeholder="12 digits"
            inputProps={{ maxLength: 12 }}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            required
            type="email"
            label="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="name@email.com"
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
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
            value={form.state || ""}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, district: "", pincode: "" }))}
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
          <TextField
            required
            select
            label="District"
            {...muiNativeSelectTextFieldProps}
            value={form.district}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            disabled={!form.state}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="">{form.state ? "Select district" : "Select state first"}</option>
            {districts.map((d) => (
              <option key={d.code} value={d.name}>
                {d.name}
              </option>
            ))}
          </TextField>
          {pinSamples.length > 0 ? (
            <TextField
              required
              select
              label="Pin code"
              {...muiNativeSelectTextFieldProps}
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
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
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
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
            label="Village / Town"
            value={form.village}
            onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}
            placeholder="e.g. Gandhi Nagar"
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            required
            label="Post office"
            value={form.postOffice}
            onChange={(e) => setForm((f) => ({ ...f, postOffice: e.target.value }))}
            placeholder="e.g. Sadar Post Office"
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
          <TextField
            required
            label="Police station"
            value={form.policeStation}
            onChange={(e) => setForm((f) => ({ ...f, policeStation: e.target.value }))}
            placeholder="e.g. Kotwali"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
        </Box>
      </Box>
    </Box>
  );
}
