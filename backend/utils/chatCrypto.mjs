// backend/utils/chatCrypto.mjs
import crypto from 'crypto';

// Derive a stable 32-byte key from CHAT_SECRET or fallback JWT_SECRET
function getKey() {
  const secret = process.env.CHAT_SECRET || process.env.JWT_SECRET || 'change-me-secret';
  // Hash to 32 bytes
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * encryptText(plain) -> string
 * Returns a compact encoded string: enc:v1:<b64(iv)>:<b64(tag)>:<b64(cipher)>
 */
export function encryptText(plain) {
  try {
    if (plain == null) return plain;
    const text = String(plain);
    if (!text) return text; // do not wrap empty
    // Avoid double encryption
    if (text.startsWith('enc:v1:')) return text;
    const key = getKey();
    const iv = crypto.randomBytes(12); // GCM recommended 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  } catch (_) {
    // On error, fall back to original plain (avoid data loss)
    return plain;
  }
}

/**
 * decryptText(stored) -> string
 * Accepts clear text or enc:v1 formatted string; returns clear text on success, original on failure.
 */
export function decryptText(stored) {
  try {
    if (stored == null) return stored;
    const s = String(stored);
    if (!s.startsWith('enc:v1:')) return s;
    const parts = s.split(':');
    if (parts.length !== 5) return s;
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const data = Buffer.from(parts[4], 'base64');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (_) {
    // On failure, return original string to avoid breaking clients
    return stored;
  }
}

export default { encryptText, decryptText };
