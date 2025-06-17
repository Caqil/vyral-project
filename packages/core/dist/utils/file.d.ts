/// <reference types="node" />
/// <reference types="node" />
export interface FileValidationOptions {
    maxSize?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
}
export interface FileInfo {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
}
export declare function validateFile(file: {
    name: string;
    size: number;
    type: string;
}, options?: FileValidationOptions): {
    valid: boolean;
    errors: string[];
};
export declare function getFileExtension(filename: string): string;
export declare function generateFileHash(buffer: Buffer): string;
export declare function generateUniqueFilename(originalName: string, hash?: string): string;
export declare function humanFileSize(bytes: number): string;
export declare function getImageDimensions(file: File): Promise<{
    width: number;
    height: number;
}>;
//# sourceMappingURL=file.d.ts.map