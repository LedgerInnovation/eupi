/**
 * Amount handling shared by EPC069-12 (AT-T002, "EUR" + 1..12n) and
 * EPC024-22 (transaction amount, 1..12n).
 *
 * Both specs bound the amount to the SEPA credit transfer range:
 * at least 0.01 and at most 999999999.99.
 */

const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;

/** Validates a numeric amount string such as "12.3" or "500". */
export function isValidAmountString(value: string): boolean {
  if (!AMOUNT_RE.test(value) || value.length > 12) return false;
  const n = Number(value);
  return n >= 0.01 && n <= 999999999.99;
}

/**
 * Formats a number as a spec-conformant amount string.
 * Uses two decimals, then drops trailing zeros ("12.30" -> "12.3", "12.00" -> "12"),
 * matching the style of the official EPC069-12 examples.
 */
export function formatAmount(value: number | string): string {
  if (typeof value === "string") {
    const v = value.trim();
    if (!isValidAmountString(v)) {
      throw new RangeError(`invalid amount "${value}": must match 1..12n within 0.01..999999999.99`);
    }
    return v;
  }
  if (!Number.isFinite(value)) throw new RangeError(`invalid amount ${value}`);
  const fixed = value.toFixed(2);
  const trimmed = fixed.replace(/\.?0+$/, "");
  if (!isValidAmountString(trimmed)) {
    throw new RangeError(`invalid amount ${value}: must be within 0.01..999999999.99`);
  }
  return trimmed;
}
