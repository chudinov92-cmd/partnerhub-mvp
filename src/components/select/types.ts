import type { ReactNode } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectVariant = "default" | "profile";

export type SelectListExtrasContext = {
  search: string;
  visibleOptions: SelectOption[];
};

export type SelectOverlayCommonProps = {
  open: boolean;
  onClose: () => void;
  options: SelectOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: SelectVariant;
  listHeader?: ReactNode;
  emptyHint?: ReactNode;
  renderListExtras?: (ctx: SelectListExtrasContext) => ReactNode;
  emptyMessage?: string;
  menuClassName?: string;
  filterOption?: (option: SelectOption, query: string) => boolean;
};

export function defaultFilterOption(option: SelectOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return option.label.toLowerCase().includes(q);
}

export function shouldShowSearch(
  searchable: boolean | undefined,
  optionCount: number,
) {
  return Boolean(searchable) || optionCount > 8;
}
