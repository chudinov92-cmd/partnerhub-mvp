/**
 * Решение о том, нужно ли применить город из профиля как город на карте.
 *
 * Онбординг сохраняет город в профиль, но редирект на `/map` идёт без
 * параметров. При первом открытии карты город в `localStorage.selected_city`
 * может отсутствовать (тогда контекст отдаёт «Россия») или содержать выбор
 * из прошлой гостовой сессии. Эта функция говорит, корректно ли применить
 * `profileCity`, уважая при этом явный ручной выбор пользователя.
 */
export function shouldApplyProfileCity(params: {
  /** Город из профиля пользователя. */
  profileCity: string | null | undefined;
  /** Текущий город на карте (selectedCity). */
  selectedCity: string;
  /** true, если пользователь сам выбрал город в шапке/на карте. */
  userPickedCity: boolean;
}): boolean {
  const profileCity = (params.profileCity ?? "").trim();
  if (!profileCity) return false;
  // Уважаем осознанный выбор пользователя — не перетираем его профилем.
  if (params.userPickedCity) return false;
  // Город уже применён — не перезапускаем эффект (избегаем лишних ререндеров).
  if (params.selectedCity === profileCity) return false;
  return true;
}