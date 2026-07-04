import CryptoJS from 'crypto-js';

const SECRET = 'envelope-printer-secret-2024';

export function encrypt(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, SECRET).toString();
}

export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}
