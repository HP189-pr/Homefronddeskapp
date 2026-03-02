// Shared date helpers: convert between ISO (yyyy-mm-dd) and DMY (dd-mm-yyyy)

export function pad2(n) {
  return String(n).padStart(2, '0');
}

function isValidDateParts(y, mo, d) {
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function extractISODateParts(value) {
  const s = String(value || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { y: m[1], mo: m[2], d: m[3] };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
  if (m) return { y: m[1], mo: m[2], d: m[3] };
  return null;
}

export function isoToDMY(iso) {
  if (!iso) return '';
  const parts = extractISODateParts(iso);
  if (parts && isValidDateParts(parts.y, parts.mo, parts.d)) {
    return `${parts.d}-${parts.mo}-${parts.y}`;
  }

  // Already in dd-mm-yyyy: return normalized form
  let m = String(iso).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (!isValidDateParts(y, mo, d)) return '';
    d = pad2(d);
    mo = pad2(mo);
    return `${d}-${mo}-${y}`;
  }
  return '';
}

export function dmyToISO(dmy) {
  if (!dmy) return '';
  const s = String(dmy).trim();
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (!m) return '';
  let [, d, mo, y] = m;
  if (!isValidDateParts(y, mo, d)) return '';
  d = pad2(d);
  mo = pad2(mo);
  return `${y}-${mo}-${d}`;
}

export function toDisplayDate(value) {
  return isoToDMY(value);
}

export function toApiDate(value) {
  if (!value) return '';
  const isoParts = extractISODateParts(value);
  if (isoParts && isValidDateParts(isoParts.y, isoParts.mo, isoParts.d)) {
    return `${isoParts.y}-${isoParts.mo}-${isoParts.d}`;
  }
  return dmyToISO(value);
}

export function normalizeIsoDate(value) {
  return toApiDate(value) || '';
}
