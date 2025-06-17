import { BaseService } from './base';
import { UserModel, UserDocument } from '../models/user';
import { User, UserPreferences } from '../types/user';
import { ConflictError, UnauthorizedError, ValidationError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import jwt from 'jsonwebtoken';
import { CacheManager } from '../utils/cache';

export class UserService extends BaseService<UserDocument> {
  private cache: CacheManager;
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    super(UserModel, 'UserService');
    this.cache = CacheManager.getInstance();
    this.jwtSecret = jwtSecret;
  }

  async createUser(data: Partial<User>): Promise<UserDocument> {
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

  async authenticateUser(login: string, password: string): Promise<{ user: UserDocument; token: string }> {
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

  async getUserById(id: string): Promise<UserDocument | null> {
    let user = await this.cache.get<UserDocument>(CACHE_KEYS.USER(id));
    
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

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserDocument> {
    const user = await this.updateByIdOrThrow(userId, {
      $set: { preferences }
    });

    // Clear cache
    await this.cache.delete(CACHE_KEYS.USER(userId));

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
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

  async verifyEmail(userId: string): Promise<void> {
    await this.updateByIdOrThrow(userId, {
      emailVerified: true,
      status: 'active'
    });

    // Clear cache
    await this.cache.delete(CACHE_KEYS.USER(userId));
  }

  private generateToken(user: UserDocument): string {
    return jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async verifyToken(token: string): Promise<UserDocument | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return await this.getUserById(decoded.userId);
    } catch (error) {
      return null;
    }
  }
}