const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Edit answer - Collaborative editing (Paper 8)
router.put('/:qid/answers/:aid', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const question = await Question.findById(req.params.qid);
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    if (answer.author.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Not authorized to edit this answer' });
    }
    // Save edit history
    answer.editHistory = answer.editHistory || [];
    answer.editHistory.push({ content: answer.content, editedAt: new Date() });
    answer.content = content;
    answer.lastEditedBy = req.user.username;
    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete answer (by author)
router.delete('/:qid/answers/:aid', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.qid);
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    if (answer.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    answer.isDeleted = true;
    await question.save();
    res.json({ message: 'Answer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
