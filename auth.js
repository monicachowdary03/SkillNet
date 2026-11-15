const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const SECRET = process.env.SESSION_SECRET || 'skillnet_secret_key_2024';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(0, local.length - visible.length))}@${domain}`;
}

// ── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, skills, interests, expertise } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({ error: 'Username or email already exists' });

    const user = new User({
      username, email, password,
      skills:    skills    ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      interests: interests ? interests.split(',').map(s => s.trim()).filter(Boolean) : [],
      expertise: expertise || 'beginner',
      badges: [{ name: 'New Member', description: 'Welcome to SkillNet!', icon: '🌟' }]
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      SECRET, { expiresIn: '7d' }
    );
    req.session.token = token;
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Step 1: Verify password → send OTP ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    if (user.isSuspended)
      return res.status(403).json({ error: `Account suspended: ${user.suspensionReason || 'Violated community guidelines'}` });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    const otp    = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);

    user.loginOtp         = hashed;
    user.loginOtpExpiry   = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    await user.save();

    // Send real email — if it fails, still respond so user knows OTP was generated
    try {
      await sendOtpEmail(user.email, otp, user.username);
      console.log(`[OTP] Sent to ${user.email}`);
    } catch (mailErr) {
      console.error('[OTP mail error]', mailErr.message);
      return res.status(500).json({
        error: 'Could not send OTP email. Please check your email settings in .env and try again.'
      });
    }

    res.json({
      otpRequired:  true,
      email:        user.email,
      maskedEmail:  maskEmail(user.email),
      message:      `OTP sent to ${maskEmail(user.email)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Step 2: Verify OTP → issue JWT ───────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.loginOtp)
      return res.status(400).json({ error: 'No OTP pending. Please log in again.' });

    if (user.loginOtpAttempts >= 5) {
      user.loginOtp = null; user.loginOtpExpiry = null; user.loginOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ error: 'Too many incorrect attempts. Please log in again.' });
    }

    if (!user.loginOtpExpiry || new Date() > user.loginOtpExpiry) {
      user.loginOtp = null; user.loginOtpExpiry = null;
      await user.save();
      return res.status(400).json({ error: 'OTP has expired. Please log in again.' });
    }

    const match = await bcrypt.compare(String(otp).trim(), user.loginOtp);
    if (!match) {
      user.loginOtpAttempts += 1;
      await user.save();
      const left = 5 - user.loginOtpAttempts;
      return res.status(400).json({ error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    user.loginOtp = null; user.loginOtpExpiry = null;
    user.loginOtpAttempts = 0; user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      SECRET, { expiresIn: '7d' }
    );
    req.session.token = token;
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resend OTP ────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'No account found for this email' });

    // 60-second cooldown
    if (user.loginOtpExpiry) {
      const age = user.loginOtpExpiry - new Date();
      if (age > 9 * 60 * 1000)
        return res.status(429).json({ error: 'Please wait at least 1 minute before requesting a new OTP.' });
    }

    const otp    = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);
    user.loginOtp = hashed; user.loginOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    await user.save();

    try {
      await sendOtpEmail(user.email, otp, user.username);
    } catch (mailErr) {
      return res.status(500).json({ error: 'Failed to resend OTP. Please try again.' });
    }

    res.json({ message: `New OTP sent to ${maskEmail(user.email)}`, maskedEmail: maskEmail(user.email) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// ── Get current user ──────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.session?.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const user    = await User.findById(decoded.id).select('-password -loginOtp -loginOtpExpiry');
    const unread  = (user.notifications || []).filter(n => !n.read).length;
    res.json({ ...user.toObject(), unreadNotifications: unread });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
