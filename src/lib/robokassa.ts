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
