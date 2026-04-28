/**
 * NULL-SECRET Cryptography Utility
 * Implements AES-GCM, PBKDF2 for optional password protection,
 * and ciphertext padding to mitigate traffic analysis.
 */

const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 minimum for PBKDF2-SHA256
const AES_KEY_LENGTH_BYTES = 32;
const AES_GCM_IV_LENGTH_BYTES = 12;
const MIN_PBKDF2_SALT_BYTES = 16;
const BASE64_CHUNK = 0x8000;

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  if (!password) throw new Error('password is required');
  if (salt.byteLength < MIN_PBKDF2_SALT_BYTES) {
    throw new Error(`salt must be at least ${MIN_PBKDF2_SALT_BYTES} bytes`);
  }
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  if (!keyStr) throw new Error('keyStr is required');
  const bytes = base64ToUint8Array(keyStr);
  if (bytes.byteLength !== AES_KEY_LENGTH_BYTES) {
    throw new Error(`invalid AES-256 key length: ${bytes.byteLength}`);
  }
  return window.crypto.subtle.importKey(
    'raw',
    bytes,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Pads the text to the nearest bucket size (1KB, 5KB, 10KB)
 * to prevent length-based metadata leakage.
 */
function pad(text: string): string {
  const buckets = [1024, 5120, 10240];
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const size = encoded.length;

  let targetSize = size;
  for (const b of buckets) {
    if (size <= b) {
      targetSize = b;
      break;
    }
  }

  if (targetSize === size) {
    // If it exceeds the largest bucket, we pad to the nearest 10KB boundary.
    targetSize = Math.ceil(size / 10240) * 10240;
  }

  return JSON.stringify({ d: text, p: 'x'.repeat(targetSize - size) });
}

interface PaddedEnvelope {
  readonly d: string;
  readonly p: string;
}

function isPaddedEnvelope(value: unknown): value is PaddedEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PaddedEnvelope).d === 'string' &&
    typeof (value as PaddedEnvelope).p === 'string'
  );
}

function unpad(paddedJson: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(paddedJson);
  } catch (cause) {
    throw new Error('decryption produced non-JSON output', { cause });
  }
  if (!isPaddedEnvelope(parsed)) {
    throw new Error('decryption envelope schema invalid');
  }
  return parsed.d;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  readonly payload: string;
  readonly iv: string;
}

export async function encrypt(text: string, key: CryptoKey): Promise<EncryptedPayload> {
  const paddedText = pad(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH_BYTES));
  const encoded = new TextEncoder().encode(paddedText);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    payload: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength)),
  };
}

export async function decrypt(payloadStr: string, ivStr: string, key: CryptoKey): Promise<string> {
  const payload = base64ToUint8Array(payloadStr);
  const iv = base64ToUint8Array(ivStr);
  if (iv.byteLength !== AES_GCM_IV_LENGTH_BYTES) {
    throw new Error(`invalid AES-GCM IV length: ${iv.byteLength}`);
  }

  let decrypted: ArrayBuffer;
  try {
    decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      payload
    );
  } catch (cause) {
    throw new Error('decryption failed: tag mismatch or wrong key', { cause });
  }

  return unpad(new TextDecoder().decode(decrypted));
}

export interface SecretBundle {
  readonly p: string;
  readonly i: string;
  readonly s?: string;
}

export function bundle(payload: string, iv: string, salt?: string): string {
  const value: SecretBundle = { p: payload, i: iv, s: salt };
  return btoa(JSON.stringify(value));
}

export function unbundle(bundled: string): SecretBundle {
  let raw: string;
  try {
    raw = atob(bundled);
  } catch (cause) {
    throw new Error('bundle is not valid base64', { cause });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error('bundle is not valid JSON', { cause });
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as SecretBundle).p !== 'string' ||
    typeof (parsed as SecretBundle).i !== 'string'
  ) {
    throw new Error('bundle schema invalid');
  }
  const candidate = parsed as SecretBundle;
  if (candidate.s !== undefined && typeof candidate.s !== 'string') {
    throw new Error('bundle schema invalid');
  }
  return candidate;
}
