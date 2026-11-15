const mongoose = require('mongoose');

// Thread Module - nested replies, organized discussion hierarchy
const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String },
  content: { type: String, required: true },
  votes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parentComment: { type: mongoose.Schema.Types.ObjectId, default: null },
  replies: [{ type: mongoose.Schema.Types.ObjectId }],
  isDeleted: { type: Boolean, default: false },
  editHistory: [{ content: String, editedAt: Date }],
}, { timestamps: true });

const answerSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String },
  content: { type: String, required: true },
  votes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isAccepted: { type: Boolean, default: false },
  // Thread Module - threaded comments on answers
  comments: [commentSchema],
  isDeleted: { type: Boolean, default: false },
  // Collaborative editing (Paper 8 - editing improves quality)
  editHistory: [{ content: String, editedBy: String, editedAt: Date }],
  lastEditedBy: { type: String },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String },
  tags: [{ type: String }],
  // Category-Based Content Module
  category: { type: String, default: 'General' },
  subject: { type: String, default: '' }, // subject-based grouping
  votes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  answers: [answerSchema],
  acceptedAnswer: { type: mongoose.Schema.Types.ObjectId, default: null },
  isDeleted: { type: Boolean, default: false },
  isClosed: { type: Boolean, default: false },
  closedReason: { type: String, default: '' },
  // Trending calculation support
  trendingScore: { type: Number, default: 0 },
  // Question quality / structured template
  codeSnippet: { type: String, default: '' },
  expectedBehavior: { type: String, default: '' },
  actualBehavior: { type: String, default: '' },
  // Bookmarks
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Auto-calculate trending score
questionSchema.pre('save', function(next) {
  const hoursSinceCreated = (Date.now() - this.createdAt) / 3600000;
  this.trendingScore = (this.votes * 3 + (this.answers?.length || 0) * 2 + this.views * 0.1) / Math.pow((hoursSinceCreated + 2), 1.5);
  next();
});

module.exports = mongoose.model('Question', questionSchema);
