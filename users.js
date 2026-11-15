const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

// ── Get all users (community page) ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, sort = 'reputation', page = 1, limit = 24, expertise } = req.query;

    let query = { isSuspended: false };

    // Search by name or skill
    if (search) {
      query.$or = [
        { username:  { $regex: search, $options: 'i' } },
        { skills:    { $regex: search, $options: 'i' } },
        { interests: { $regex: search, $options: 'i' } },
        { bio:       { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by expertise level
    if (expertise) query.expertise = expertise;

    let sortObj = {};
    if (sort === 'reputation') sortObj = { reputation: -1 };
    else if (sort === 'newest')    sortObj = { createdAt: -1 };
    else if (sort === 'questions') sortObj = { questionsCount: -1 };
    else if (sort === 'answers')   sortObj = { answersCount: -1 };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -notifications -loginOtp -loginOtpExpiry')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get user profile ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -loginOtp -loginOtpExpiry');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const questions = await Question.find({ author: req.params.id, isDeleted: false })
      .select('title votes views answers createdAt category tags')
      .sort({ createdAt: -1 }).limit(20);
    const bookmarked = await Question.find({ bookmarkedBy: req.params.id, isDeleted: false })
      .select('title votes views answers createdAt category')
      .sort({ createdAt: -1 }).limit(10);
    res.json({ user, questions, bookmarked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
router.put('/me/update', auth, async (req, res) => {
  try {
    const { bio, skills, interests, knowledgeDomains, expertise, resumeUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        bio,
        skills:           skills           ? skills.split(',').map(s => s.trim()).filter(Boolean)           : [],
        interests:        interests        ? interests.split(',').map(s => s.trim()).filter(Boolean)        : [],
        knowledgeDomains: knowledgeDomains ? knowledgeDomains.split(',').map(s => s.trim()).filter(Boolean) : [],
        expertise:        expertise || 'beginner',
        resumeUrl:        resumeUrl || '',
        lastSeen:         new Date()
      },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get notifications ─────────────────────────────────────────────────────────
router.get('/me/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    const notifications = (user.notifications || []).slice().reverse().slice(0, 20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark notifications read ───────────────────────────────────────────────────
router.post('/me/notifications/read', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'notifications.$[].read': true }
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
