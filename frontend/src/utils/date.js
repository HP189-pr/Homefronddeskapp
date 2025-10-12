// Simple date utilities for DD-MM-YYYY and IST date-time formatting

const pad2 = (n) => String(n).padStart(2, '0');

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
