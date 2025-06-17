import { BaseService } from './base';
import { UserModel } from '../models/user';
import { ConflictError, UnauthorizedError } from '../errors';
import { CacheManager } from '../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import jwt from 'jsonwebtoken';
export class UserService extends BaseService {
    cache;
    jwtSecret;
    constructor(jwtSecret) {
        super(UserModel, 'UserService');
        this.cache = CacheManager.getInstance();
        this.jwtSecret = jwtSecret;
    }
    async createUser(data) {
        // Check for existing username/email
        const existingUser = await this.model.findOne({
            $or: [
                { username: data.username },
                { email: data.email }
            ]
        });
        if (existingUser) {
            throw new ConflictError('Username or email already exists');
        }
        return this.create(data);
    }
    async authenticateUser(login, password) {
        const user = await this.model
            .findOne({
            $or: [{ username: login }, { email: login }],
            status: 'active'
        })
            .select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new UnauthorizedError('Invalid credentials');
        }
        // Update login stats
        await this.model.findByIdAndUpdate(user._id, {
            $set: { lastLogin: new Date() },
            $inc: { loginCount: 1 }
        });
        const token = this.generateToken(user);
        // Cache user
        await this.cache.set(CACHE_KEYS.USER(user._id.toString()), user, CACHE_TTL.MEDIUM);
        return { user, token };
    }
    async getUserById(id) {
        let user = await this.cache.get(CACHE_KEYS.USER(id));
        if (!user) {
            user = await this.findById(id, {
                populate: { path: 'avatar' }
            });
            if (user) {
                await this.cache.set(CACHE_KEYS.USER(id), user, CACHE_TTL.MEDIUM);
            }
        }
        return user;
    }
    async updateUserPreferences(userId, preferences) {
        const user = await this.updateByIdOrThrow(userId, {
            $set: { preferences }
        });
        // Clear cache
        await this.cache.delete(CACHE_KEYS.USER(userId));
        return user;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.model.findById(userId).select('+password');
        if (!user) {
            throw new UnauthorizedError('User not found');
        }
        if (!(await user.comparePassword(currentPassword))) {
            throw new UnauthorizedError('Current password is incorrect');
        }
        user.password = newPassword;
        await user.save();
        // Clear cache
        await this.cache.delete(CACHE_KEYS.USER(userId));
    }
    async verifyEmail(userId) {
        await this.updateByIdOrThrow(userId, {
            emailVerified: true,
            status: 'active'
        });
        // Clear cache
        await this.cache.delete(CACHE_KEYS.USER(userId));
    }
    generateToken(user) {
        return jwt.sign({
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, this.jwtSecret, { expiresIn: '7d' });
    }
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return await this.getUserById(decoded.userId);
        }
        catch (error) {
            return null;
        }
    }
}
//# sourceMappingURL=user.js.map