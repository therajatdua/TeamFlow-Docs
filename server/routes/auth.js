const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Basic rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

function normalizeUsername(name) {
  return (name || '').trim();
}

function looksLikeBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2') && value.split('$').length >= 4;
}

// Escape regex for exact, case-insensitive username match
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.post('/register', async (req, res) => {
  try {
    let { username, password } = req.body;
    username = normalizeUsername(username);
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    // Block case-variant duplicates
    const existing = await User.findOne({ username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;
    username = normalizeUsername(username);
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    // Case-insensitive lookup to match how we prevent duplicates on register
    // Prefer exact-case match first to avoid hitting a different-cased duplicate
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.findOne({ username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' } });
    }
    // Fallback for legacy records where username may have surrounding spaces
    if (!user) {
      const spaced = `^\\s*${escapeRegex(username)}\\s*$`;
      user = await User.findOne({ username: { $regex: spaced, $options: 'i' } });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    let valid = false;
    if (looksLikeBcryptHash(user.password)) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext support: compare directly and migrate to hash on success
      valid = password === user.password;
      if (valid) {
        try {
          user.password = await bcrypt.hash(password, 10);
          await user.save();
        } catch (e) {
          // Non-fatal: login can still proceed; log for visibility
          console.warn('Password migration failed for user', user._id?.toString?.());
        }
      }
    }

    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
