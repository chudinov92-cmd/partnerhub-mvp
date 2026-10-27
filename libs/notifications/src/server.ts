// Серверные модули уведомлений (web-push / nodemailer).
// Импортировать только из server-side кода (route handlers / server components).
export {
  dispatchPushForMessage,
  type PushDispatchResult,
} from './lib/push/dispatchServer';

export {
  isSmtpConfigured,
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from './lib/email/server';