import { describe, expect, it } from "vitest";
import {
  MsctQrError,
  decodeMsctQr,
  encodeMsctPayeeClear,
  encodeMsctPayeeProxy,
  encodeMsctPayeeToken,
  encodeMsctPayerToken,
} from "../src/index.js";

const COMMON = { domain: "qr.example.org", providerId: "AB1", issuer: "XY9" };

describe("payee-presented MSCT QR codes", () => {
  it("builds the URL structure from EPC024-22 section 4.4", () => {
    const url = encodeMsctPayeeToken({ ...COMMON, context: "m", token: "t0k3n" });
    expect(url).toBe("https://qr.example.org/1/m/AB1/?iss=XY9&tok=t0k3n");
  });

  it("roundtrips a token payload", () => {
    const url = encodeMsctPayeeToken({ ...COMMON, context: "p", token: "abc123" });
    const { data } = decodeMsctQr(url);
    expect(data.kind).toBe("payee-token");
    if (data.kind === "payee-token") {
      expect(data.token).toBe("abc123");
      expect(data.context).toBe("p");
      expect(data.providerId).toBe("AB1");
      expect(data.issuer).toBe("XY9");
    }
  });

  it("roundtrips a proxy payload with transaction data", () => {
    const url = encodeMsctPayeeProxy({
      ...COMMON,
      context: "m",
      proxy: "+3212345678",
      instrument: "INST",
      mcc: "5812",
      amount: 24.5,
      remittance: "table 7",
    });
    const { data } = decodeMsctQr(url);
    expect(data.kind).toBe("payee-proxy");
    if (data.kind === "payee-proxy") {
      expect(data.proxy).toBe("+3212345678");
      expect(data.instrument).toBe("INST");
      expect(data.currency).toBe("EUR");
      expect(data.amount).toBe("24.5");
      expect(data.mcc).toBe("5812");
      expect(data.remittance).toBe("table 7");
    }
  });

  it("roundtrips an all-in-clear payload", () => {
    const url = encodeMsctPayeeClear({
      ...COMMON,
      context: "e",
      name: "Webshop BV",
      tradeName: "webshop.example",
      iban: "BE72000000001616",
      instrument: "SCT",
      amount: "12",
      reference: "RF18539007547034",
    });
    const { data } = decodeMsctQr(url);
    expect(data.kind).toBe("payee-clear");
    if (data.kind === "payee-clear") {
      expect(data.name).toBe("Webshop BV");
      expect(data.iban).toBe("BE72000000001616");
      expect(data.reference).toBe("RF18539007547034");
    }
  });

  it("supports custom parameter naming profiles", () => {
    const keys = { token: "payload", issuer: "src" };
    const url = encodeMsctPayeeToken({ ...COMMON, context: "m", token: "zz", keys });
    expect(url).toContain("payload=zz");
    const { data } = decodeMsctQr(url, { keys });
    expect(data.kind).toBe("payee-token");
  });

  it("rejects unknown payment contexts", () => {
    const url = "https://qr.example.org/1/z/AB1/?iss=XY9&tok=a";
    expect(() => decodeMsctQr(url)).toThrow(MsctQrError);
  });

  it("rejects a provider ID that is not 3 alphanumerics", () => {
    expect(() => encodeMsctPayeeToken({ ...COMMON, providerId: "TOOLONG", context: "m", token: "a" })).toThrow(
      MsctQrError,
    );
  });

  it("rejects invalid instruments", () => {
    expect(() =>
      encodeMsctPayeeClear({
        ...COMMON,
        context: "m",
        name: "X",
        iban: "BE72000000001616",
        // @ts-expect-error deliberately wrong
        instrument: "CARD",
        amount: "1",
      }),
    ).toThrow(MsctQrError);
  });

  it("rejects simultaneous structured and unstructured remittance", () => {
    expect(() =>
      encodeMsctPayeeProxy({
        ...COMMON,
        context: "m",
        proxy: "p",
        instrument: "INST",
        amount: "1",
        reference: "RF18539007547034",
        remittance: "both",
      }),
    ).toThrow(MsctQrError);
  });

  it("requires https", () => {
    expect(() => decodeMsctQr("http://qr.example.org/1/m/AB1/?iss=XY9&tok=a")).toThrow(/https/);
  });
});

describe("payer-presented MSCT QR codes", () => {
  it("roundtrips a payer token with the reserved type segment", () => {
    const url = encodeMsctPayerToken({ ...COMMON, token: "payer-token", valueAddedServices: "loyalty:1" });
    expect(url).toBe("https://qr.example.org/1/0/AB1/?iss=XY9&tok=payer-token&vas=loyalty%3A1");
    const { data } = decodeMsctQr(url, { presenter: "payer" });
    expect(data.kind).toBe("payer-token");
    if (data.kind === "payer-token") {
      expect(data.token).toBe("payer-token");
      expect(data.valueAddedServices).toBe("loyalty:1");
    }
  });

  it("limits payer tokens to 70 characters", () => {
    expect(() => encodeMsctPayerToken({ ...COMMON, token: "x".repeat(71) })).toThrow(MsctQrError);
  });
});
