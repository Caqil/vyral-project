export declare const DEFAULT_PAGINATION: {
    readonly page: 1;
    readonly limit: 10;
    readonly maxLimit: 100;
};
export declare const CACHE_KEYS: {
    readonly POST: (id: string) => string;
    readonly POST_LIST: (params: string) => string;
    readonly CATEGORY: (id: string) => string;
    readonly TAG: (id: string) => string;
    readonly USER: (id: string) => string;
    readonly SETTINGS: "settings";
    readonly NAVIGATION: (location: string) => string;
};
export declare const CACHE_TTL: {
    readonly SHORT: 300;
    readonly MEDIUM: 1800;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
};
export declare const UPLOAD_LIMITS: {
    readonly MAX_FILE_SIZE: number;
    readonly MAX_FILES: 10;
    readonly ALLOWED_EXTENSIONS: readonly ["jpg", "jpeg", "png", "gif", "webp", "svg", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z", "mp3", "wav", "ogg", "mp4", "avi", "mov", "wmv", "flv"];
};
export declare const IMAGE_SIZES: {
    readonly thumbnail: {
        readonly width: 150;
        readonly height: 150;
    };
    readonly small: {
        readonly width: 300;
        readonly height: 300;
    };
    readonly medium: {
        readonly width: 600;
        readonly height: 400;
    };
    readonly large: {
        readonly width: 1200;
        readonly height: 800;
    };
    readonly xl: {
        readonly width: 1920;
        readonly height: 1080;
    };
};
export declare const USER_PERMISSIONS: {
    readonly 'content.create': "Create content";
    readonly 'content.read': "Read content";
    readonly 'content.update': "Update content";
    readonly 'content.delete': "Delete content";
    readonly 'content.publish': "Publish content";
    readonly 'users.create': "Create users";
    readonly 'users.read': "Read users";
    readonly 'users.update': "Update users";
    readonly 'users.delete': "Delete users";
    readonly 'media.upload': "Upload media";
    readonly 'media.delete': "Delete media";
    readonly 'media.manage': "Manage media library";
    readonly 'settings.read': "Read settings";
    readonly 'settings.update': "Update settings";
    readonly 'plugins.manage': "Manage plugins";
    readonly 'themes.manage': "Manage themes";
    readonly 'system.backup': "Create backups";
};
export declare const ROLE_PERMISSIONS: {
    readonly super_admin: string[];
    readonly admin: readonly ["content.create", "content.read", "content.update", "content.delete", "content.publish", "users.create", "users.read", "users.update", "users.delete", "media.upload", "media.delete", "media.manage", "settings.read", "settings.update"];
    readonly editor: readonly ["content.create", "content.read", "content.update", "content.delete", "content.publish", "users.read", "media.upload", "media.delete", "media.manage"];
    readonly author: readonly ["content.create", "content.read", "content.update", "content.publish", "media.upload"];
    readonly contributor: readonly ["content.create", "content.read", "content.update", "media.upload"];
    readonly subscriber: readonly ["content.read"];
};
//# sourceMappingURL=index.d.ts.map