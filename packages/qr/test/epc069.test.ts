import { describe, expect, it } from "vitest";
import {
  EPC069_MAX_BYTES,
  EpcQrError,
  decodeEpcQr,
  encodeEpcQr,
} from "../src/index.js";

/**
 * Official example "V1" from EPC069-12 v3.1 section 2.3.
 * The spec states: 95 characters including spaces (1) and line feeds (9),
 * 96 byte UTF-8 code payload.
 */
const OFFICIAL_V1 = [
  "BCD",
  "001",
  "1",
  "SCT",
  "BHBLDEHHXXX",
  "Franz Mustermänn",
  "DE71110220330123456789",
  "EUR12.3",
  "GDDS",
  "RF18539007547034",
].join("\n");

/**
 * Official example "V2" from EPC069-12 v3.1 section 2.3.
 * The spec states: 103 characters including spaces (5) and line feeds (10),
 * 103 byte ISO 8859-1 code payload. Note the preserved interior empty
 * elements (BIC, purpose, structured reference).
 */
const OFFICIAL_V2 = [
  "BCD",
  "002",
  "2",
  "SCT",
  "",
  "François D'Alsace S.A.",
  "FR1420041010050500013M02606",
  "EUR12.3",
  "",
  "",
  "Client:Marie Louise La Lune",
].join("\n");

describe("encodeEpcQr", () => {
  it("reproduces the official V1 example byte for byte", () => {
    const payload = encodeEpcQr({
      version: "001",
      charset: 1,
      bic: "BHBLDEHHXXX",
      name: "Franz Mustermänn",
      iban: "DE71110220330123456789",
      amount: "12.3",
      purpose: "GDDS",
      reference: "RF18539007547034",
    });
    expect(payload).toBe(OFFICIAL_V1);
    expect(new TextEncoder().encode(payload).length).toBe(96);
  });

  it("reproduces the official V2 example byte for byte", () => {
    const payload = encodeEpcQr({
      version: "002",
      charset: 2,
      name: "François D'Alsace S.A.",
      iban: "FR1420041010050500013M02606",
      amount: "12.3",
      text: "Client:Marie Louise La Lune",
    });
    expect(payload).toBe(OFFICIAL_V2);
    expect(payload.length).toBe(103);
  });

  it("omits trailing empty elements but keeps interior ones", () => {
    const payload = encodeEpcQr({
      name: "Test",
      iban: "BE72000000001616",
    });
    expect(payload).toBe("BCD\n002\n1\nSCT\n\nTest\nBE72000000001616");
  });

  it("formats numeric amounts like the official examples", () => {
    const payload = encodeEpcQr({ name: "T", iban: "BE72000000001616", amount: 12.3 });
    expect(payload).toContain("EUR12.3");
    const whole = encodeEpcQr({ name: "T", iban: "BE72000000001616", amount: 5 });
    expect(whole).toContain("EUR5");
  });

  it("supports CRLF separators", () => {
    const payload = encodeEpcQr({ name: "T", iban: "BE72000000001616", crlf: true });
    expect(payload.split("\r\n")).toHaveLength(7);
  });

  it("rejects a missing BIC in version 001", () => {
    expect(() => encodeEpcQr({ version: "001", name: "T", iban: "BE72000000001616" })).toThrow(EpcQrError);
  });

  it("rejects invalid IBANs", () => {
    expect(() => encodeEpcQr({ name: "T", iban: "DE71110220330123456780" })).toThrow(EpcQrError);
  });

  it("rejects amounts outside the SCT range", () => {
    expect(() => encodeEpcQr({ name: "T", iban: "BE72000000001616", amount: 0 })).toThrow(RangeError);
    expect(() => encodeEpcQr({ name: "T", iban: "BE72000000001616", amount: "1000000000.00" })).toThrow(RangeError);
  });

  it("rejects simultaneous structured and unstructured remittance", () => {
    expect(() =>
      encodeEpcQr({
        name: "T",
        iban: "BE72000000001616",
        reference: "RF18539007547034",
        text: "hello",
      }),
    ).toThrow(EpcQrError);
  });

  it("rejects an invalid RF creditor reference", () => {
    expect(() =>
      encodeEpcQr({ name: "T", iban: "BE72000000001616", reference: "RF18539007547035" }),
    ).toThrow(EpcQrError);
  });

  it("rejects payloads over the 331 byte limit", () => {
    expect(() =>
      encodeEpcQr({
        name: "N".repeat(70),
        iban: "BE72000000001616",
        text: "x".repeat(140),
        information: "y".repeat(70),
        bic: "BPOTBEB1XXX",
        purpose: "GDDS",
        amount: "999999999.99",
      }),
    ).toThrow(/331/);
    expect(EPC069_MAX_BYTES).toBe(331);
  });

  it("rejects non Latin-1 content when charset 2 is selected", () => {
    expect(() => encodeEpcQr({ charset: 2, name: "Świdnica", iban: "BE72000000001616" })).toThrow(
      /ISO 8859-1/,
    );
  });
});

describe("decodeEpcQr", () => {
  it("decodes the official V1 example", () => {
    const { data, issues } = decodeEpcQr(OFFICIAL_V1);
    expect(issues).toHaveLength(0);
    expect(data).toMatchObject({
      version: "001",
      charset: 1,
      bic: "BHBLDEHHXXX",
      name: "Franz Mustermänn",
      iban: "DE71110220330123456789",
      amount: "12.3",
      purpose: "GDDS",
      reference: "RF18539007547034",
    });
  });

  it("decodes the official V2 example", () => {
    const { data } = decodeEpcQr(OFFICIAL_V2);
    expect(data).toMatchObject({
      version: "002",
      charset: 2,
      name: "François D'Alsace S.A.",
      iban: "FR1420041010050500013M02606",
      amount: "12.3",
      text: "Client:Marie Louise La Lune",
    });
    expect(data.bic).toBeUndefined();
    expect(data.purpose).toBeUndefined();
  });

  it("roundtrips through encode", () => {
    const original = encodeEpcQr({
      name: "Ecency Test",
      iban: "LT601010012345678901",
      amount: "1.23",
      text: "coffee",
    });
    const { data } = decodeEpcQr(original);
    expect(
      encodeEpcQr({
        version: data.version,
        charset: data.charset,
        name: data.name,
        iban: data.iban,
        amount: data.amount!,
        text: data.text!,
      }),
    ).toBe(original);
  });

  it("accepts CRLF payloads and trailing newlines", () => {
    const { data } = decodeEpcQr("BCD\r\n002\r\n1\r\nSCT\r\n\r\nTest\r\nBE72000000001616\r\n");
    expect(data.name).toBe("Test");
  });

  it("rejects payloads without the BCD service tag", () => {
    expect(() => decodeEpcQr("SPC\n0200\n1")).toThrow(/service tag/);
  });

  it("rejects unsupported identification codes", () => {
    expect(() => decodeEpcQr("BCD\n002\n1\nINST\n\nTest\nBE72000000001616")).toThrow(
      /identification/,
    );
  });

  it("reports issues instead of throwing in lenient mode", () => {
    const { issues } = decodeEpcQr("BCD\n002\n1\nSCT\n\nTest\nXX00INVALID", { strict: false });
    expect(issues.some((i) => i.element === "iban")).toBe(true);
  });
});
