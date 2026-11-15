const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');

// Get all questions
router.get('/', async (req, res) => {
  try {
    const { category, tag, search, sort = 'newest', page = 1, limit = 20, subject } = req.query;
    let query = { isDeleted: false };
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (subject) query.subject = subject;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];

    let sortObj = {};
    if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'votes') sortObj = { votes: -1 };
    else if (sort === 'unanswered') { query['answers.0'] = { $exists: false }; sortObj = { createdAt: -1 }; }
    else if (sort === 'trending') sortObj = { trendingScore: -1 };
    else if (sort === 'views') sortObj = { views: -1 };

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('title tags category subject votes views answers author authorName createdAt acceptedAnswer bookmarkedBy upvotedBy downvotedBy');

    res.json({ questions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories with counts
router.get('/meta/categories', async (req, res) => {
  try {
    const dbCategories = await Category.find({ isActive: true }).sort({ questionCount: -1 });
    const aggregated = await Question.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const countMap = {};
    aggregated.forEach(a => { countMap[a._id] = a.count; });

    const result = dbCategories.map(c => ({
      _id: c.name,
      count: countMap[c.name] || 0,
      icon: c.icon,
      color: c.color,
      description: c.description,
      moderators: c.moderatorNames
    }));

    aggregated.forEach(a => {
      if (!result.find(r => r._id === a._id)) {
        result.push({ _id: a._id, count: a.count, icon: '📂', color: '#2563eb' });
      }
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trending questions per category
router.get('/meta/trending', async (req, res) => {
  try {
    const { category } = req.query;
    let query = { isDeleted: false };
    if (category) query.category = category;
    const trending = await Question.find(query)
      .sort({ trendingScore: -1 })
      .limit(5)
      .select('title votes views answers category createdAt authorName');
    res.json(trending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single question
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'username reputation skills');
    if (!question || question.isDeleted) return res.status(404).json({ error: 'Not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create question
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags, category, subject, codeSnippet, expectedBehavior, actualBehavior } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const question = new Question({
      title, content,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category: category || 'General',
      subject: subject || '',
      codeSnippet: codeSnippet || '',
      expectedBehavior: expectedBehavior || '',
      actualBehavior: actualBehavior || '',
      author: req.user.id,
      authorName: req.user.username
    });
    await question.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { questionsCount: 1 } });

    await Category.findOneAndUpdate(
      { name: category || 'General' },
      { $inc: { questionCount: 1 } },
      { upsert: false }
    );

    const user = await User.findById(req.user.id);
    if (user.questionsCount === 1) {
      await User.findByIdAndUpdate(req.user.id, {
        $push: { badges: { name: 'First Question', description: 'Asked your first question!', icon: '❓' } }
      });
    }
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on question
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { direction } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Not found' });

    const userId  = req.user.id;
    const upIds   = question.upvotedBy.map(String);
    const downIds = question.downvotedBy.map(String);

    if (direction === 'up') {
      if (upIds.includes(userId)) {
        // Already upvoted → remove it (toggle off)
        question.upvotedBy = question.upvotedBy.filter(id => id.toString() !== userId);
      } else {
        // Upvote → also remove any existing downvote
        question.upvotedBy.push(userId);
        question.downvotedBy = question.downvotedBy.filter(id => id.toString() !== userId);
      }
    } else {
      if (downIds.includes(userId)) {
        // Already downvoted → remove it (toggle off)
        question.downvotedBy = question.downvotedBy.filter(id => id.toString() !== userId);
      } else {
        // Downvote → also remove any existing upvote
        question.downvotedBy.push(userId);
        question.upvotedBy = question.upvotedBy.filter(id => id.toString() !== userId);
      }
    }

    // votes field = likes - dislikes (for sorting), but UI shows separate counts
    question.votes = question.upvotedBy.length - question.downvotedBy.length;
    await question.save();

    res.json({
      likes:     question.upvotedBy.length,
      dislikes:  question.downvotedBy.length,
      iLiked:    question.upvotedBy.map(String).includes(userId),
      iDisliked: question.downvotedBy.map(String).includes(userId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookmark question
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Not found' });
    const userId = req.user.id;
    const isBookmarked = question.bookmarkedBy.map(String).includes(userId);
    const update = isBookmarked
      ? { $pull: { bookmarkedBy: userId } }
      : { $addToSet: { bookmarkedBy: userId } };
    await Question.findByIdAndUpdate(req.params.id, update);
    res.json({ bookmarked: !isBookmarked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post answer
router.post('/:id/answers', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Not found' });

    question.answers.push({
      content,
      author: req.user.id,
      authorName: req.user.username
    });
    await question.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { answersCount: 1, reputation: 10 } });

    if (question.author.toString() !== req.user.id) {
      await User.findByIdAndUpdate(question.author, {
        $push: { notifications: { type: 'answer', message: `${req.user.username} answered your question: "${question.title.substring(0,50)}"`, link: `/question/${question._id}` } }
      });
    }

    const user = await User.findById(req.user.id);
    if (user.answersCount === 1) {
      await User.findByIdAndUpdate(req.user.id, {
        $push: { badges: { name: 'First Answer', description: 'Posted your first answer!', icon: '💡' } }
      });
    }
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vote on answer — returns separate likes/dislikes counts ──
router.post('/:qid/answers/:aid/vote', auth, async (req, res) => {
  try {
    const { direction } = req.body;
    const question = await Question.findById(req.params.qid);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    const userId = req.user.id;
    const upIds   = answer.upvotedBy.map(String);
    const downIds = answer.downvotedBy.map(String);

    if (direction === 'up') {
      if (upIds.includes(userId)) {
        // Already liked → toggle off
        answer.upvotedBy = answer.upvotedBy.filter(id => id.toString() !== userId);
      } else {
        // Like → also REMOVE dislike so only one vote at a time
        answer.upvotedBy.push(userId);
        answer.downvotedBy = answer.downvotedBy.filter(id => id.toString() !== userId);
        if (answer.author.toString() !== userId) {
          await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 5 } });
        }
      }
    } else {
      if (downIds.includes(userId)) {
        // Already disliked → toggle off
        answer.downvotedBy = answer.downvotedBy.filter(id => id.toString() !== userId);
      } else {
        // Dislike → also REMOVE like so only one vote at a time
        answer.downvotedBy.push(userId);
        answer.upvotedBy = answer.upvotedBy.filter(id => id.toString() !== userId);
      }
    }
    // votes = likes - dislikes for sorting purposes
    answer.votes = answer.upvotedBy.length - answer.downvotedBy.length;

    await question.save();

    // re-read answer after save
    const updatedAnswer = question.answers.id(req.params.aid);
    res.json({
      likes:     updatedAnswer.upvotedBy.length,
      dislikes:  updatedAnswer.downvotedBy.length,
      iLiked:    updatedAnswer.upvotedBy.map(String).includes(userId),
      iDisliked: updatedAnswer.downvotedBy.map(String).includes(userId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept answer
router.post('/:qid/answers/:aid/accept', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.qid);
    if (!question) return res.status(404).json({ error: 'Not found' });
    if (question.author.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only question author can accept' });

    question.answers.forEach(a => { a.isAccepted = false; });
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    answer.isAccepted = true;
    question.acceptedAnswer = req.params.aid;
    await question.save();

    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 15 } });
    if (answer.author.toString() !== req.user.id) {
      await User.findByIdAndUpdate(answer.author, {
        $push: { notifications: { type: 'accept', message: `Your answer was accepted on: "${question.title.substring(0,50)}"`, link: `/question/${question._id}` } }
      });
    }
    res.json({ message: 'Answer accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post comment (threaded)
router.post('/:qid/answers/:aid/comments', auth, async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const question = await Question.findById(req.params.qid);
    if (!question) return res.status(404).json({ error: 'Not found' });
    const answer = question.answers.id(req.params.aid);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    answer.comments.push({
      content,
      author: req.user.id,
      authorName: req.user.username,
      parentComment: parentComment || null
    });
    await question.save();

    if (answer.author.toString() !== req.user.id) {
      await User.findByIdAndUpdate(answer.author, {
        $push: { notifications: { type: 'comment', message: `${req.user.username} commented on your answer`, link: `/question/${question._id}` } }
      });
    }
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on comment
router.post('/:qid/answers/:aid/comments/:cid/vote', auth, async (req, res) => {
  try {
    const { direction } = req.body;
    const question = await Question.findById(req.params.qid);
    if (!question) return res.status(404).json({ error: 'Not found' });
    const answer  = question.answers.id(req.params.aid);
    if (!answer)   return res.status(404).json({ error: 'Answer not found' });
    const comment = answer.comments.id(req.params.cid);
    if (!comment)  return res.status(404).json({ error: 'Comment not found' });

    const userId = req.user.id;
    if (direction === 'up') {
      if (!comment.upvotedBy.map(String).includes(userId)) {
        comment.votes = (comment.votes || 0) + 1;
        comment.upvotedBy.push(userId);
        comment.downvotedBy = comment.downvotedBy.filter(id => id.toString() !== userId);
      }
    }
    await question.save();
    res.json({ votes: comment.votes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
