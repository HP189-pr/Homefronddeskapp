const DEFAULT_JWT_SECRET = 'change-me-secret';

function normalizeSecret(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || '';
  }

  return trimmed;
}

export function getJwtSecrets() {
  const candidates = [
    process.env.JWT_SECRET,
    process.env.JWT_SECRET_FALLBACK,
    process.env.SECRET_KEY,
    process.env.APP_SECRET,
    DEFAULT_JWT_SECRET,
  ]
    .map(normalizeSecret)
    .filter(Boolean);

  return [...new Set(candidates)];
}

export function getPrimaryJwtSecret() {
  return getJwtSecrets()[0] || DEFAULT_JWT_SECRET;
}
