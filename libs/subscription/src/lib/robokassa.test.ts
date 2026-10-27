import {
  buildRobokassaPaymentUrl,
  buildRobokassaReceipt,
  encodeRobokassaReceipt,
  signPaymentRequest,
} from "./robokassa";

describe("buildRobokassaReceipt", () => {
  it("формирует позицию с sum = OutSum и tax none", () => {
    const receipt = buildRobokassaReceipt("Подписка Pro на 30 дней", "249.00");
    expect(receipt.items.length).toBe(1);
    expect(receipt.items[0]?.name).toBe("Подписка Pro на 30 дней");
    expect(receipt.items[0]?.quantity).toBe(1);
    expect(receipt.items[0]?.sum).toBe(249);
    expect(receipt.items[0]?.tax).toBe("none");
    expect(receipt.items[0]?.payment_object).toBe("service");
    expect(receipt.items[0]?.payment_method).toBe("full_payment");
    expect(receipt.sno).toBe("usn_income");
  });

  it("обрезает имя до 128 символов", () => {
    const longName = "А".repeat(200);
    const receipt = buildRobokassaReceipt(longName, "249.00");
    expect(receipt.items[0]?.name.length).toBe(128);
  });
});

describe("signPaymentRequest", () => {
  it("без Receipt: MerchantLogin:OutSum:InvId:Password1", () => {
    const sig = signPaymentRequest("shop", "249.00", 123456789, "pass1");
    expect(sig).toBe(signPaymentRequest("shop", "249.00", 123456789, "pass1"));
    expect(sig).toMatch(/^[A-F0-9]{32}$/);
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
    expect(withReceipt).not.toBe(withoutReceipt);
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
    expect(parsed.hostname).toBe("auth.robokassa.ru");
    expect(parsed.searchParams.get("OutSum")).toBe("249.00");
    expect(parsed.searchParams.get("InvId")).toBe("924541453");
    expect(parsed.searchParams.get("Email")).toBe("buyer@example.com");
    expect(parsed.searchParams.get("Receipt")).toBeTruthy();
    expect(parsed.searchParams.get("SignatureValue")).toBeTruthy();

    const receiptRaw = parsed.searchParams.get("Receipt") ?? "";
    const receipt = JSON.parse(decodeURIComponent(receiptRaw)) as {
      items: Array<{ name: string; sum: number; tax: string }>;
    };
    expect(receipt.items[0]?.name).toBe("Подписка Pro на 30 дней");
    expect(receipt.items[0]?.sum).toBe(249);
    expect(receipt.items[0]?.tax).toBe("none");

    const expectedSig = signPaymentRequest(
      "shop",
      "249.00",
      924541453,
      "pass1",
      receiptRaw,
    );
    expect(parsed.searchParams.get("SignatureValue")).toBe(expectedSig);
  });
});
