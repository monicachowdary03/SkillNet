require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skillnet';
const SESSION_SECRET = process.env.SESSION_SECRET || 'skillnet_secret_key_2024';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedCategories();
  })
  .catch(err => console.log('MongoDB connection error:', err));

async function seedCategories() {
  const Category = require('./models/Category');
  const count = await Category.countDocuments();
  if (count === 0) {
    const defaults = [
      { name: 'Web Development',       description: 'HTML, CSS, JavaScript, React, Node.js and more',          icon: '🌐', color: '#2563eb' },
      { name: 'Database',              description: 'SQL, MongoDB, Redis, database design',                     icon: '🗄️', color: '#7c3aed' },
      { name: 'Algorithms',            description: 'Data structures, sorting, dynamic programming',            icon: '🧮', color: '#059669' },
      { name: 'Data Structures',       description: 'Arrays, trees, graphs, linked lists',                      icon: '🌲', color: '#d97706' },
      { name: 'Machine Learning',      description: 'ML, AI, deep learning, neural networks',                   icon: '🤖', color: '#dc2626' },
      { name: 'Mobile Development',    description: 'Android, iOS, React Native, Flutter',                      icon: '📱', color: '#0891b2' },
      { name: 'DevOps',                description: 'CI/CD, Docker, Kubernetes, cloud services',                icon: '⚙️', color: '#64748b' },
      { name: 'Security',              description: 'Cybersecurity, ethical hacking, cryptography',             icon: '🔐', color: '#b91c1c' },
      { name: 'Mathematics',           description: 'Discrete math, calculus, linear algebra',                  icon: '📐', color: '#7c3aed' },
      { name: 'Computer Networks',     description: 'Networking protocols, TCP/IP, OSI model',                  icon: '🔗', color: '#0369a1' },
      { name: 'Operating Systems',     description: 'OS concepts, process management, memory',                  icon: '💻', color: '#374151' },
      { name: 'Software Engineering',  description: 'Design patterns, SDLC, agile, testing',                   icon: '🏗️', color: '#065f46' },
      { name: 'Cloud Computing',       description: 'AWS, Azure, GCP, serverless architecture',                 icon: '☁️', color: '#0284c7' },
      { name: 'Python',                description: 'Python programming, libraries, frameworks',                icon: '🐍', color: '#15803d' },
      { name: 'Java',                  description: 'Java programming, Spring, OOP concepts',                   icon: '☕', color: '#b45309' },
      { name: 'C / C++',              description: 'C and C++ programming, memory management, STL',            icon: '⚡', color: '#6d28d9' },
      { name: 'Data Science',          description: 'Data analysis, visualization, statistics',                 icon: '📊', color: '#0f766e' },
      { name: 'Blockchain',            description: 'Smart contracts, cryptocurrency, Web3',                    icon: '🔗', color: '#b45309' },
      { name: 'Game Development',      description: 'Unity, Unreal Engine, game design',                       icon: '🎮', color: '#7c3aed' },
      { name: 'UI/UX Design',          description: 'User interface, user experience, Figma',                  icon: '🎨', color: '#db2777' },
      { name: 'Interview Prep',        description: 'Coding interviews, system design, DSA',                   icon: '📋', color: '#0369a1' },
      { name: 'Open Source',           description: 'Contributing to open source projects',                    icon: '🌍', color: '#059669' },
      { name: 'General',               description: 'General programming questions',                           icon: '💬', color: '#6b7280' },
    ];
    await Category.insertMany(defaults);
    console.log('Default categories seeded');
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/answers',   require('./routes/answers'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/users',     require('./routes/users'));

app.get('/',               (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/question/:id',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'question.html')));
app.get('/ask',            (req, res) => res.sendFile(path.join(__dirname, 'public', 'ask.html')));
app.get('/profile',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/admin',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/category/:name', (req, res) => res.sendFile(path.join(__dirname, 'public', 'category.html')));
app.get('/community',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'community.html')));
app.get('/notifications',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'notifications.html')));

app.listen(PORT, () => {
  console.log(`SkillNet running at http://localhost:${PORT}`);
});
