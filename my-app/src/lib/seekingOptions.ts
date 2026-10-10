export const SEEKING_OPTIONS = [
  { value: "ideas", label: "Идеи" },
  { value: "project", label: "Проект(ы)" },
  { value: "team", label: "Команду" },
] as const;

export type SeekingValue = (typeof SEEKING_OPTIONS)[number]["value"];

export function toggleArrayItem(arr: string[], value: string): string[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

export function profileMatchesSeeking(
  profileSeeking: string[] | null | undefined,
  filterSeeking: string[],
): boolean {
  if (filterSeeking.length === 0) return true;
  const set = new Set(profileSeeking ?? []);
  return filterSeeking.some((v) => set.has(v));
}

export function seekingLabels(
  values: string[] | null | undefined,
): string[] {
  if (!values?.length) return [];
  const labelByValue = new Map(
    SEEKING_OPTIONS.map(({ value, label }) => [value, label]),
  );
  return values.flatMap((value) => {
    const label = labelByValue.get(value as SeekingValue);
    return label ? [label] : [];
  });
}
