import NepaliDate from 'nepali-date-converter';

export function nepaliToAd(value) {
  if (!value) return '';
  try {
    const date = new NepaliDate(String(value).replace(/-/g, '/'));
    return date.toJsDate().toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function adToNepali(value) {
  if (!value) return '';
  try {
    const date = new NepaliDate(new Date(`${value}T00:00:00`));
    return date.format('YYYY-MM-DD', 'en');
  } catch {
    return '';
  }
}

export function isValidNepaliDate(value) {
  return Boolean(nepaliToAd(value));
}
