import {
  COOKIE_REGISTRY_SECTIONS,
  type CookieCategory,
} from "@/data/legal/cookieRegistry";

const CATEGORY_STYLES: Record<CookieCategory, string> = {
  Необходимые: "bg-slate-100 text-slate-700",
  Функциональные: "bg-emerald-50 text-emerald-800",
  Аналитические: "bg-sky-50 text-sky-800",
  Маркетинговые: "bg-violet-50 text-violet-800",
  "Сторонний оператор": "bg-amber-50 text-amber-800",
};

function ConsentBadge({ required }: { required: boolean }) {
  if (required) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Да
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      Нет
    </span>
  );
}

export function CookieRegistryTable() {
  return (
    <div className="space-y-8">
      {COOKIE_REGISTRY_SECTIONS.map((section) => (
        <section key={section.id} id={section.id}>
          <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
          {section.description ? (
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          ) : null}

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[960px] w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="px-3 py-2.5 font-semibold">Категория</th>
                  <th className="px-3 py-2.5 font-semibold">Название</th>
                  <th className="px-3 py-2.5 font-semibold">Тип</th>
                  <th className="px-3 py-2.5 font-semibold">Назначение</th>
                  <th className="px-3 py-2.5 font-semibold">Срок</th>
                  <th className="px-3 py-2.5 font-semibold">Согласие</th>
                  <th className="px-3 py-2.5 font-semibold">Поставщик / домен</th>
                </tr>
              </thead>
              <tbody>
                {section.entries.map((entry) => (
                  <tr
                    key={`${section.id}-${entry.name}`}
                    className="border-b border-slate-100 last:border-b-0 align-top"
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[entry.category]}`}
                      >
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-900">
                      {entry.name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{entry.storageType}</td>
                    <td className="px-3 py-2.5 text-slate-700">{entry.purpose}</td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {entry.retention}
                    </td>
                    <td className="px-3 py-2.5">
                      <ConsentBadge required={entry.consentRequired} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      <span className="block">{entry.provider}</span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {entry.domain}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs leading-relaxed text-slate-500">
        Аналитические и маркетинговые cookie активируются только после нажатия кнопки
        «Согласен» в баннере cookie-уведомления. Для отказа от Яндекс.Метрики:{" "}
        <a
          href="https://yandex.ru/support/metrika/general/opt-out.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#009966] underline underline-offset-2 hover:text-[#008855]"
        >
          opt-out Яндекс.Метрики
        </a>
        .
      </p>
    </div>
  );
}
