import CryptoJS from "crypto-js";

// Encryption key - in production, use a secure env variable
// For now, we'll use a default that should be overridden in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
