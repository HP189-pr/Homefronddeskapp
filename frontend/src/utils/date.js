// Simple date utilities for DD-MM-YYYY and IST date-time formatting

export const pad2 = (n) => String(n).padStart(2, '0');

// Convert ISO/Date to DD-MM-YYYY (alias for legacy usage)
export function isoToDMY(value) {
  return formatDateDMY(value);
}

// Convert DD-MM-YYYY (or DD/MM/YYYY) to ISO YYYY-MM-DD
export function dmyToISO(value) {
  if (!value) return '';
  const cleaned = String(value).trim().replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length < 3) return '';
  const [day, month, year] = parts;
  if (!day || !month || !year) return '';
  const iso = `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : iso;
}

export function formatDateDMY(value) {
  if (!value) return '';
  // value may be Date, string (YYYY-MM-DD), or ISO
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateTimeIST(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return fmt.format(d).replace(/\//g, '-'); // ensure dd-mm-yyyy style
}
