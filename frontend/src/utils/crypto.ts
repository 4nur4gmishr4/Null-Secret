/**
 * NULL-SECRET Cryptography Utility
 * Implements AES-GCM, PBKDF2 for optional password protection,
 * and ciphertext padding to mitigate traffic analysis.
 */

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const binary = atob(keyStr);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
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

function unpad(paddedJson: string): string {
  try {
    const parsed = JSON.parse(paddedJson);
    return parsed.d;
  } catch {
    return paddedJson;
  }
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function encrypt(text: string, key: CryptoKey): Promise<{ payload: string; iv: string }> {
  const paddedText = pad(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(paddedText);
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const payloadStr = await arrayBufferToBase64(encrypted);
  const ivStr = btoa(String.fromCharCode(...iv));

  return { payload: payloadStr, iv: ivStr };
}

export async function decrypt(payloadStr: string, ivStr: string, key: CryptoKey): Promise<string> {
  const payload = base64ToUint8Array(payloadStr);
  const iv = base64ToUint8Array(ivStr);

  const decrypted = await window.crypto.subtle.decrypt(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { name: 'AES-GCM', iv: iv as any },
    key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload as any
  );

  const paddedJson = new TextDecoder().decode(decrypted);
  return unpad(paddedJson);
}

export function bundle(payload: string, iv: string, salt?: string): string {
  return btoa(JSON.stringify({ p: payload, i: iv, s: salt }));
}

export function unbundle(bundled: string): { p: string; i: string; s?: string } {
  return JSON.parse(atob(bundled));
}
