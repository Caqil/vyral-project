const crypto = require('crypto');
const { MongoClient } = require('mongodb');

class TokenService {
  constructor(config) {
    this.config = config;
    this.encryptionKey = process.env.OAUTH_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.mongoClient = null;
    this.db = null;
  }

  async connect() {
    if (!this.mongoClient) {
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db();
    }
    return this.db;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  async storeToken(userId, provider, tokenData) {
    try {
      const db = await this.connect();
      
      // Encrypt sensitive token data
      const encryptedAccessToken = this.encrypt(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? 
        this.encrypt(tokenData.refresh_token) : null;

      const tokenRecord = {
        userId,
        provider,
        providerId: tokenData.user_id || tokenData.id || 'unknown',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokenData.expires_in ? 
          new Date(Date.now() + tokenData.expires_in * 1000) : null,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        profile: tokenData.profile || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Upsert token (update if exists, insert if not)
      const result = await db.collection('oauth_tokens').replaceOne(
        { userId, provider },
        tokenRecord,
        { upsert: true }
      );

      console.log(`💾 OAuth token stored for user ${userId}, provider ${provider}`);
      return { ...tokenRecord, _id: result.upsertedId };
    } catch (error) {
      console.error('❌ Token storage error:', error);
      throw error;
    }
  }

  async getToken(userId, provider) {
    try {
      const db = await this.connect();
      
      const tokenRecord = await db.collection('oauth_tokens').findOne({
        userId,
        provider
      });

      if (!tokenRecord) {
        console.log(`🔍 No OAuth token found for user ${userId}, provider ${provider}`);
        return null;
      }

      // Decrypt tokens before returning
      const decryptedToken = {
        ...tokenRecord,
        accessToken: this.decrypt(tokenRecord.accessToken),
        refreshToken: tokenRecord.refreshToken ? 
          this.decrypt(tokenRecord.refreshToken) : null
      };

      console.log(`🔍 OAuth token retrieved for user ${userId}, provider ${provider}`);
      return decryptedToken;
    } catch (error) {
      console.error('❌ Token retrieval error:', error);
      throw error;
    }
  }

  async refreshToken(userId, provider, refreshToken) {
    try {
      console.log(`🔄 Refreshing OAuth token for user ${userId}, provider ${provider}`);
      
      // This would integrate with the actual OAuth provider's refresh endpoint
      // For now, return a mock response
      const refreshedTokenData = {
        access_token: 'new_access_token_' + Date.now(),
        refresh_token: refreshToken, // Usually stays the same
        expires_in: 3600,
        token_type: 'Bearer'
      };

      // Store the refreshed token
      await this.storeToken(userId, provider, refreshedTokenData);
      
      return refreshedTokenData;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
  }

  async revokeToken(userId, provider) {
    try {
      const db = await this.connect();
      
      const result = await db.collection('oauth_tokens').deleteOne({
        userId,
        provider
      });

      console.log(`🗑️  OAuth token revoked for user ${userId}, provider ${provider}`);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Token revocation error:', error);
      throw error;
    }
  }

  async getUserTokens(userId) {
    try {
      const db = await this.connect();
      
      const tokens = await db.collection('oauth_tokens').find({
        userId
      }).toArray();

      return tokens.map(token => ({
        provider: token.provider,
        providerId: token.providerId,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        profile: token.profile,
        createdAt: token.createdAt
      }));
    } catch (error) {
      console.error('❌ Error fetching user tokens:', error);
      throw error;
    }
  }

  async getExpiredTokens() {
    try {
      const db = await this.connect();
      
      const expiredTokens = await db.collection('oauth_tokens').find({
        expiresAt: { $lt: new Date() }
      }).toArray();

      return expiredTokens;
    } catch (error) {
      console.error('❌ Error fetching expired tokens:', error);
      throw error;
    }
  }

  async getUsageStats() {
    try {
      const db = await this.connect();
      
      const stats = await db.collection('oauth_tokens').aggregate([
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [
                  { $gt: ['$expiresAt', new Date()] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

      const totalTokens = await db.collection('oauth_tokens').countDocuments();
      const activeTokens = await db.collection('oauth_tokens').countDocuments({
        expiresAt: { $gt: new Date() }
      });
      
      const providerBreakdown = {};
      stats.forEach(stat => {
        providerBreakdown[stat._id] = {
          total: stat.count,
          active: stat.activeCount
        };
      });

      return {
        totalTokens,
        activeTokens,
        expiredTokens: totalTokens - activeTokens,
        providerBreakdown
      };
    } catch (error) {
      console.error('❌ Stats retrieval error:', error);
      return {
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0,
        providerBreakdown: {}
      };
    }
  }

  async cleanupExpiredTokens() {
    try {
      const db = await this.connect();
      
      const result = await db.collection('oauth_tokens').deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} expired OAuth tokens`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Token cleanup error:', error);
      throw error;
    }
  }

  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async disconnect() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.db = null;
    }
  }
}

module.exports = TokenService;