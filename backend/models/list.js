import mongoose from 'mongoose';

const listItemSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  originalRow: {
    type: Number,
    required: true,
  },
}, { _id: false });

const listSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [listItemSchema],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  totalItems: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
listSchema.index({ agentId: 1, status: 1 });
listSchema.index({ uploadedBy: 1 });
listSchema.index({ uploadedAt: -1 });

export default mongoose.model('List', listSchema);