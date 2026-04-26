import { zipSync } from 'fflate';
import { generateKey, deriveKeyFromPassword, exportKey, encrypt, bundle } from '../utils/crypto';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
  }
  return btoa(binary);
}

self.onmessage = async (e: MessageEvent) => {
  const { text, files, password } = e.data;

  try {
    let key = await generateKey();
    let saltStr: string | undefined;

    if (password) {
      const salt = self.crypto.getRandomValues(new Uint8Array(16));
      saltStr = btoa(String.fromCharCode(...salt));
      key = await deriveKeyFromPassword(password, salt);
    }

    const keyStr = await exportKey(key);
    let plaintext = text;

    if (files && files.length > 0) {
      let fileData;
      if (files.length === 1) {
        const f = files[0];
        const base64 = uint8ArrayToBase64(f.data);
        fileData = { name: f.name, type: 'application/octet-stream', data: `data:application/octet-stream;base64,${base64}` };
      } else {
        const zipObj: Record<string, Uint8Array> = {};
        files.forEach((f: any) => zipObj[f.name] = f.data);
        const zipped = zipSync(zipObj);
        const zipBase64 = uint8ArrayToBase64(zipped);
        fileData = { name: 'secure_attachments.zip', type: 'application/zip', data: `data:application/zip;base64,${zipBase64}` };
      }

      plaintext = JSON.stringify({
        text: text,
        file: fileData
      });
    } else {
      plaintext = JSON.stringify({ text: text });
    }

    const { payload, iv } = await encrypt(plaintext, key);
    const bundled = bundle(payload, iv, saltStr);

    self.postMessage({ success: true, bundled, keyStr });

  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
