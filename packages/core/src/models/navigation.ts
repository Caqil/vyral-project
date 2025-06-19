import { Schema, model, models } from 'mongoose';
import slugify from 'slugify';
import { Navigation, NavigationItem } from '../types/system';
import { createBaseSchema, BaseDocument } from './base';

export interface NavigationDocument extends BaseDocument, Omit<Navigation, '_id'> {}

const NavigationItemConditionsSchema = new Schema({
  loggedIn: {
    type: Boolean
  },
  roles: [{
    type: String,
    enum: ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']
  }],
  permissions: [String]
}, { _id: false });

const NavigationItemSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['page', 'post', 'category', 'tag', 'custom', 'external'],
    required: true
  },
  target: {
    type: String,
    enum: ['_self', '_blank'],
    default: '_self'
  },
  cssClass: {
    type: String,
    trim: true,
    maxlength: 100
  },
  order: {
    type: Number,
    default: 0
  },
  parent: {
    type: String
  },
  conditions: NavigationItemConditionsSchema
}, { _id: false });

// Add children as a virtual field since it's circular
NavigationItemSchema.add({
  children: [NavigationItemSchema]
});

const NavigationSchema = createBaseSchema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  items: [NavigationItemSchema],
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    enum: [
      'header',
      'footer',
      'sidebar',
      'mobile',
      'breadcrumb',
      'social',
      'admin',
      'custom'
    ]
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Indexes
NavigationSchema.index({ location: 1, isActive: 1 });
NavigationSchema.index({ name: 'text' });

// Virtual for item count
NavigationSchema.virtual('itemCount').get(function() {
  return this.items ? this.items.length : 0;
});

// Pre-save middleware to generate slug
NavigationSchema.pre('save', async function(next) {
  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await models.Navigation?.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }

  // Generate IDs for items that don't have them
  if (this.items) {
    this.items.forEach((item: any, index: number) => {
      if (!item.id) {
        item.id = `item-${Date.now()}-${index}`;
      }
      
      // Recursively handle children
      if (item.children && item.children.length > 0) {
        item.children.forEach((child: any, childIndex: number) => {
          if (!child.id) {
            child.id = `child-${Date.now()}-${index}-${childIndex}`;
          }
        });
      }
    });
  }

  next();
});

// Instance method to sort items by order
NavigationSchema.methods.sortItems = function() {
  if (this.items) {
    this.items.sort((a: any, b: any) => a.order - b.order);
    
    // Sort children too
    this.items.forEach((item: any) => {
      if (item.children && item.children.length > 0) {
        item.children.sort((a: any, b: any) => a.order - b.order);
      }
    });
  }
  return this;
};

// Instance method to add item
NavigationSchema.methods.addItem = function(item: Partial<NavigationItem>) {
  if (!this.items) {
    this.items = [];
  }

  const newItem = {
    id: item.id || `item-${Date.now()}-${this.items.length}`,
    label: item.label || 'New Item',
    url: item.url || '#',
    type: item.type || 'custom',
    target: item.target || '_self',
    order: item.order ?? this.items.length,
    ...item
  };

  this.items.push(newItem);
  this.sortItems();
  return newItem;
};

// Instance method to remove item
NavigationSchema.methods.removeItem = function(itemId: string) {
  if (!this.items) return false;

  const index = this.items.findIndex((item: any) => item.id === itemId);
  if (index > -1) {
    this.items.splice(index, 1);
    return true;
  }

  // Check children
  for (const item of this.items) {
    if (item.children) {
      const childIndex = item.children.findIndex((child: any) => child.id === itemId);
      if (childIndex > -1) {
        item.children.splice(childIndex, 1);
        return true;
      }
    }
  }

  return false;
};

// Instance method to update item
NavigationSchema.methods.updateItem = function(itemId: string, updates: Partial<NavigationItem>) {
  if (!this.items) return false;

  // Find in top-level items
  const item = this.items.find((item: any) => item.id === itemId);
  if (item) {
    Object.assign(item, updates);
    this.sortItems();
    return true;
  }

  // Find in children
  for (const parentItem of this.items) {
    if (parentItem.children) {
      const childItem = parentItem.children.find((child: any) => child.id === itemId);
      if (childItem) {
        Object.assign(childItem, updates);
        this.sortItems();
        return true;
      }
    }
  }

  return false;
};

// Static method to get navigation by location
NavigationSchema.statics.getByLocation = async function(location: string, activeOnly: boolean = true) {
  const filter: any = { location };
  if (activeOnly) {
    filter.isActive = true;
  }

  const navigation = await this.findOne(filter).lean();
  if (navigation && navigation.items) {
    // Sort items by order
    navigation.items.sort((a: any, b: any) => a.order - b.order);
    navigation.items.forEach((item: any) => {
      if (item.children && item.children.length > 0) {
        item.children.sort((a: any, b: any) => a.order - b.order);
      }
    });
  }

  return navigation;
};

// Static method to get all active navigations
NavigationSchema.statics.getActiveNavigations = async function() {
  return this.find({ isActive: true })
    .sort({ location: 1, name: 1 })
    .lean();
};

export const NavigationModel = models.Navigation || model<NavigationDocument>('Navigation', NavigationSchema);