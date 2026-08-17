/**
 * Turns the request form into an EPC069-12 payload.
 *
 * Everything here is plain TypeScript so it can be exercised without a React
 * Native runtime. The screen owns the form state; this module owns the mapping
 * onto `@eupi/qr` and the validation messages the screen shows.
 */

import {
  EpcQrError,
  decodeEpcQr,
  isValidAmountString,
  isValidIban,
  type EpcQrData,
  type EpcQrIssue,
  encodeEpcQr,
} from "@eupi/qr";

/**
 * EPC069-12 element 10 (structured creditor reference) and element 11
 * (unstructured remittance text) are mutually exclusive, so the form offers
 * one field and a choice of which element it fills.
 */
export type RemittanceKind = "reference" | "text";

/** Beneficiary details, held in local settings rather than in an account. */
export interface Payee {
  name: string;
  iban: string;
  /** Optional for EEA beneficiaries in version 002, which is what we emit. */
  bic: string;
}

export interface RequestForm {
  /** As typed, so "12,30" and " 12.30 " are both accepted. */
  amount: string;
  remittanceKind: RemittanceKind;
  remittance: string;
}

export type BuildRequestResult =
  | { ok: true; payload: string; data: EpcQrData }
  | { ok: false; issues: EpcQrIssue[] };

export const EMPTY_PAYEE: Payee = { name: "", iban: "", bic: "" };

export const EMPTY_FORM: RequestForm = { amount: "", remittanceKind: "text", remittance: "" };

/**
 * Normalises a typed amount into the numeric string EPC069-12 expects.
 *
 * Accepts the decimal comma used across the euro area and strips the spaces
 * that come with copy-and-paste. Group separators are left alone: "1.234,56"
 * and "1,234.56" are ambiguous once both separators are in play, so they are
 * rejected as invalid rather than guessed at.
 */
export function normalizeAmountInput(input: string): string {
  const compact = input.replace(/[\s  ]/g, "");
  return compact.includes(",") && !compact.includes(".") ? compact.replace(",", ".") : compact;
}

/**
 * Builds the payload, then decodes it so the screen can display the values a
 * scanner will actually read rather than the values that were typed.
 *
 * An empty amount is not an error: EPC069-12 keeps element 8 optional so the
 * payer can enter the amount in their own banking app.
 */
export function buildPaymentRequest(payee: Payee, form: RequestForm): BuildRequestResult {
  const issues: EpcQrIssue[] = [];

  const name = payee.name.trim();
  const iban = payee.iban.replace(/\s+/g, "").toUpperCase();
  const bic = payee.bic.replace(/\s+/g, "").toUpperCase();
  if (name === "") {
    issues.push({ element: "name", message: "set the payee name in settings" });
  }
  if (iban === "") {
    issues.push({ element: "iban", message: "set the payee IBAN in settings" });
  } else if (!isValidIban(iban)) {
    issues.push({ element: "iban", message: "the payee IBAN in settings is not valid" });
  }

  // encodeEpcQr throws a RangeError on an unparseable amount before it reports
  // any other problem, so the amount is checked here and kept out of the call.
  const amount = normalizeAmountInput(form.amount);
  const hasAmount = amount !== "";
  if (hasAmount && !isValidAmountString(amount)) {
    issues.push({ element: "amount", message: "amount must be between 0.01 and 999999999.99 euro" });
  }

  const remittance = form.remittance.trim();
  if (issues.length > 0) return { ok: false, issues };

  let remittanceElement: { reference: string } | { text: string } | Record<string, never> = {};
  if (remittance !== "") {
    remittanceElement =
      form.remittanceKind === "reference" ? { reference: remittance } : { text: remittance };
  }

  try {
    const payload = encodeEpcQr({
      name,
      iban,
      ...(bic === "" ? {} : { bic }),
      ...(hasAmount ? { amount } : {}),
      ...remittanceElement,
    });
    return { ok: true, payload, data: decodeEpcQr(payload).data };
  } catch (error) {
    if (error instanceof EpcQrError) return { ok: false, issues: error.issues };
    throw error;
  }
}

/** Groups an IBAN into blocks of four, the presentation format of ISO 13616. */
export function formatIbanForDisplay(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Formats a payload amount for display. The codec drops trailing zeros
 * ("12.30" becomes "12.3"), which is right on the wire and wrong on screen
 * next to a QR code that stands in for an invoice.
 */
export function formatAmountForDisplay(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  const [whole = "0", cents = ""] = value.toFixed(2).split(".");
  return `${whole},${cents}`;
}
