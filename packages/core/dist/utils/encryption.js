import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
export function hashPassword(password, salt) {
    const finalSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(password + finalSalt).digest('hex');
    return { hash, salt: finalSalt };
}
export function verifyPassword(password, hash, salt) {
    const { hash: computedHash } = hashPassword(password, salt);
    return computedHash === hash;
}
export function generateToken(length = 32) {
    return randomBytes(length).toString('hex');
}
export function generateApiKey() {
    return 'vk_' + randomBytes(24).toString('hex');
}
export function encrypt(text, key) {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex') };
}
export function decrypt(encryptedData, key) {
    const encryptedText = Buffer.from(encryptedData.encrypted, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(encryptedData.iv, 'hex'));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
//# sourceMappingURL=encryption.js.map