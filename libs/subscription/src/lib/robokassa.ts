import crypto from "crypto";

export type RobokassaHashAlg = "md5" | "sha256";

export type RobokassaSno =
  | "osn"
  | "usn_income"
  | "usn_income_outcome"
  | "esn"
  | "patent";

export type RobokassaReceiptItem = {
  name: string;
  quantity: number;
  sum: number;
  payment_method: "full_payment";
  payment_object: "service";
  tax: "none";
};

export type RobokassaReceipt = {
  sno: RobokassaSno;
  items: RobokassaReceiptItem[];
};

function getHashAlg(): RobokassaHashAlg {
  const alg = process.env.ROBOKASSA_HASH_ALG?.toLowerCase();
  return alg === "sha256" ? "sha256" : "md5";
}

/** Пароль #1: в тестовом режиме — из блока тестовых настроек ЛК Robokassa. */
export function getRobokassaPassword1(): string | undefined {
  const isTest = process.env.ROBOKASSA_TEST_MODE === "1";
  if (isTest && process.env.ROBOKASSA_TEST_PASSWORD1) {
    return process.env.ROBOKASSA_TEST_PASSWORD1;
  }
  return process.env.ROBOKASSA_PASSWORD1;
}

/** Пароль #2 для Result URL webhook. */
export function getRobokassaPassword2(): string | undefined {
  const isTest = process.env.ROBOKASSA_TEST_MODE === "1";
  if (isTest && process.env.ROBOKASSA_TEST_PASSWORD2) {
    return process.env.ROBOKASSA_TEST_PASSWORD2;
  }
  return process.env.ROBOKASSA_PASSWORD2;
}

export function isRobokassaTestMode(): boolean {
  return process.env.ROBOKASSA_TEST_MODE === "1";
}

/** Система налогообложения для чека (54-ФЗ). По умолчанию УСН доходы. */
export function getRobokassaSno(): RobokassaSno {
  const raw = process.env.ROBOKASSA_SNO?.trim();
  if (
    raw === "osn" ||
    raw === "usn_income" ||
    raw === "usn_income_outcome" ||
    raw === "esn" ||
    raw === "patent"
  ) {
    return raw;
  }
  return "usn_income";
}

export function buildRobokassaSignature(base: string): string {
  const alg = getHashAlg();
  const hash =
    alg === "sha256"
      ? crypto.createHash("sha256").update(base).digest("hex")
      : crypto.createHash("md5").update(base).digest("hex");
  return hash.toUpperCase();
}

/**
 * Подпись исходящего платежа.
 * Без Receipt: MerchantLogin:OutSum:InvId:Password1
 * С Receipt: MerchantLogin:OutSum:InvId:Receipt:Password1 (Receipt — URL-encoded JSON)
 */
export function signPaymentRequest(
  merchantLogin: string,
  outSum: string,
  invId: number,
  password1: string,
  receiptEncoded?: string,
): string {
  const base = receiptEncoded
    ? `${merchantLogin}:${outSum}:${invId}:${receiptEncoded}:${password1}`
    : `${merchantLogin}:${outSum}:${invId}:${password1}`;
  return buildRobokassaSignature(base);
}

/** Подпись Result URL: OutSum:InvId:Password2 */
export function signResultWebhook(
  outSum: string,
  invId: number,
  password2: string,
): string {
  return buildRobokassaSignature(`${outSum}:${invId}:${password2}`);
}

/** JSON номенклатуры для фискального чека (54-ФЗ). */
export function buildRobokassaReceipt(
  receiptName: string,
  outSum: string,
): RobokassaReceipt {
  const sum = parseFloat(outSum);
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new Error("Invalid OutSum for Robokassa receipt");
  }

  const name = receiptName.trim().slice(0, 128);
  if (!name) {
    throw new Error("Receipt item name is required");
  }

  return {
    sno: getRobokassaSno(),
    items: [
      {
        name,
        quantity: 1,
        sum,
        payment_method: "full_payment",
        payment_object: "service",
        tax: "none",
      },
    ],
  };
}

/** URL-encoded JSON Receipt для подписи и параметра запроса. */
export function encodeRobokassaReceipt(receipt: RobokassaReceipt): string {
  return encodeURIComponent(JSON.stringify(receipt));
}

/** Описание счёта в ссылке Robokassa (Description + InvDesc + Encoding). */
export function applyRobokassaInvoiceDescription(
  url: URL,
  description: string,
): void {
  url.searchParams.set("Description", description);
  url.searchParams.set("InvDesc", description);
  url.searchParams.set("Encoding", "utf-8");
}

/** Случайный InvId в диапазоне Robokassa (9 цифр). */
export function allocRobokassaInvId(): number {
  return Math.floor(100_000_000 + Math.random() * 900_000_000);
}

export type BuildRobokassaPaymentUrlParams = {
  merchantLogin: string;
  password1: string;
  outSum: string;
  invId: number;
  description: string;
  receiptName: string;
  email?: string;
  siteUrl: string;
};

/** Ссылка на оплату Robokassa с подписью, Receipt и return URL. */
export function buildRobokassaPaymentUrl(
  params: BuildRobokassaPaymentUrlParams,
): string {
  const receipt = buildRobokassaReceipt(params.receiptName, params.outSum);
  const receiptEncoded = encodeRobokassaReceipt(receipt);

  const signatureValue = signPaymentRequest(
    params.merchantLogin,
    params.outSum,
    params.invId,
    params.password1,
    receiptEncoded,
  );

  const url = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
  url.searchParams.set("MerchantLogin", params.merchantLogin);
  url.searchParams.set("OutSum", params.outSum);
  url.searchParams.set("InvId", String(params.invId));
  applyRobokassaInvoiceDescription(url, params.description);
  url.searchParams.set("Receipt", receiptEncoded);
  url.searchParams.set("SignatureValue", signatureValue);
  url.searchParams.set("Culture", "ru");
  if (params.email) {
    url.searchParams.set("Email", params.email);
  }
  if (isRobokassaTestMode()) {
    url.searchParams.set("IsTest", "1");
  }
  url.searchParams.set("SuccessURL", `${params.siteUrl}/payment/success`);
  url.searchParams.set("FailURL", `${params.siteUrl}/payment/fail`);
  return url.toString();
}
