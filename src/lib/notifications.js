// Lightweight, dependency-free notice bus.
//
// Replaces alert()-style feedback with a consistent pattern that is announced
// to assistive technology (role="status" / role="alert") and stays visible long
// enough to read. Messages must never contain patient identifiers.
let items = [];
const listeners = new Set();
let seq = 0;

function emit() { listeners.forEach((fn) => fn([...items])); }

export function notify(message, tone = 'info', { timeoutMs = 8000 } = {}) {
  if (!message) return null;
  const id = ++seq;
  items = [...items, { id, message: String(message), tone }];
  emit();
  if (timeoutMs > 0 && typeof setTimeout === 'function') {
    setTimeout(() => dismiss(id), timeoutMs);
  }
  return id;
}

export const notifyInfo = (message) => notify(message, 'info');
export const notifySuccess = (message) => notify(message, 'success');
export const notifyError = (message) => notify(message, 'danger', { timeoutMs: 12000 });

export function dismiss(id) {
  items = items.filter((item) => item.id !== id);
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  fn([...items]);
  return () => listeners.delete(fn);
}

export function clearNotices() {
  items = [];
  emit();
}
