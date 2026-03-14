import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

/** Formats Date to "yyyy-MM-dd". */
function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Parses "yyyy-MM-dd" to Date. */
function parseYMD(s: string): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Flowbite-style date picker: input with calendar icon on left, opens calendar popover.
 * Shows day grid first (like Flowbite). Uses "yyyy-MM-dd" format.
 * @see https://flowbite.com/docs/components/datepicker/
 */
export function DatePickerInput({
  value,
  onChange,
  disabled = false,
  maxDate,
  minDate,
  label = "Date",
  className = "",
  hideLabel = false,
  placeholder = "Select date",
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseYMD(value);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(toYMD(d));
    setOpen(false);
  };

  const displayValue = date ? format(date, "dd MMM yyyy") : "";

  return (
    <div className={cn("w-full", className)}>
      {!hideLabel && label && <Label className="mb-1.5 block">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-muted-foreground">
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z" />
              </svg>
            </div>
            <input
              type="text"
              readOnly
              disabled={disabled}
              value={displayValue}
              placeholder={placeholder}
              className={cn(
                "block w-full ps-9 pe-3 py-2.5 h-10 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
                !date && "text-muted-foreground"
              )}
              onClick={() => !disabled && setOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-lg" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            captionLayout="dropdown"
            startMonth={minDate ?? new Date(1950, 0, 1)}
            endMonth={maxDate ?? new Date()}
            defaultMonth={date ?? maxDate ?? new Date()}
            hideNavigation
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
