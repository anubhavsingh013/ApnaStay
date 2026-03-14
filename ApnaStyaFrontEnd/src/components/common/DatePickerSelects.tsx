import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Parses "yyyy-MM-dd" to { year, month, day } (1-based month). */
function parseDate(value: string): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const maxDay = getDaysInMonth(y, m);
  if (d > maxDay) return null;
  return { year: y, month: m, day: d };
}

/** Formats to "yyyy-MM-dd". */
function formatDate(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;
const MAX_YEAR = CURRENT_YEAR;

export interface DatePickerSelectsProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
  className?: string;
  /** Hide the optional label above the row */
  hideLabel?: boolean;
}

/**
 * Date picker using Month / Year / Day dropdowns so users can select without scrolling.
 * value/onChange use "yyyy-MM-dd" format.
 */
export function DatePickerSelects({
  value,
  onChange,
  disabled = false,
  maxDate = new Date(),
  minDate = new Date(MIN_YEAR, 0, 1),
  label = "Date",
  className = "",
  hideLabel = false,
}: DatePickerSelectsProps) {
  const parsed = parseDate(value);
  const year = parsed?.year ?? CURRENT_YEAR;
  const month = parsed?.month ?? 1;
  const day = parsed?.day ?? 1;

  const maxYear = maxDate.getFullYear();
  const minYear = minDate.getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const safeDay = day > daysInMonth ? daysInMonth : day;

  const update = (y: number, m: number, d: number) => {
    const str = formatDate(y, m, d);
    const date = new Date(y, m - 1, d);
    if (maxDate && date > maxDate) {
      onChange(formatDate(maxDate.getFullYear(), maxDate.getMonth() + 1, maxDate.getDate()));
      return;
    }
    if (minDate && date < minDate) {
      onChange(formatDate(minDate.getFullYear(), minDate.getMonth() + 1, minDate.getDate()));
      return;
    }
    onChange(str);
  };

  return (
    <div className={className}>
      {!hideLabel && label && <Label className="mb-1.5 block">{label}</Label>}
      <div className="flex flex-wrap gap-2">
        <Select
          value={String(month)}
          onValueChange={(v) => update(year, Number(v), safeDay)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(year)}
          onValueChange={(v) => update(Number(v), month, safeDay)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(safeDay)}
          onValueChange={(v) => update(year, month, Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
