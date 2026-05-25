/** Событие для обновления счётчика полезных контактов в TopBar */
export const USEFUL_CONTACTS_CHANGED_EVENT = "zeip-useful-contacts-changed";

export function notifyUsefulContactsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USEFUL_CONTACTS_CHANGED_EVENT));
}
