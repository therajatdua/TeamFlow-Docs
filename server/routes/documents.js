const express = require('express');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const { JWT_SECRET } = require('../config');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper: normalize legacy owner (Firebase UID string or missing) to current user ObjectId
function normalizeLegacyOwner(document, userId) {
  try {
    if (!document) return false;
    if (!document.owner) {
      document.owner = userId;
      document._migrationClaimed = true;
      document.save().catch(() => {});
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

// Helper to safely extract owner id whether populated or not
function getOwnerId(document) {
  if (!document || !document.owner) return null;
  if (document.owner._id) return document.owner._id.toString();
  if (typeof document.owner === 'object' && document.owner.toString && document.owner.toString() !== '[object Object]') {
    return document.owner.toString();
  }
  if (document.owner.toString && document.owner.toString() === '[object Object]' && document.owner._id) {
    return document.owner._id.toString();
  }
  try { return document.owner.toString(); } catch { return null; }
}

// List documents owned by or shared with the user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const documents = await Document.find({
      $or: [
        { owner: userId },
        { sharedWith: userId },
        { collaborators: userId }, // backward compat
      ],
    }).sort({ lastModified: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to see all documents (DEV ONLY) - disabled in production
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/all', async (req, res) => {
    try {
      const allDocuments = await Document.find({});
      res.json(allDocuments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Share a document with another user with role
router.post('/:documentId/share', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { username, role = 'editor' } = req.body;
    const normalizedRole = ['editor', 'viewer'].includes(role) ? role : 'viewer';

    const document = await Document.findById(documentId);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    // Ensure document has an owner (legacy empty case)
    if (!document.owner) {
      document.owner = req.user.userId;
      await document.save();
    }

    if (getOwnerId(document) !== req.user.userId) {
      return res.status(403).json({ message: 'Only the document owner can share it' });
    }

    const User = require('../models/User');
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (!document.roleMap) document.roleMap = new Map();
    // Never downgrade owner or allow sharing that would strip owner
  if (getOwnerId(document) === targetUser._id.toString()) {
      // Target is already owner; ignore role change
    } else {
      document.roleMap.set(targetUser._id.toString(), normalizedRole);
    }

    // maintain sharedWith
    if (!document.sharedWith?.some?.(id => id.toString() === targetUser._id.toString())) {
      document.sharedWith = document.sharedWith || [];
      document.sharedWith.push(targetUser._id);
    }

    // Backward compat collaborators
  if (normalizedRole === 'editor' && getOwnerId(document) !== targetUser._id.toString()) {
      if (!document.collaborators.some(id => id.toString() === targetUser._id.toString())) {
        document.collaborators.push(targetUser._id);
      }
    }

    await document.save();
    res.json({ message: 'Document shared successfully', roleMap: Object.fromEntries(document.roleMap) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get document access info
router.get('/:documentId/access', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId).populate('owner collaborators', 'username');
    if (!document) return res.status(404).json({ message: 'Document not found' });

  const userId = req.user.userId;
  normalizeLegacyOwner(document, userId);
  const ownerId = getOwnerId(document);
  const isOwner = ownerId === userId;
  const inCollab = document.collaborators?.some(collab => collab._id ? collab._id.toString() === userId : collab.toString() === userId);
  const inShared = document.sharedWith?.some(id => id.toString() === userId);
  let role = document.roleMap?.get?.(userId) || document.roleMap?.[userId] || (inCollab ? 'editor' : (inShared ? 'viewer' : 'none'));
  if (isOwner) role = 'owner';
    if (!(isOwner || role !== 'none')) {
      const emptyDoc = (!document.data || Object.keys(document.data).length === 0) && (!document.versions || document.versions.length === 0);
      const noRelations = (!document.collaborators || document.collaborators.length === 0) && (!document.sharedWith || document.sharedWith.length === 0);
      if (emptyDoc && noRelations) {
        // Auto-claim truly orphan blank doc
        document.owner = userId;
        await document.save();
        return res.json({
          id: document._id,
            title: document.title,
            owner: document.owner,
            collaborators: document.collaborators,
            isOwner: true,
            role: 'owner',
            claimed: true
        });
      }
      return res.status(403).json({
        message: 'Access denied',
        debug: {
          documentId: document._id,
          owner: document.owner?.toString?.(),
          requester: userId,
          roleComputed: role,
          collaborators: (document.collaborators||[]).map(c=>c._id?c._id.toString():c.toString()),
          sharedWith: (document.sharedWith||[]).map(id=>id.toString())
        }
      });
    }

    res.json({
      id: document._id,
      title: document.title,
      owner: document.owner,
      collaborators: document.collaborators,
      isOwner,
      role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get full document (data + meta) if user has access
router.get('/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);
    if (!document) return res.status(404).json({ message: 'Document not found' });

  const userId = req.user.userId;
  normalizeLegacyOwner(document, userId);
  const ownerId = getOwnerId(document);
  const isOwner = ownerId === userId;
    const collab = document.collaborators?.some?.(id => id.toString() === userId);
    const shared = document.sharedWith?.some?.(id => id.toString() === userId);
  let role = document.roleMap?.get?.(userId) || document.roleMap?.[userId] || (collab ? 'editor' : (shared ? 'viewer' : 'none'));
  if (isOwner) role = 'owner';
    if (!(isOwner || role !== 'none')) return res.status(403).json({ message: 'Access denied' });

    res.json({
      id: document._id,
      title: document.title,
      data: document.data,
      lastModified: document.lastModified,
      createdAt: document.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new document (returns id)
router.post('/', auth, async (req, res) => {
  try {
    const { title = 'Untitled Document' } = req.body || {};
    const doc = await Document.create({
      _id: require('uuid').v4(),
      title,
      data: {},
      owner: req.user.userId,
      lastModified: new Date(),
      createdAt: new Date(),
    });
    res.status(201).json({ id: doc._id, document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a document (owner only)
router.delete('/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
  normalizeLegacyOwner(doc, req.user.userId);
  if (doc.owner?.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    await Document.deleteOne({ _id: documentId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unshare (owner only)
router.post('/:documentId/unshare', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.body;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
  normalizeLegacyOwner(doc, req.user.userId);
  if (doc.owner?.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });

    if (doc.roleMap?.delete) doc.roleMap.delete(userId);
    if (Array.isArray(doc.collaborators)) {
      doc.collaborators = doc.collaborators.filter(id => id.toString() !== userId);
    }
    if (Array.isArray(doc.sharedWith)) {
      doc.sharedWith = doc.sharedWith.filter(id => id.toString() !== userId);
    }
    await doc.save();
    res.json({ message: 'Unshared', roleMap: Object.fromEntries(doc.roleMap || []) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate invite link (owner only)
router.post('/:documentId/invite-link', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { role = 'viewer', expiresIn = '3d' } = req.body || {};
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.owner?.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });

    const normalizedRole = ['editor', 'viewer'].includes(role) ? role : 'viewer';
    const token = jwt.sign({ documentId, role: normalizedRole }, JWT_SECRET, { expiresIn });
    res.json({ inviteToken: token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept invite (adds current user to roleMap)
router.post('/accept-invite', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const payload = jwt.verify(token, JWT_SECRET);
    const { documentId, role } = payload;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (!doc.roleMap) doc.roleMap = new Map();
    doc.roleMap.set(req.user.userId, role);

    // maintain sharedWith + collaborators as needed
    if (!doc.sharedWith?.some?.(id => id.toString() === req.user.userId)) {
      doc.sharedWith = doc.sharedWith || [];
      doc.sharedWith.push(req.user.userId);
    }
    if (role === 'editor') {
      if (!doc.collaborators.some(id => id.toString() === req.user.userId)) {
        doc.collaborators.push(req.user.userId);
      }
    }
    await doc.save();
    res.json({ message: 'Invite accepted', documentId });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired invite' });
  }
});

// Version history routes
router.get('/:documentId/versions', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
  normalizeLegacyOwner(doc, req.user.userId);
  const role = doc.roleMap?.get?.(req.user.userId) || doc.roleMap?.[req.user.userId] || (doc.owner?.toString() === req.user.userId ? 'owner' : 'none');
    if (role === 'none' && doc.owner?.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json((doc.versions || []).map((v, idx) => ({ index: idx, at: v.at, title: v.title })));
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:documentId/restore', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { index } = req.body || {};
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
  normalizeLegacyOwner(doc, req.user.userId);
  if (doc.owner?.toString() !== req.user.userId) return res.status(403).json({ message: 'Owner only' });
    if (!Array.isArray(doc.versions) || index < 0 || index >= doc.versions.length) return res.status(400).json({ message: 'Invalid version index' });
    const v = doc.versions[index];
    doc.data = v.data || {};
    if (v.title) doc.title = v.title;
    doc.lastModified = new Date();
    await doc.save();
    res.json({ message: 'Restored', title: doc.title });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
