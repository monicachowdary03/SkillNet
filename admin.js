const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { adminAuth } = require('../middleware/auth');

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suspend user - Admin Module
router.post('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id,
      { isSuspended: true, suspensionReason: reason || 'Violated community guidelines' },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unsuspend user
router.post('/users/:id/unsuspend', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isSuspended: false, suspensionReason: '' },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change user role
router.post('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'moderator'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set category moderator - Category-Based Content Module
router.post('/categories/:name/moderator', adminAuth, async (req, res) => {
  try {
    const { userId, username, action } = req.body; // action: 'add' | 'remove'
    const update = action === 'add'
      ? { $addToSet: { moderators: userId, moderatorNames: username } }
      : { $pull: { moderators: userId, moderatorNames: username } };
    const cat = await Category.findOneAndUpdate({ name: req.params.name }, update, { new: true, upsert: true });
    // Update user's moderating categories
    const userUpdate = action === 'add'
      ? { $addToSet: { moderatingCategories: req.params.name } }
      : { $pull: { moderatingCategories: req.params.name } };
    await User.findByIdAndUpdate(userId, userUpdate);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete question - Admin Module
router.delete('/questions/:id', adminAuth, async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close question
router.post('/questions/:id/close', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    await Question.findByIdAndUpdate(req.params.id, { isClosed: true, closedReason: reason || 'Closed by moderator' });
    res.json({ message: 'Question closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete answer
router.delete('/questions/:qid/answers/:aid', adminAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.qid);
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    answer.isDeleted = true;
    await question.save();
    res.json({ message: 'Answer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage categories - Admin Module
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', adminAuth, async (req, res) => {
  try {
    const { name, description, icon, color, subjects } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const cat = new Category({
      name, description, icon: icon || '📂', color: color || '#2563eb',
      subjects: subjects ? subjects.split(',').map(s => s.trim()) : [],
      createdBy: req.user.id
    });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, icon, color, subjects, isActive } = req.body;
    const cat = await Category.findByIdAndUpdate(req.params.id,
      { name, description, icon, color, subjects: subjects ? subjects.split(',').map(s => s.trim()) : [], isActive },
      { new: true }
    );
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Platform stats for admin dashboard
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalQuestions, totalAnswersAgg, suspendedUsers, totalCategories] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments({ isDeleted: false }),
      Question.aggregate([{ $project: { count: { $size: '$answers' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      User.countDocuments({ isSuspended: true }),
      Category.countDocuments({ isActive: true })
    ]);
    const recentActivity = await Question.find({ isDeleted: false })
      .sort({ createdAt: -1 }).limit(5)
      .select('title authorName createdAt category');
    res.json({
      totalUsers,
      totalQuestions,
      totalAnswers: totalAnswersAgg[0]?.total || 0,
      suspendedUsers,
      totalCategories,
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Reset categories to latest list (admin only)
router.post('/reset-categories', adminAuth, async (req, res) => {
  try {
    const Category = require('../models/Category');
    await Category.deleteMany({});
    res.json({ message: 'Categories cleared. Restart server to re-seed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
