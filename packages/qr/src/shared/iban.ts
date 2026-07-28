/**
 * IBAN validation per ISO 13616: structure, country-specific length, mod-97 check digits.
 */

/** Registered IBAN lengths per country code (ISO 13616 IBAN registry). */
export const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BI: 27, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DJ: 27,
  DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27,
  GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28,
  IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22,
  MK: 19, MN: 20, MR: 27, MT: 31, MU: 30, NI: 28, NL: 18, NO: 15, OM: 23,
  PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24,
  SC: 31, SD: 18, SE: 24, SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28,
  TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

/** Uppercases and strips all whitespace. */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

function mod97(digits: string): number {
  let rem = 0;
  for (let i = 0; i < digits.length; i++) {
    rem = (rem * 10 + (digits.charCodeAt(i) - 48)) % 97;
  }
  return rem;
}

/** Letters map to 10..35 per ISO 7064 / ISO 13616. */
function toNumericForm(rearranged: string): string {
  let out = "";
  for (let i = 0; i < rearranged.length; i++) {
    const c = rearranged.charCodeAt(i);
    out += c >= 65 ? String(c - 55) : rearranged[i];
  }
  return out;
}

/**
 * Validates structure, country length (when the country is in the registry)
 * and the mod-97 check digits. Accepts input with spaces in any case.
 */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) return false;
  // The country must be in the IBAN registry: an unregistered prefix with
  // valid check digits (e.g. "ZZ93...") is not a payable account.
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected === undefined || iban.length !== expected) return false;
  return mod97(toNumericForm(iban.slice(4) + iban.slice(0, 4))) === 1;
}

/**
 * IBAN country prefixes of SEPA scheme countries outside the EEA, per the
 * EPC list of SEPA scheme countries (EPC409-09). EPC069-12 keeps the BIC
 * mandatory for transactions involving SCT scheme participants from non-EEA
 * countries, so version 002 payloads paying into these still need one.
 *
 * Guernsey, Jersey and the Isle of Man have no IBAN prefixes of their own:
 * their accounts use GB, which is already listed.
 */
export const NON_EEA_SEPA_COUNTRIES: ReadonlySet<string> = new Set([
  "AD", "AL", "CH", "GB", "GI", "MC", "MD", "ME", "MK", "RS", "SM", "VA",
]);

/** True when the IBAN belongs to a SEPA country outside the EEA. */
export function isNonEeaSepaIban(input: string): boolean {
  return NON_EEA_SEPA_COUNTRIES.has(normalizeIban(input).slice(0, 2));
}

/**
 * Validates an ISO 11649 structured creditor reference ("RF" + 2 check digits
 * + up to 21 alphanumeric characters).
 */
export function isValidRfReference(input: string): boolean {
  const ref = input.replace(/\s+/g, "").toUpperCase();
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(ref)) return false;
  return mod97(toNumericForm(ref.slice(4) + ref.slice(0, 4))) === 1;
}
