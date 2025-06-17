import { User } from '../types/user';
import { BaseDocument } from './base';
export interface UserDocument extends BaseDocument, User {
    comparePassword(password: string): Promise<boolean>;
    generateHash(password: string): Promise<string>;
}
export declare const UserModel: any;
//# sourceMappingURL=user.d.ts.map