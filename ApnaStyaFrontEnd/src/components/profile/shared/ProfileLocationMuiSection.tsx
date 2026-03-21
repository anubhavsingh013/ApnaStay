import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { MapPin } from "lucide-react";
import { indianStates, statePincodeRanges, isPincodeValidForState, getCitiesForState } from "@/constants/indianStates";
import {
  profileGrid2,
  profileSectionTitleSx,
  profileTextFieldSx,
  span2,
  muiNativeSelectTextFieldProps,
} from "@/components/profile/profileFormConstants";
import type { ProfileLocationFields } from "./profileLocationTypes";

type Props<T extends ProfileLocationFields> = {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
};

/**
 * State | City | District | Pin code in a 2×2 grid; full-width village / street / house below.
 */
export function ProfileLocationMuiSection<T extends ProfileLocationFields>({ form, setForm }: Props<T>) {
  const stateRow = indianStates.find((s) => s.code === form.state);
  const districts = stateRow?.districts ?? [];
  const cities = getCitiesForState(form.state);
  const pinSamples = statePincodeRanges[form.state]?.samples ?? [];
  const pinInvalid =
    Boolean(form.state) && form.pinCode.length === 6 && !isPincodeValidForState(form.pinCode, form.state);

  const patchLoc = (partial: Partial<ProfileLocationFields>) => {
    setForm((f) => ({ ...f, ...partial }) as T);
  };

  return (
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
          onChange={(e) => patchLoc({ state: e.target.value, city: "", district: "", pinCode: "" })}
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
            label="City"
            {...muiNativeSelectTextFieldProps}
            value={form.city}
            onChange={(e) => patchLoc({ city: e.target.value })}
            disabled={!form.state}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="">{form.state ? "Select city" : "Select state first"}</option>
            {cities.map((c) => (
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
            onChange={(e) => patchLoc({ city: e.target.value })}
            disabled={!form.state}
            placeholder="e.g. Bengaluru"
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
        )}

        <TextField
          required
          select
          label="District"
          {...muiNativeSelectTextFieldProps}
          value={form.district}
          onChange={(e) => patchLoc({ district: e.target.value })}
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
            value={form.pinCode}
            onChange={(e) => patchLoc({ pinCode: e.target.value })}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
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
            onChange={(e) => patchLoc({ pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            placeholder="e.g. 560001"
            inputProps={{ maxLength: 6 }}
            error={pinInvalid}
            helperText={pinInvalid ? "Does not match selected state" : " "}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          />
        )}

        <TextField
          required
          label="Village / street / house no."
          value={form.address}
          onChange={(e) => patchLoc({ address: e.target.value })}
          placeholder="e.g. H.No. 42, Gandhi Nagar, near bus stand"
          multiline
          minRows={2}
          variant="outlined"
          size="small"
          sx={{ ...profileTextFieldSx, ...span2 }}
        />
      </Box>
    </Box>
  );
}
