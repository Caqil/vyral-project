import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + finalSalt).digest('hex');
  return { hash, salt: finalSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateApiKey(): string {
  return 'vk_' + randomBytes(24).toString('hex');
}

export function encrypt(text: string, key: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex') };
}

export function decrypt(encryptedData: { encrypted: string; iv: string }, key: string): string {
  const encryptedText = Buffer.from(encryptedData.encrypted, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(encryptedData.iv, 'hex'));
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}