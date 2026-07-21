export function isProfileCityFilled(city: string | null | undefined): boolean {
  return Boolean(city?.trim());
}

export function shouldShowProfileOnboarding(params: {
  pathname: string;
  isAuthed: boolean;
  profileCity: string | null | undefined;
}): boolean {
  return (
    params.pathname === "/map" &&
    params.isAuthed &&
    !isProfileCityFilled(params.profileCity)
  );
}
