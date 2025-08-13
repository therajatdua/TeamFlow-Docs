const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
let admin = null;
try {
  // Lazy-load firebase-admin if configured
  admin = require('firebase-admin');
  if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replaceAll('\\n', '\n'),
      })
    });
  }
} catch (e) {
  // firebase-admin not installed or not configured; ignore
}

module.exports = async function (req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded; // local JWT already stores userId (Mongo _id)
    next();
  } catch (ex) {
    // Try Firebase ID token if available
    try {
      if (!admin) throw new Error('firebase-admin unavailable');
      const decoded = await admin.auth().verifyIdToken(token);
      // For Firebase users, map to (or create) a local Mongo User and use its _id
      const User = require('../models/User');
      let user = await User.findOne({ username: decoded.email });
      if (!user) {
        user = await User.create({ username: decoded.email, password: 'GOOGLE_AUTH' });
      }
      req.user = { userId: user._id.toString(), username: user.username };
      next();
    } catch (e) {
      res.status(401).json({ message: 'Invalid or expired token.' });
    }
  }
};
