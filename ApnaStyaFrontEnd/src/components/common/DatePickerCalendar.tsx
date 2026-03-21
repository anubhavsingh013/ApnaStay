import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerCalendarProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
  className?: string;
  hideLabel?: boolean;
  /** When true, show month/year dropdowns - Gmail-style, good for DOB */
  useMonthYearDropdowns?: boolean;
  /** When true, show Clear and Today buttons in footer */
  showClearAndToday?: boolean;
  /** Display format in trigger, e.g. "MM/dd/yyyy". Omit for long format (PPP). */
  displayFormat?: string;
  /** Placeholder when no date selected */
  placeholder?: string;
  /** Calendar icon position in trigger */
  iconPosition?: "left" | "right";
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

/** DOB-friendly: far past so calendar opens near typical birth year. */
const DEFAULT_FROM_YEAR = 1900;
const DEFAULT_TO_YEAR = new Date().getFullYear();

export function DatePickerCalendar({
  value,
  onChange,
  disabled = false,
  maxDate,
  minDate,
  label = "Date",
  className = "",
  hideLabel = false,
  useMonthYearDropdowns = false,
  showClearAndToday = false,
  displayFormat,
  placeholder = "Pick a date",
  iconPosition = "right",
}: DatePickerCalendarProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseYMD(value);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(toYMD(d));
    setOpen(false);
  };

  const fromYear = minDate ? minDate.getFullYear() : DEFAULT_FROM_YEAR;
  const toYear = maxDate ? maxDate.getFullYear() : DEFAULT_TO_YEAR;
  /** Opens near DOB range (year 2000) when no date selected, else selected date. */
  const defaultMonth = date || new Date(2000, 0);

  const displayValue = date
    ? (displayFormat ? format(date, displayFormat) : format(date, "PPP"))
    : placeholder;

  const today = new Date();
  const canSelectToday =
    (!minDate || today >= minDate) && (!maxDate || today <= maxDate);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange("");
    setOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.preventDefault();
    if (canSelectToday) {
      onChange(toYMD(today));
      setOpen(false);
    }
  };

  return (
    <div className={className}>
      {!hideLabel && label && <Label className="mb-1.5 block">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-normal shadow-sm transition-colors",
              "hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              !date && "text-muted-foreground"
            )}
          >
            {iconPosition === "left" && (
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{displayValue}</span>
            {iconPosition === "right" && (
              <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            captionLayout={useMonthYearDropdowns ? "dropdown" : "buttons"}
            fromYear={fromYear}
            toYear={toYear}
            defaultMonth={defaultMonth}
            initialFocus
            showOutsideDays
            classNames={{
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md ring-2 ring-primary ring-offset-2",
              day_outside:
                "text-muted-foreground opacity-50",
            }}
          />
          {showClearAndToday && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                disabled={!canSelectToday}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
              >
                Today
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
