const mongoose = require('mongoose');

// Category-Based Content Module
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '📂' },
  color: { type: String, default: '#2563eb' },
  // Category moderators (Category-Based Content Module)
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderatorNames: [{ type: String }],
  questionCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Subject-based grouping
  subjects: [{ type: String }],
  // Learning paths / structured knowledge
  relatedCategories: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
