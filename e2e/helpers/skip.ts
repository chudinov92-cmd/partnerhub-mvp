import { test } from "@playwright/test";
import {
  hasE2eAdmin,
  hasE2eUser,
  skipReasonNoAdmin,
  skipReasonNoUser,
} from "./env";

export function describeWithUser(title: string, fn: () => void) {
  if (hasE2eUser) {
    test.describe(title, fn);
  } else {
    test.describe.skip(`${title} (${skipReasonNoUser})`, fn);
  }
}

export function describeWithAdmin(title: string, fn: () => void) {
  if (hasE2eAdmin) {
    test.describe(title, fn);
  } else {
    test.describe.skip(`${title} (${skipReasonNoAdmin})`, fn);
  }
}
