import { describe, expect, it } from "vitest";

import { EMPTY_PAYEE, type Payee } from "../src/epc/request";
import { parsePayee, serializePayee } from "../src/settings/payee";

const payee: Payee = {
  name: "Wikimedia Foerdergesellschaft",
  iban: "DE33100205000001194700",
  bic: "BFSWDE33MUE",
};

describe("payee settings", () => {
  it("round-trips", () => {
    expect(parsePayee(serializePayee(payee))).toEqual(payee);
  });

  it("returns empty fields when nothing is stored", () => {
    expect(parsePayee(null)).toEqual(EMPTY_PAYEE);
  });

  it("falls back to empty fields rather than trusting a damaged value", () => {
    for (const stored of ["", "{", "null", '"a string"', "[]", "42"]) {
      expect(parsePayee(stored)).toEqual(EMPTY_PAYEE);
    }
  });

  it("drops fields of the wrong type and keeps the rest", () => {
    expect(parsePayee('{"name":"Acme","iban":42}')).toEqual({
      name: "Acme",
      iban: "",
      bic: "",
    });
  });

  it("stores only the fields it knows", () => {
    expect(JSON.parse(serializePayee({ ...payee, extra: true } as Payee))).toEqual(payee);
  });
});
