import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComplaintStatus } from "@/lib/api";

export const COMPLAINT_STATUS_OPTIONS: { value: ComplaintStatus | ""; label: string; itemClassName: string }[] = [
  { value: "", label: "All", itemClassName: "text-slate-600 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-800 dark:focus:bg-slate-800 dark:focus:text-slate-200" },
  { value: "OPEN", label: "Open", itemClassName: "text-rose-600 dark:text-rose-400 focus:bg-rose-50 focus:text-rose-800 dark:focus:bg-rose-900/30 dark:focus:text-rose-200" },
  { value: "IN_PROGRESS", label: "In progress", itemClassName: "text-amber-600 dark:text-amber-400 focus:bg-amber-50 focus:text-amber-800 dark:focus:bg-amber-900/30 dark:focus:text-amber-200" },
  { value: "RESOLVED", label: "Resolved", itemClassName: "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 focus:text-emerald-800 dark:focus:bg-emerald-900/30 dark:focus:text-emerald-200" },
  { value: "CLOSED", label: "Closed", itemClassName: "text-slate-500 dark:text-slate-400 focus:bg-slate-100 focus:text-slate-700 dark:focus:bg-slate-800 dark:focus:text-slate-200" },
];

const ALL_VALUE = "__all__";

interface StatusFilterDropdownProps {
  value: ComplaintStatus | "";
  onChange: (value: ComplaintStatus | "") => void;
  placeholder?: string;
  className?: string;
}

export function StatusFilterDropdown({
  value,
  onChange,
  placeholder = "Filter by status",
  className = "w-[130px] max-w-[130px] h-9 text-sm bg-background",
}: StatusFilterDropdownProps) {
  return (
    <Select
      value={value || ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? "" : (v as ComplaintStatus))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {COMPLAINT_STATUS_OPTIONS.map(({ value: v, label, itemClassName }) => (
          <SelectItem key={v || ALL_VALUE} value={v || ALL_VALUE} className={itemClassName}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
