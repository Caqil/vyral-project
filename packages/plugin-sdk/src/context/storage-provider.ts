import { PluginStorage } from "../types/plugin";
import { Logger } from "../utils/logger";


export class StorageProvider implements PluginStorage {
  private logger: Logger;
  private pluginId: string;
  private database: any;
  private collectionName: string;

  constructor(pluginId: string, database: any) {
    this.pluginId = pluginId;
    this.database = database;
    this.collectionName = 'plugin_storage';
    this.logger = new Logger(`StorageProvider:${pluginId}`);
  }

  /**
   * Get a value from plugin storage
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const collection = this.database.collection(this.collectionName);
      const document = await collection.findOne({
        pluginId: this.pluginId,
        key: key
      });

      if (!document) {
        this.logger.debug(`Storage key not found: ${key}`);
        return null;
      }

      this.logger.debug(`Retrieved storage value for key: ${key}`);
      return document.value as T;
    } catch (error) {
      this.logger.error(`Error getting storage value for key ${key}:`, error);
      throw new Error(`Failed to get storage value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set a value in plugin storage
   */
  public async set<T>(key: string, value: T): Promise<void> {
    try {
      const collection = this.database.collection(this.collectionName);
      
      const document = {
        pluginId: this.pluginId,
        key: key,
        value: value,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.updateOne(
        { pluginId: this.pluginId, key: key },
        { 
          $set: {
            value: value,
            updatedAt: new Date()
          },
          $setOnInsert: {
            pluginId: this.pluginId,
            key: key,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      this.logger.debug(`Set storage value for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting storage value for key ${key}:`, error);
      throw new Error(`Failed to set storage value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a value from plugin storage
   */
  public async delete(key: string): Promise<void> {
    try {
      const collection = this.database.collection(this.collectionName);
      const result = await collection.deleteOne({
        pluginId: this.pluginId,
        key: key
      });

      if (result.deletedCount === 0) {
        this.logger.debug(`Storage key not found for deletion: ${key}`);
      } else {
        this.logger.debug(`Deleted storage value for key: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting storage value for key ${key}:`, error);
      throw new Error(`Failed to delete storage value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all keys for this plugin
   */
  public async keys(): Promise<string[]> {
    try {
      const collection = this.database.collection(this.collectionName);
      const documents = await collection.find(
        { pluginId: this.pluginId },
        { projection: { key: 1, _id: 0 } }
      ).toArray();

      const keys = documents.map(doc => doc.key);
      this.logger.debug(`Retrieved ${keys.length} storage keys`);
      return keys;
    } catch (error) {
      this.logger.error('Error getting storage keys:', error);
      throw new Error(`Failed to get storage keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all storage for this plugin
   */
  public async clear(): Promise<void> {
    try {
      const collection = this.database.collection(this.collectionName);
      const result = await collection.deleteMany({
        pluginId: this.pluginId
      });

      this.logger.debug(`Cleared ${result.deletedCount} storage entries`);
    } catch (error) {
      this.logger.error('Error clearing storage:', error);
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple values at once
   */
  public async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const collection = this.database.collection(this.collectionName);
      const documents = await collection.find({
        pluginId: this.pluginId,
        key: { $in: keys }
      }).toArray();

      const result = new Map<string, T | null>();
      
      // Initialize all keys with null
      keys.forEach(key => result.set(key, null));
      
      // Set found values
      documents.forEach(doc => {
        result.set(doc.key, doc.value as T);
      });

      this.logger.debug(`Retrieved ${documents.length}/${keys.length} storage values`);
      return result;
    } catch (error) {
      this.logger.error('Error getting multiple storage values:', error);
      throw new Error(`Failed to get multiple storage values: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set multiple values at once
   */
  public async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    try {
      const collection = this.database.collection(this.collectionName);
      const operations = Array.from(entries.entries()).map(([key, value]) => ({
        updateOne: {
          filter: { pluginId: this.pluginId, key: key },
          update: {
            $set: {
              value: value,
              updatedAt: new Date()
            },
            $setOnInsert: {
              pluginId: this.pluginId,
              key: key,
              createdAt: new Date()
            }
          },
          upsert: true
        }
      }));

      if (operations.length > 0) {
        await collection.bulkWrite(operations);
        this.logger.debug(`Set ${operations.length} storage values`);
      }
    } catch (error) {
      this.logger.error('Error setting multiple storage values:', error);
      throw new Error(`Failed to set multiple storage values: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a key exists
   */
  public async has(key: string): Promise<boolean> {
    try {
      const collection = this.database.collection(this.collectionName);
      const count = await collection.countDocuments({
        pluginId: this.pluginId,
        key: key
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking if storage key exists ${key}:`, error);
      throw new Error(`Failed to check storage key existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the size (number of entries) for this plugin
   */
  public async size(): Promise<number> {
    try {
      const collection = this.database.collection(this.collectionName);
      const count = await collection.countDocuments({
        pluginId: this.pluginId
      });

      this.logger.debug(`Storage contains ${count} entries`);
      return count;
    } catch (error) {
      this.logger.error('Error getting storage size:', error);
      throw new Error(`Failed to get storage size: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage statistics for this plugin
   */
  public async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const collection = this.database.collection(this.collectionName);
      
      const [countResult, statsResult] = await Promise.all([
        collection.countDocuments({ pluginId: this.pluginId }),
        collection.aggregate([
          { $match: { pluginId: this.pluginId } },
          {
            $group: {
              _id: null,
              totalSize: { $sum: { $bsonSize: "$$ROOT" } },
              oldestEntry: { $min: "$createdAt" },
              newestEntry: { $max: "$updatedAt" }
            }
          }
        ]).toArray()
      ]);

      const stats = statsResult[0] || {
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };

      return {
        totalEntries: countResult,
        totalSize: stats.totalSize,
        oldestEntry: stats.oldestEntry,
        newestEntry: stats.newestEntry
      };
    } catch (error) {
      this.logger.error('Error getting storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export all storage data for this plugin
   */
  public async export(): Promise<Record<string, any>> {
    try {
      const collection = this.database.collection(this.collectionName);
      const documents = await collection.find(
        { pluginId: this.pluginId },
        { projection: { key: 1, value: 1, _id: 0 } }
      ).toArray();

      const exportData: Record<string, any> = {};
      documents.forEach(doc => {
        exportData[doc.key] = doc.value;
      });

      this.logger.debug(`Exported ${documents.length} storage entries`);
      return exportData;
    } catch (error) {
      this.logger.error('Error exporting storage data:', error);
      throw new Error(`Failed to export storage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import storage data for this plugin
   */
  public async import(data: Record<string, any>, overwrite: boolean = false): Promise<void> {
    try {
      const entries = new Map<string, any>();
      Object.entries(data).forEach(([key, value]) => {
        entries.set(key, value);
      });

      if (!overwrite) {
        // Filter out existing keys
        const existingKeys = await this.keys();
        const existingKeySet = new Set(existingKeys);
        
        for (const key of entries.keys()) {
          if (existingKeySet.has(key)) {
            entries.delete(key);
          }
        }
      }

      if (entries.size > 0) {
        await this.setMultiple(entries);
        this.logger.debug(`Imported ${entries.size} storage entries`);
      } else {
        this.logger.debug('No new entries to import');
      }
    } catch (error) {
      this.logger.error('Error importing storage data:', error);
      throw new Error(`Failed to import storage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}