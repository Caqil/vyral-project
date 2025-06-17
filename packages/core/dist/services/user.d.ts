import { BaseService } from './base';
import { UserDocument } from '../models/user';
import { User, UserPreferences } from '../types/user';
export declare class UserService extends BaseService<UserDocument> {
    private cache;
    private jwtSecret;
    constructor(jwtSecret: string);
    createUser(data: Partial<User>): Promise<UserDocument>;
    authenticateUser(login: string, password: string): Promise<{
        user: UserDocument;
        token: string;
    }>;
    getUserById(id: string): Promise<UserDocument | null>;
    updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserDocument>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    verifyEmail(userId: string): Promise<void>;
    private generateToken;
    verifyToken(token: string): Promise<UserDocument | null>;
}
//# sourceMappingURL=user.d.ts.map