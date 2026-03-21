/**
 * Shared address/location slice for Owner, Broker, and Tenant profile forms.
 * Mandatory: state (code), city, district, pinCode, address (village / street / house).
 */
export type ProfileLocationFields = {
  state: string;
  city: string;
  district: string;
  pinCode: string;
  /** Village, street, house no., landmark — single line stored as profile `address` */
  address: string;
};

export const emptyProfileLocationFields = (): ProfileLocationFields => ({
  state: "",
  city: "",
  district: "",
  pinCode: "",
  address: "",
});

/** True when mandatory location fields are filled (pin must be 6 digits). */
export function isProfileLocationComplete(loc: ProfileLocationFields): boolean {
  return (
    Boolean(loc.state?.trim()) &&
    Boolean(loc.city?.trim()) &&
    Boolean(loc.district?.trim()) &&
    loc.pinCode?.trim().length === 6 &&
    Boolean(loc.address?.trim())
  );
}
