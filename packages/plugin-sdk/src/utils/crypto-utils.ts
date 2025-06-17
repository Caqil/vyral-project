import { createHash, createHmac, randomBytes } from 'crypto';

export function hash(data: string, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(data).digest('hex');
}

export function hmac(data: string, key: string, algorithm: string = 'sha256'): string {
  return createHmac(algorithm, key).update(data).digest('hex');
}

export function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateApiKey(): string {
  return 'vk_' + randomBytes(24).toString('hex');
}

export function validateSignature(data: string, signature: string, secret: string): boolean {
  const expectedSignature = hmac(data, secret);
  return signature === expectedSignature;
}

export function createSignature(data: string, secret: string): string {
  return hmac(data, secret);
}

export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

export function generateChecksum(data: string): string {
  return hash(data, 'md5');
}
