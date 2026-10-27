export const PIONEER_DEFAULT_MAX = 50;
export const PIONEER_PERM_MAX = 100;
export const PIONEER_PERM_CITY = "Пермь";

export function defaultPioneerMaxForCity(city: string): number {
  return city.trim() === PIONEER_PERM_CITY ? PIONEER_PERM_MAX : PIONEER_DEFAULT_MAX;
}
