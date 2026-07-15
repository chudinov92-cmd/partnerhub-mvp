import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — Zeip",
  description:
    "Согласие на обработку персональных данных ООО «ЗЕИП» в соответствии с Федеральным законом № 152-ФЗ.",
};

const DATA_FIELDS = [
  "ФИО пользователя",
  "Адрес электронной почты",
  "Город",
  "Информация профиля (специализация, описание, фото)",
] as const;

export default function PersonalDataConsentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8">
      <article className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <Link
          href="/auth"
          className="inline-flex items-center text-sm font-medium text-[#009966] hover:text-[#008855] hover:underline"
        >
          ← Назад
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Согласие на обработку персональных данных
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
          <p>
            Настоящим в соответствии с Федеральным законом № 152-ФЗ «О
            персональных данных» от 27.07.2006 года свободно, своей волей и в
            своём интересе выражаю своё безусловное согласие на обработку моих
            персональных данных ООО «ЗЕИП», зарегистрированным в соответствии с
            законодательством РФ по адресу: 614107, г. Пермь, ул. Макаренко 12а
            - 164 (далее по тексту — Оператор).
          </p>

          <section>
            <p className="font-medium text-slate-900">
              1. Согласие даётся на обработку одной, нескольких или всех
              категорий персональных данных, не являющихся специальными или
              биометрическими, предоставляемых мною, которые могут включать:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {DATA_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </section>

          <p>
            <span className="font-medium text-slate-900">2.</span> Оператор
            может совершать следующие действия: сбор; запись; систематизация;
            накопление; хранение; уточнение (обновление, изменение); извлечение;
            использование; блокирование; удаление; уничтожение.
          </p>

          <p>
            <span className="font-medium text-slate-900">3.</span> Способы
            обработки: как с использованием средств автоматизации, так и без их
            использования.
          </p>

          <p>
            <span className="font-medium text-slate-900">4.</span> Цель
            обработки: предоставление мне услуг/работ, включая направление в мой
            адрес уведомлений, касающихся предоставляемых услуг/работ, подготовка
            и направление ответов на мои запросы, направление в мой адрес
            информации о мероприятиях/товарах/услугах/работах Оператора.
          </p>

          <p>
            <span className="font-medium text-slate-900">5.</span> Настоящее
            согласие действует до момента его отзыва путём направления
            соответствующего уведомления на электронный адрес{" "}
            <a
              href="mailto:support@zeip.ru"
              className="font-medium text-[#009966] underline underline-offset-2 hover:text-[#008855]"
            >
              support@zeip.ru
            </a>{" "}
            или направления по адресу 614107, г. Пермь, ул. Макаренко 12а - 164.
          </p>

          <p>
            <span className="font-medium text-slate-900">6.</span> В случае
            отзыва мною согласия на обработку персональных данных Оператор вправе
            продолжить обработку персональных данных без моего согласия при
            наличии оснований, предусмотренных Федеральным законом № 152-ФЗ «О
            персональных данных» от 27.07.2006 г.
          </p>
        </div>
      </article>
    </div>
  );
}
