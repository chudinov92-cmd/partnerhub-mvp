import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-red-50/20 to-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-slate-900">
          Оплата не прошла
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Платёж был отменён или не завершён. Подписка не активирована — можно
          попробовать снова.
        </p>
        <Link
          href="/subscription"
          className="mt-6 block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
        >
          Попробовать снова
        </Link>
        <Link
          href="/map"
          className="mt-3 block text-center text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          На карту
        </Link>
      </div>
    </div>
  );
}
