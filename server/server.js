require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const { CORS_ORIGINS, JWT_SECRET } = require('./config');

const app = express();
const isDev = process.env.NODE_ENV !== 'production';
// Allow any localhost:* in dev to avoid port-mismatch CORS headaches
const corsOptions = isDev
  ? { origin: true, credentials: true }
  : { origin: CORS_ORIGINS, credentials: true };
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = socketIo(server, {
  path: '/api/socket.io',
  cors: {
    origin: isDev ? '*' : CORS_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime-doc-editor';
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const Document = require('./models/Document');
const jwt = require('jsonwebtoken');

// Firebase admin setup
let admin = null;
try {
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

// Store active users per document
const documentUsers = new Map();

io.on('connection', (socket) => {
  let currentUserId = null;
  let currentUsername = null;
  let currentDocumentId = null;
  let handlersBoundForDoc = false;
  let typingTimeout = null;

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      // Try local JWT first
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.userId;
      currentUsername = decoded.username || 'User';
      socket.emit('authentication-success');
    } catch (error) {
      // Try Firebase ID token -> map to local user record
      try {
        if (!admin) throw new Error('firebase-admin unavailable');
        const decoded = await admin.auth().verifyIdToken(token);
        const User = require('./models/User');
        let user = await User.findOne({ username: decoded.email });
        if (!user) user = await User.create({ username: decoded.email, password: 'GOOGLE_AUTH' });
        currentUserId = user._id.toString();
        currentUsername = user.username;
        socket.emit('authentication-success');
      } catch (e) {
        socket.emit('authentication-failed');
      }
    }
  });

  socket.on('get-document', async documentId => {
    if (!currentUserId) {
      socket.emit('authentication-required');
      return;
    }

    // If switching documents, clean up presence and rooms
    if (currentDocumentId && currentDocumentId !== documentId) {
      socket.leave(currentDocumentId);
      if (documentUsers.has(currentDocumentId)) {
        const docUsers = documentUsers.get(currentDocumentId);
        if (docUsers.has(socket.id)) {
          const user = docUsers.get(socket.id);
          docUsers.delete(socket.id);
          const activeUsers = Array.from(docUsers.values());
          socket.to(currentDocumentId).emit('users-update', activeUsers);
          socket.to(currentDocumentId).emit('user-left', user);
          if (docUsers.size === 0) documentUsers.delete(currentDocumentId);
        }
      }
    }

    currentDocumentId = documentId;

    try {
      const document = await findOrCreateDocument(documentId, currentUserId);

      if (!document) {
        socket.emit('access-denied', { message: 'You do not have access to this document' });
        return;
      }

      socket.join(documentId);
      socket.emit('load-document', document.data || {});

      // Add user to document's active users
      if (!documentUsers.has(documentId)) {
        documentUsers.set(documentId, new Map());
      }
      documentUsers.get(documentId).set(socket.id, {
        id: currentUserId,
        username: currentUsername,
        socketId: socket.id
      });

      // Notify all users in the document about updated user list
      const activeUsers = Array.from(documentUsers.get(documentId).values());
      io.to(documentId).emit('users-update', activeUsers);

      // Notify others that user joined
      socket.to(documentId).emit('user-joined', { id: currentUserId, username: currentUsername });

      if (!handlersBoundForDoc) {
        handlersBoundForDoc = true;
        socket.on('send-changes', async (delta) => {
          try {
            const doc = await Document.findById(currentDocumentId);
            const role = getUserRole(doc, currentUserId);
            const canWrite = role === 'owner' || role === 'editor' || (!doc.owner);
            if (!canWrite) return;
            socket.broadcast.to(currentDocumentId).emit('receive-changes', {
              delta,
              user: { id: currentUserId, username: currentUsername }
            });
          } catch (_) { /* ignore */ }
        });

        // Cursor broadcasting
        socket.on('cursor-change', (range) => {
          socket.to(currentDocumentId).emit('cursor-update', {
            user: { id: currentUserId, username: currentUsername },
            range
          });
        });
      }
    } catch (error) {
      socket.emit('load-error', { message: 'Failed to load document' });
    }

  // Handle saving document (supports payload { data, manual })
  socket.on('save-document', async (payload) => {
      if (!currentUserId || !currentDocumentId) {
        socket.emit('authentication-required');
        return;
      }

      try {
        let document = await Document.findById(currentDocumentId);
        if (!document) {
          document = await findOrCreateDocument(currentDocumentId, currentUserId);
          if (!document) {
            socket.emit('save-error', 'Failed to create document');
            return;
          }
        }

        const role = getUserRole(document, currentUserId);
        const canWrite = role === 'owner' || role === 'editor' || (!document.owner);
        if (!canWrite) {
          socket.emit('save-error', 'Access denied: You do not have permission to edit this document');
          return;
        }

        if (!document.owner) {
          document.owner = currentUserId;
        }

        const isObjectPayload = payload && typeof payload === 'object' && !Array.isArray(payload);
        const data = isObjectPayload && payload.data ? payload.data : payload;
        const manual = isObjectPayload && !!payload.manual;

        document.data = data || {};
        document.lastModified = new Date();

        // Snapshot version on manual save or every 2 minutes
        const versions = document.versions || [];
        const last = versions.length ? versions[versions.length - 1] : null;
        const stale = !last || (Date.now() - new Date(last.at).getTime()) > 2 * 60 * 1000;
        if (manual || stale) {
          versions.push({ at: new Date(), data: document.data, title: document.title });
          if (versions.length > 50) versions.splice(0, versions.length - 50);
          document.versions = versions;
        }

        await document.save();
        socket.emit('save-success');
      } catch (error) {
        socket.emit('save-error', error.message);
      }
    });

    // Handle title updates
    socket.on('update-title', async (newTitle) => {
      if (!currentUserId || !currentDocumentId) {
        socket.emit('authentication-required');
        return;
      }

      try {
        const document = await Document.findById(currentDocumentId);
        if (!document) return;

        const role = getUserRole(document, currentUserId);
        const canWrite = role === 'owner' || role === 'editor' || (!document.owner);
        if (!canWrite) return;

        if (!document.owner) document.owner = currentUserId;

        document.title = newTitle || document.title;
        document.lastModified = new Date();
        await document.save();
        socket.to(currentDocumentId).emit('title-updated', newTitle);
        socket.emit('title-updated', newTitle);
      } catch (error) {
        // ignore
      }
    });

    // Typing indicators (simple) bound per document
    if (!handlersBoundForDoc) {
      socket.on('typing', (isTyping) => {
        socket.to(currentDocumentId).emit('user-typing', {
          user: { id: currentUserId, username: currentUsername },
          isTyping: !!isTyping
        });
        if (typingTimeout) clearTimeout(typingTimeout);
        if (isTyping) {
          typingTimeout = setTimeout(() => {
            socket.to(currentDocumentId).emit('user-typing', {
              user: { id: currentUserId, username: currentUsername },
              isTyping: false
            });
          }, 3000);
        }
      });
    }
  });

  socket.on('disconnect', () => {
  handlersBoundForDoc = false;
    // Remove user from document's active users
    if (currentDocumentId && documentUsers.has(currentDocumentId)) {
      const docUsers = documentUsers.get(currentDocumentId);
      if (docUsers.has(socket.id)) {
        const user = docUsers.get(socket.id);
        docUsers.delete(socket.id);

        if (docUsers.size === 0) {
          documentUsers.delete(currentDocumentId);
        } else {
          const activeUsers = Array.from(docUsers.values());
          socket.to(currentDocumentId).emit('users-update', activeUsers);
          socket.to(currentDocumentId).emit('user-left', user);
        }
      }
    }
  });
});

function getUserRole(document, userId) {
  if (!document) return 'none';
  // Support populated owner
  try {
    if (document.owner) {
      const ownerId = document.owner._id ? document.owner._id.toString() : document.owner.toString();
      if (ownerId === userId) return 'owner';
    }
  } catch(_) { /* ignore */ }
  if (Array.isArray(document.collaborators) && document.collaborators.some(id => id.toString() === userId)) return 'editor';
  const role = document.roleMap?.get?.(userId) || document.roleMap?.[userId];
  return role || 'none';
}

async function findOrCreateDocument(id, userId) {
  if (id == null) return null;

  try {
  let document = await Document.findById(id);
    if (document) {
      const role = getUserRole(document, userId);
      const hasAccess = role !== 'none' || !document.owner; // legacy access
      if (!hasAccess) return null;

      if (!document.owner) {
        document.owner = userId;
        await document.save();
      }
      return document;
    }

    document = await Document.create({
      _id: id,
      data: {},
      title: 'Untitled Document',
      owner: userId,
      lastModified: new Date(),
      createdAt: new Date(),
    });
    return document;
  } catch (error) {
    return null;
  }
}

const PORT = process.env.PORT || 5001;
// In Vercel's serverless, we export the app; locally we start the server
if (process.env.VERCEL) {
  module.exports = app;
} else {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
