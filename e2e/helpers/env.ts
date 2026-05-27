export const baseURL = process.env.E2E_BASE_URL ?? "https://zeip.ru";

function readE2eSecret(value: string | undefined): string {
  return (value ?? "").trim();
}

export const e2eUser = {
  email: readE2eSecret(process.env.E2E_USER_EMAIL),
  password: readE2eSecret(process.env.E2E_USER_PASSWORD),
};

export const e2eProUser = {
  email:
    readE2eSecret(process.env.E2E_PRO_USER_EMAIL) || e2eUser.email,
  password:
    readE2eSecret(process.env.E2E_PRO_USER_PASSWORD) || e2eUser.password,
};

export const e2eAdmin = {
  email: readE2eSecret(process.env.E2E_ADMIN_EMAIL),
  password: readE2eSecret(process.env.E2E_ADMIN_PASSWORD),
};

export const e2eOtherProfileId = process.env.E2E_OTHER_PROFILE_ID?.trim() ?? "";

export const hasE2eUser =
  e2eUser.email.length > 0 && e2eUser.password.length > 0;

export const hasE2eProUser =
  e2eProUser.email.length > 0 && e2eProUser.password.length > 0;

export const hasE2eAdmin =
  e2eAdmin.email.length > 0 && e2eAdmin.password.length > 0;

export const skipReasonNoUser =
  "Задайте E2E_USER_EMAIL и E2E_USER_PASSWORD в my-app/.env.e2e";

export const skipReasonNoAdmin =
  "Задайте E2E_ADMIN_EMAIL и E2E_ADMIN_PASSWORD в my-app/.env.e2e";
