import crypto from 'crypto';

const PROFILE_PHOTO_TTL_SEC = Number(process.env.PROFILE_PHOTO_TTL_SEC || 300);

function getSecret() {
  return String(
    process.env.MEDIA_SIGN_SECRET
      || process.env.JWT_SECRET
      || 'change-me-media-sign-secret',
  );
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

export function buildProfilePhotoUrl(userid, ttlSec = PROFILE_PHOTO_TTL_SEC) {
  const safeUser = String(userid || '').trim().toLowerCase();
  if (!safeUser) return null;

  const exp = Math.floor(Date.now() / 1000) + Math.max(30, Number(ttlSec || PROFILE_PHOTO_TTL_SEC));
  const payload = `profile-photo:${safeUser}:${exp}`;
  const sig = signPayload(payload);
  return `/api/profile/photo/${encodeURIComponent(safeUser)}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

export function verifyProfilePhotoSignature(userid, exp, sig) {
  const safeUser = String(userid || '').trim().toLowerCase();
  const expNum = Number(exp);
  const sigValue = String(sig || '').trim();

  if (!safeUser || !Number.isFinite(expNum) || !sigValue) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expNum < now) return false;

  const payload = `profile-photo:${safeUser}:${expNum}`;
  const expected = signPayload(payload);

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue));
  } catch {
    return false;
  }
}

export default {
  buildProfilePhotoUrl,
  verifyProfilePhotoSignature,
};