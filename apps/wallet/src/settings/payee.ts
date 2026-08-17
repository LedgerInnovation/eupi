/**
 * Serialisation of the local payee settings.
 *
 * The wallet has no accounts and no backend, so the beneficiary details live in
 * on-device storage and nowhere else. Parsing is defensive because the stored
 * value is only as trustworthy as the last version of the app that wrote it.
 */

import { EMPTY_PAYEE, type Payee } from "../epc/request";

/** Reads a stored payee, falling back to empty fields on anything unexpected. */
export function parsePayee(stored: string | null): Payee {
  if (stored === null) return EMPTY_PAYEE;

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return EMPTY_PAYEE;
  }
  if (typeof value !== "object" || value === null) return EMPTY_PAYEE;

  const record = value as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : "",
    iban: typeof record.iban === "string" ? record.iban : "",
    bic: typeof record.bic === "string" ? record.bic : "",
  };
}

export function serializePayee(payee: Payee): string {
  return JSON.stringify({ name: payee.name, iban: payee.iban, bic: payee.bic });
}
