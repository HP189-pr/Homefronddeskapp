// Utilities to handle DD-MM-YYYY parsing and formatting on backend

const DMY_REGEX = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
const ISO_DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})[T\s].*$/;

function isValidYmd(year, month, day) {
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

export function parseDMYtoISO(str) {
  if (typeof str !== 'string') return null;
  const value = str.trim();
  if (!value) return null;

  const m = DMY_REGEX.exec(value);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (!isValidYmd(year, month, day)) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractIsoDate(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  let m = ISO_DATE_ONLY_REGEX.exec(s);
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  m = ISO_PREFIX_REGEX.exec(s);
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return null;
}

export function formatISOtoDMY(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    const dmy = parseDMYtoISO(value);
    if (dmy) {
      const [, y, m, d] = dmy.match(ISO_DATE_ONLY_REGEX);
      return `${d}-${m}-${y}`;
    }

    const iso = extractIsoDate(value);
    if (iso && isValidYmd(iso.year, iso.month, iso.day)) {
      return `${String(iso.day).padStart(2, '0')}-${String(iso.month).padStart(2, '0')}-${iso.year}`;
    }
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getUTCFullYear();
    const month = value.getUTCMonth() + 1;
    const day = value.getUTCDate();
    if (!isValidYmd(year, month, day)) return null;
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
  }

  return null;
}

function isDateKeyName(key) {
  const k = String(key || '').toLowerCase();
  return k === 'date' || k.endsWith('_date') || ['from', 'to', 'created_at', 'updated_at'].includes(k);
}

// Recursively walk an object and convert DMY strings to ISO for keys that look like dates
export function normalizeDMYDates(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const walk = (node) => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        node[i] = walk(node[i]);
      }
      return node;
    }

    if (!node || typeof node !== 'object') return node;

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object') {
        node[key] = walk(value);
      } else if (typeof value === 'string' && isDateKeyName(key)) {
        const maybeISO = parseDMYtoISO(value);
        if (maybeISO) node[key] = maybeISO;
      }
    }
    return node;
  };

  return walk(obj);
}

export function mapDateKeysToDMY(record, keys = []) {
  if (!record || typeof record !== 'object') return record;
  const out = { ...record };
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) continue;
    const formatted = formatISOtoDMY(out[key]);
    if (formatted) out[key] = formatted;
  }
  return out;
}
