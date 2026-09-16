import crypto from "crypto";

export type RobokassaHashAlg = "md5" | "sha256";

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

export function buildRobokassaSignature(base: string): string {
  const alg = getHashAlg();
  const hash =
    alg === "sha256"
      ? crypto.createHash("sha256").update(base).digest("hex")
      : crypto.createHash("md5").update(base).digest("hex");
  return hash.toUpperCase();
}

/** Подпись исходящего платежа: MerchantLogin:OutSum:InvId:Password1 */
export function signPaymentRequest(
  merchantLogin: string,
  outSum: string,
  invId: number,
  password1: string,
): string {
  return buildRobokassaSignature(`${merchantLogin}:${outSum}:${invId}:${password1}`);
}

/** Подпись Result URL: OutSum:InvId:Password2 */
export function signResultWebhook(
  outSum: string,
  invId: number,
  password2: string,
): string {
  return buildRobokassaSignature(`${outSum}:${invId}:${password2}`);
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
  siteUrl: string;
};

/** Ссылка на оплату Robokassa с подписью и return URL. */
export function buildRobokassaPaymentUrl(
  params: BuildRobokassaPaymentUrlParams,
): string {
  const signatureValue = signPaymentRequest(
    params.merchantLogin,
    params.outSum,
    params.invId,
    params.password1,
  );

  const url = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
  url.searchParams.set("MerchantLogin", params.merchantLogin);
  url.searchParams.set("OutSum", params.outSum);
  url.searchParams.set("InvId", String(params.invId));
  applyRobokassaInvoiceDescription(url, params.description);
  url.searchParams.set("SignatureValue", signatureValue);
  url.searchParams.set("Culture", "ru");
  if (isRobokassaTestMode()) {
    url.searchParams.set("IsTest", "1");
  }
  url.searchParams.set("SuccessURL", `${params.siteUrl}/payment/success`);
  url.searchParams.set("FailURL", `${params.siteUrl}/payment/fail`);
  return url.toString();
}
