import { DatePickerInput, type DatePickerInputProps } from "./DatePickerInput";

export type DatePickerSelectsProps = DatePickerInputProps;

/** Same Gmail-style date picker as DatePickerInput (MM/dd/yyyy, dropdowns, Clear/Today). */
export function DatePickerSelects(props: DatePickerSelectsProps) {
  return <DatePickerInput {...props} />;
}
