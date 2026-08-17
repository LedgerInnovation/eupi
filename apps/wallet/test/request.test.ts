import { describe, expect, it } from "vitest";
import { decodeEpcQr } from "@eupi/qr";

import {
  EMPTY_FORM,
  buildPaymentRequest,
  formatAmountForDisplay,
  formatIbanForDisplay,
  normalizeAmountInput,
  type Payee,
} from "../src/epc/request";

const payee: Payee = {
  name: "Wikimedia Foerdergesellschaft",
  iban: "DE33 1002 0500 0001 1947 00",
  bic: "",
};

describe("normalizeAmountInput", () => {
  it("accepts the decimal comma and strips spaces", () => {
    expect(normalizeAmountInput(" 13,05 ")).toBe("13.05");
    expect(normalizeAmountInput("13.05")).toBe("13.05");
    expect(normalizeAmountInput("1 000")).toBe("1000");
  });

  it("leaves an ambiguous pair of separators alone so it is rejected downstream", () => {
    expect(normalizeAmountInput("1.234,56")).toBe("1.234,56");
    expect(normalizeAmountInput("1,234.56")).toBe("1,234.56");
  });
});

describe("buildPaymentRequest", () => {
  it("builds a payload whose decoded values match the form", () => {
    const result = buildPaymentRequest(payee, {
      amount: "13,05",
      remittanceKind: "text",
      remittance: "Spende fuer Wikipedia",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.iban).toBe("DE33100205000001194700");
    expect(result.data.amount).toBe("13.05");
    expect(result.data.text).toBe("Spende fuer Wikipedia");
    expect(result.data.reference).toBeUndefined();
    expect(result.data.version).toBe("002");
    expect(result.data.charset).toBe(1);

    // A payload that decodes in strict mode is one a conformant scanner accepts.
    expect(decodeEpcQr(result.payload).issues).toEqual([]);
  });

  it("fills the structured reference element instead of the text element", () => {
    const result = buildPaymentRequest(payee, {
      amount: "10",
      remittanceKind: "reference",
      remittance: "RF18539007547034",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reference).toBe("RF18539007547034");
    expect(result.data.text).toBeUndefined();
  });

  it("omits the amount so the payer can enter it", () => {
    const result = buildPaymentRequest(payee, { ...EMPTY_FORM, remittance: "Donation" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.amount).toBeUndefined();
    expect(result.data.text).toBe("Donation");
  });

  it("carries the BIC when settings hold one", () => {
    const result = buildPaymentRequest({ ...payee, bic: "bfswde33mue" }, EMPTY_FORM);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bic).toBe("BFSWDE33MUE");
  });

  it("reports an amount outside the SEPA range instead of throwing", () => {
    const result = buildPaymentRequest(payee, { ...EMPTY_FORM, amount: "0" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.element)).toContain("amount");
  });

  it("reports an amount that is not a number instead of throwing", () => {
    const result = buildPaymentRequest(payee, { ...EMPTY_FORM, amount: "1.234,56" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.element)).toContain("amount");
  });

  it("reports missing and invalid settings", () => {
    const empty = buildPaymentRequest({ name: "", iban: "", bic: "" }, EMPTY_FORM);
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.issues.map((issue) => issue.element)).toEqual(["name", "iban"]);

    const wrongCheckDigits = buildPaymentRequest({ ...payee, iban: "DE34100205000001194700" }, EMPTY_FORM);
    expect(wrongCheckDigits.ok).toBe(false);
    if (wrongCheckDigits.ok) return;
    expect(wrongCheckDigits.issues.map((issue) => issue.element)).toEqual(["iban"]);
  });

  it("surfaces the codec's own issues, such as remittance text that is too long", () => {
    const result = buildPaymentRequest(payee, {
      ...EMPTY_FORM,
      remittance: "x".repeat(141),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.element)).toContain("text");
  });

  it("keeps a name that is only whitespace out of the payload", () => {
    const result = buildPaymentRequest({ ...payee, name: "   " }, EMPTY_FORM);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.element)).toContain("name");
  });
});

describe("display formatting", () => {
  it("groups an IBAN into blocks of four", () => {
    expect(formatIbanForDisplay("DE33100205000001194700")).toBe("DE33 1002 0500 0001 1947 00");
    expect(formatIbanForDisplay("NL91ABNA0417164300")).toBe("NL91 ABNA 0417 1643 00");
  });

  it("restores the cents the codec drops", () => {
    expect(formatAmountForDisplay("13.05")).toBe("13,05");
    expect(formatAmountForDisplay("12.3")).toBe("12,30");
    expect(formatAmountForDisplay("12")).toBe("12,00");
  });
});
