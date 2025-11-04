const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    default: 'viewer'
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Document'
  },
  content: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [permissionSchema],
  shareLink: {
    type: String,
    unique: true,
    sparse: true
  },
  lastSaved: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate share link
documentSchema.methods.generateShareLink = function() {
  const randomString = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
  this.shareLink = randomString;
  return this.shareLink;
};

// Check if user has permission
documentSchema.methods.hasPermission = function(userId, requiredRole) {
  if (!userId) return false;
  
  // Convert both to strings for comparison
  const userIdStr = userId.toString();
  
  // Handle populated owner (object with _id) or direct ObjectId
  let ownerStr;
  if (this.owner && typeof this.owner === 'object' && this.owner._id) {
    ownerStr = this.owner._id.toString();
  } else if (this.owner) {
    ownerStr = this.owner.toString();
  }
  
  // Owner always has access
  if (ownerStr && userIdStr && ownerStr === userIdStr) {
    return true;
  }
  
  // Check permissions array
  const permission = this.permissions.find(p => {
    if (!p.user) return false;
    // Handle populated permission user (object with _id) or direct ObjectId
    let permissionUserIdStr;
    if (typeof p.user === 'object' && p.user._id) {
      permissionUserIdStr = p.user._id.toString();
    } else {
      permissionUserIdStr = p.user.toString();
    }
    return permissionUserIdStr === userIdStr;
  });
  
  if (!permission) return false;
  
  const roleHierarchy = { viewer: 0, editor: 1, owner: 2 };
  return roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
};

module.exports = mongoose.model('Document', documentSchema);

