// Utilities to handle DD-MM-YYYY parsing and formatting on backend

const DMY_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;

export function parseDMYtoISO(str) {
  if (typeof str !== 'string') return null;
  const m = DMY_REGEX.exec(str.trim());
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999)) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function formatISOtoDMY(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Recursively walk an object and convert DMY strings to ISO for keys that look like dates
export function normalizeDMYDates(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const isDateKey = (k) => k.toLowerCase() === 'date' || k.endsWith('_date') || ['from', 'to', 'created_at', 'updated_at'].includes(k.toLowerCase());
  const walk = (o) => {
    if (!o || typeof o !== 'object') return o;
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object') {
        o[k] = walk(v);
      } else if (typeof v === 'string') {
        const maybeISO = parseDMYtoISO(v);
        if (maybeISO && isDateKey(k)) {
          o[k] = maybeISO;
        }
      }
    }
    return o;
  };
  return walk(obj);
}
