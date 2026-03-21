import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Building2, FileText } from "lucide-react";
import type { ComplaintPriority } from "@/lib/api";
import { profileGrid2, profileSectionTitleSx, profileTextFieldSx, span2, muiNativeSelectTextFieldProps } from "@/components/profile/profileFormConstants";

export type ComplaintPropertyOption = { id: number; title: string };
export type AgainstOption = { userId: number; userName: string };

interface Props {
  properties: ComplaintPropertyOption[];
  propertyId: number;
  onPropertyId: (id: number) => void;
  headlineLabel?: string;
  headline: string;
  onHeadline: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  priority: ComplaintPriority | string;
  onPriority: (v: ComplaintPriority) => void;
  showAgainstSelect?: boolean;
  relatedUserId: number;
  onRelatedUserId: (id: number) => void;
  againstOptions: AgainstOption[];
  againstLoading?: boolean;
  againstNoneValue?: string;
  showDemoAgainstInput?: boolean;
  demoAgainstUser?: string;
  onDemoAgainstUser?: (v: string) => void;
  /** Tenant API requires description */
  descriptionRequired?: boolean;
}

export function RaiseComplaintMuiFields({
  properties,
  propertyId,
  onPropertyId,
  headlineLabel = "Subject",
  headline,
  onHeadline,
  description,
  onDescription,
  priority,
  onPriority,
  showAgainstSelect = false,
  relatedUserId,
  onRelatedUserId,
  againstOptions,
  againstLoading = false,
  againstNoneValue = "__none__",
  showDemoAgainstInput = false,
  demoAgainstUser = "",
  onDemoAgainstUser,
  descriptionRequired = false,
}: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <Building2 style={{ width: 16, height: 16, opacity: 0.85 }} />
          Property
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            select
            label="Property"
            {...muiNativeSelectTextFieldProps}
            value={propertyId ? String(propertyId) : ""}
            onChange={(e) => onPropertyId(e.target.value ? Number(e.target.value) : 0)}
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </TextField>
          {showAgainstSelect && (
            <TextField
              select
              label="Against (optional)"
              {...muiNativeSelectTextFieldProps}
              value={relatedUserId > 0 ? String(relatedUserId) : againstNoneValue}
              onChange={(e) => {
                const v = e.target.value;
                onRelatedUserId(v === againstNoneValue ? 0 : Number(v));
              }}
              disabled={againstLoading || !propertyId}
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            >
              <option value={againstNoneValue}>— None —</option>
              {againstOptions.map((o) => (
                <option key={o.userId} value={o.userId}>
                  {o.userName}
                </option>
              ))}
            </TextField>
          )}
          {showAgainstSelect && propertyId && !againstLoading && againstOptions.length === 0 && (
            <Typography component="p" variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
              No one associated with this property to select.
            </Typography>
          )}
          {showDemoAgainstInput && onDemoAgainstUser && (
            <TextField
              label="Against (optional)"
              value={demoAgainstUser}
              onChange={(e) => onDemoAgainstUser(e.target.value)}
              placeholder="e.g. username"
              variant="outlined"
              size="small"
              sx={{ ...profileTextFieldSx, ...span2 }}
            />
          )}
        </Box>
      </Box>

      <Box>
        <Box component="span" sx={profileSectionTitleSx}>
          <FileText style={{ width: 16, height: 16, opacity: 0.85 }} />
          Complaint details
        </Box>
        <Box sx={profileGrid2}>
          <TextField
            required
            label={headlineLabel}
            value={headline}
            onChange={(e) => onHeadline(e.target.value)}
            placeholder="Brief summary of the issue"
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            required={descriptionRequired}
            label="Description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="Provide details…"
            multiline
            minRows={3}
            variant="outlined"
            size="small"
            sx={{ ...profileTextFieldSx, ...span2 }}
          />
          <TextField
            select
            label="Priority"
            {...muiNativeSelectTextFieldProps}
            value={priority}
            onChange={(e) => onPriority(e.target.value as ComplaintPriority)}
            variant="outlined"
            size="small"
            sx={profileTextFieldSx}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </TextField>
        </Box>
      </Box>
    </Box>
  );
}
