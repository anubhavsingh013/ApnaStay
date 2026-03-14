import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** When true, show month/year dropdowns instead of arrows - useful for DOB to avoid scrolling through many years */
  useMonthYearDropdowns?: boolean;
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

const DEFAULT_FROM_YEAR = 1950;
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

  return (
    <div className={className}>
      {!hideLabel && label && <Label className="mb-1.5 block">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
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
            {...(useMonthYearDropdowns && {
              captionLayout: "dropdown" as const,
              fromYear,
              toYear,
            })}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
