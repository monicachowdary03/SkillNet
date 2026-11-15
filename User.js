const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const achievementSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  icon: { type: String },
  earnedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  bio: { type: String, default: '' },
  skills: [{ type: String }],
  interests: [{ type: String }],
  knowledgeDomains: [{ type: String }],
  expertise: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
  resumeUrl: { type: String, default: '' },
  reputation: { type: Number, default: 0 },
  badges: [achievementSchema],
  avatar: { type: String, default: '' },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String, default: '' },
  questionsCount: { type: Number, default: 0 },
  answersCount: { type: Number, default: 0 },
  moderatingCategories: [{ type: String }],
  notifications: [{
    type: { type: String },
    message: { type: String },
    link: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  lastSeen: { type: Date, default: Date.now },

  // ── OTP fields ──────────────────────────────────────────────────────────────
  loginOtp: { type: String, default: null },          // hashed OTP
  loginOtpExpiry: { type: Date, default: null },       // expiry (10 min)
  loginOtpAttempts: { type: Number, default: 0 },      // brute-force guard
  // ────────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
