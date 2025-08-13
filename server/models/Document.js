const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, default: 'Untitled Document' },
  data: { type: Object, default: {} },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaborators: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  sharedWith: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  roleMap: { type: Map, of: String, default: {} },
  _migrationClaimed: { type: Boolean, default: false }, // internal flag for legacy owner migration
  versions: {
    type: [
      new mongoose.Schema({
        at: { type: Date, default: Date.now },
        data: { type: Object, default: {} },
        title: { type: String, default: '' },
      }, { _id: false })
    ],
    default: []
  },
  lastModified: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', DocumentSchema);
