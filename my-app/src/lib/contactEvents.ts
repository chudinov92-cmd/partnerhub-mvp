/** Событие для обновления бейджа контактов в TopBar после insert/delete в profile_contacts */
export const PROFILE_CONTACTS_CHANGED_EVENT = "zeip-profile-contacts-changed";

export function notifyProfileContactsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILE_CONTACTS_CHANGED_EVENT));
}
