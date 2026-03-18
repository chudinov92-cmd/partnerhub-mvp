// JS: `\b` плохо работает с кириллицей (т.к. `\w` не включает русские буквы).
// Поэтому используем шаблоны с захватом префикса/слова.
const RU_PROFANITY_WORD_PATTERNS: RegExp[] = [
  // Each regex captures:
  // group 1 = prefix delimiter (start or non-russian letter)
  // group 2 = matched word part to mask
  /(^|[^а-яё])((?:хуй)[а-яё]*)/gi,
  /(^|[^а-яё])((?:пизд)[а-яё]*)/gi,
  /(^|[^а-яё])((?:еба)[а-яё]*)/gi,
  /(^|[^а-яё])((?:еб[её])[а-яё]*)/gi,
  /(^|[^а-яё])((?:бля)[а-яё]*)/gi,
  /(^|[^а-яё])((?:сука)[а-яё]*)/gi,
  /(^|[^а-яё])((?:гандон)[а-яё]*)/gi,
  /(^|[^а-яё])((?:говн)[а-яё]*)/gi,
  /(^|[^а-яё])((?:мраз)[а-яё]*)/gi,
  /(^|[^а-яё])((?:шлюх)[а-яё]*)/gi,
];

function maskWord(word: string) {
  return "*".repeat(word.length);
}

export function maskProfanity(text: string | null | undefined) {
  if (text == null) return text;
  let out = text;
  for (const re of RU_PROFANITY_WORD_PATTERNS) {
    out = out.replace(re, (_m, prefix: string, word: string) => {
      return `${prefix}${maskWord(word)}`;
    });
  }
  return out;
}

