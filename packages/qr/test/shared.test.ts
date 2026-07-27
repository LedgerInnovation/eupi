import { describe, expect, it } from "vitest";
import { formatAmount, isValidAmountString, isValidIban, isValidRfReference, normalizeIban } from "../src/index.js";

describe("isValidIban", () => {
  it("accepts valid IBANs from several countries", () => {
    expect(isValidIban("DE71110220330123456789")).toBe(true);
    expect(isValidIban("BE72000000001616")).toBe(true);
    expect(isValidIban("FR1420041010050500013M02606")).toBe(true);
    expect(isValidIban("LT601010012345678901")).toBe(true);
    expect(isValidIban("GB82WEST12345698765432")).toBe(true);
  });

  it("accepts spaced and lowercase input", () => {
    expect(isValidIban("de71 1102 2033 0123 4567 89")).toBe(true);
  });

  it("rejects bad check digits, lengths, and formats", () => {
    expect(isValidIban("DE71110220330123456780")).toBe(false);
    expect(isValidIban("DE7111022033012345678")).toBe(false);
    expect(isValidIban("D171110220330123456789")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });

  it("normalizes", () => {
    expect(normalizeIban("be72 0000 0000 1616")).toBe("BE72000000001616");
  });
});

describe("isValidRfReference", () => {
  it("accepts the official EPC example reference", () => {
    expect(isValidRfReference("RF18539007547034")).toBe(true);
  });
  it("rejects tampered references", () => {
    expect(isValidRfReference("RF18539007547035")).toBe(false);
    expect(isValidRfReference("XX18539007547034")).toBe(false);
  });
});

describe("amounts", () => {
  it("validates the SCT range", () => {
    expect(isValidAmountString("0.01")).toBe(true);
    expect(isValidAmountString("999999999.99")).toBe(true);
    expect(isValidAmountString("0")).toBe(false);
    expect(isValidAmountString("1000000000")).toBe(false);
    expect(isValidAmountString("1,50")).toBe(false);
  });

  it("formats numbers without spurious trailing zeros", () => {
    expect(formatAmount(12.3)).toBe("12.3");
    expect(formatAmount(12)).toBe("12");
    expect(formatAmount(0.1 + 0.2)).toBe("0.3");
    expect(formatAmount("45.00")).toBe("45.00");
  });
});
