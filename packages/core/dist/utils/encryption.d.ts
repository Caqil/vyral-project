export declare function hashPassword(password: string, salt?: string): {
    hash: string;
    salt: string;
};
export declare function verifyPassword(password: string, hash: string, salt: string): boolean;
export declare function generateToken(length?: number): string;
export declare function generateApiKey(): string;
export declare function encrypt(text: string, key: string): {
    encrypted: string;
    iv: string;
};
export declare function decrypt(encryptedData: {
    encrypted: string;
    iv: string;
}, key: string): string;
//# sourceMappingURL=encryption.d.ts.map