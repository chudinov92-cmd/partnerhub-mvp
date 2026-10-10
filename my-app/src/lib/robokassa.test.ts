import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRobokassaPaymentUrl,
  buildRobokassaReceipt,
  encodeRobokassaReceipt,
  signPaymentRequest,
} from "./robokassa";

describe("buildRobokassaReceipt", () => {
  it("формирует позицию с sum = OutSum и tax none", () => {
    const receipt = buildRobokassaReceipt("Подписка Pro на 30 дней", "249.00");
    assert.equal(receipt.items.length, 1);
    assert.equal(receipt.items[0]?.name, "Подписка Pro на 30 дней");
    assert.equal(receipt.items[0]?.quantity, 1);
    assert.equal(receipt.items[0]?.sum, 249);
    assert.equal(receipt.items[0]?.tax, "none");
    assert.equal(receipt.items[0]?.payment_object, "service");
    assert.equal(receipt.items[0]?.payment_method, "full_payment");
    assert.equal(receipt.sno, "usn_income");
  });

  it("обрезает имя до 128 символов", () => {
    const longName = "А".repeat(200);
    const receipt = buildRobokassaReceipt(longName, "249.00");
    assert.equal(receipt.items[0]?.name.length, 128);
  });
});

describe("signPaymentRequest", () => {
  it("без Receipt: MerchantLogin:OutSum:InvId:Password1", () => {
    const sig = signPaymentRequest("shop", "249.00", 123456789, "pass1");
    assert.equal(sig, signPaymentRequest("shop", "249.00", 123456789, "pass1"));
    assert.match(sig, /^[A-F0-9]{32}$/);
  });

  it("с Receipt включает URL-encoded JSON в подпись", () => {
    const receipt = buildRobokassaReceipt("Подписка Pro на 30 дней", "249.00");
    const receiptEncoded = encodeRobokassaReceipt(receipt);
    const withReceipt = signPaymentRequest(
      "shop",
      "249.00",
      123456789,
      "pass1",
      receiptEncoded,
    );
    const withoutReceipt = signPaymentRequest(
      "shop",
      "249.00",
      123456789,
      "pass1",
    );
    assert.notEqual(withReceipt, withoutReceipt);
  });
});

describe("buildRobokassaPaymentUrl", () => {
  it("включает Receipt, Email и подпись с номенклатурой", () => {
    const url = buildRobokassaPaymentUrl({
      merchantLogin: "shop",
      password1: "pass1",
      outSum: "249.00",
      invId: 924541453,
      description: "Тариф Pro",
      receiptName: "Подписка Pro на 30 дней",
      email: "buyer@example.com",
      siteUrl: "https://zeip.ru",
    });

    const parsed = new URL(url);
    assert.equal(parsed.hostname, "auth.robokassa.ru");
    assert.equal(parsed.searchParams.get("OutSum"), "249.00");
    assert.equal(parsed.searchParams.get("InvId"), "924541453");
    assert.equal(parsed.searchParams.get("Email"), "buyer@example.com");
    assert.ok(parsed.searchParams.get("Receipt"));
    assert.ok(parsed.searchParams.get("SignatureValue"));

    const receiptRaw = parsed.searchParams.get("Receipt") ?? "";
    const receipt = JSON.parse(decodeURIComponent(receiptRaw)) as {
      items: Array<{ name: string; sum: number; tax: string }>;
    };
    assert.equal(receipt.items[0]?.name, "Подписка Pro на 30 дней");
    assert.equal(receipt.items[0]?.sum, 249);
    assert.equal(receipt.items[0]?.tax, "none");

    const expectedSig = signPaymentRequest(
      "shop",
      "249.00",
      924541453,
      "pass1",
      receiptRaw,
    );
    assert.equal(parsed.searchParams.get("SignatureValue"), expectedSig);
  });
});
