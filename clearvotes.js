require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skillnet')
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    await db.collection('questions').updateMany({}, {
      $set: { 'upvotedBy': [], 'downvotedBy': [], 'votes': 0 }
    });

    const questions = await db.collection('questions').find({}).toArray();
    for (const q of questions) {
      if (q.answers && q.answers.length > 0) {
        const clearedAnswers = q.answers.map(a => ({
          ...a, upvotedBy: [], downvotedBy: [], votes: 0
        }));
        await db.collection('questions').updateOne(
          { _id: q._id },
          { $set: { answers: clearedAnswers } }
        );
      }
    }
    console.log('All votes cleared!');
    process.exit(0);
  })
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
