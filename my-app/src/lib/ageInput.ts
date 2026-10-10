export const AGE_MIN = 1;
export const AGE_MAX = 99;

/** Парсит ввод возраста: только цифры, макс. 2 символа, без ведущего нуля. */
export function parseAgeInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  const trimmed = digits.replace(/^0+/, "");
  if (!trimmed) return null;

  const limited = trimmed.slice(0, 2);
  const n = Number(limited);
  if (!Number.isFinite(n)) return null;

  return Math.min(n, AGE_MAX);
}

export function isValidAge(age: number | null | undefined): age is number {
  return (
    typeof age === "number" &&
    Number.isInteger(age) &&
    age >= AGE_MIN &&
    age <= AGE_MAX
  );
}

/** Строка для controlled input (пусто → ""). */
export function formatAgeInputValue(age: number | null | undefined): string {
  return age != null ? String(age) : "";
}
