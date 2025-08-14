*COMPANY*: CODTECH IT SOLUTIONS

*NAME*: RAJAT DUA

*INTERN ID*: CT04DZ228

*DOMAIN*: FULL STACK WEB DEVELOPMENT

*DURATION*: 4 WEEKS

*MENTOR*: NEELA SANTHOSH

# TeamFlow Docs – Real‑Time Collaborative Editor

A modern, responsive, real‑time collaborative document editor built with React, Quill, Socket.IO, Express, and MongoDB. TeamFlow Docs focuses on seamless multi‑user editing, robust access control, and a clean UX that works across devices and network conditions. It includes document sharing with roles, version history, presence and cursors, and a production‑ready deployment setup.
  
## 🌟 Core Features

- Real‑time Collaboration: Multi‑user editing powered by Socket.IO with live cursors and typing indicators
- Word‑like Editing: Rich text formatting, curated font families and sizes, alignment, lists, headers
- Document Management: Dashboard with search, create, delete (bulk delete with confirm)
- Sharing & Roles: Owner, Editor, Viewer; invite links; robust owner preservation (can’t lose access)
- Access Control: Unified identity model using MongoDB User _id with legacy normalization
- Version History: Auto snapshots and manual save; restore prior versions (owner only)
- Title Rename & Sync: Live title updates across collaborators with permission checks
- Layout & Productivity: Page layout presets, dark mode, zoom, word/character counts
- Resilient UX: Loading and error overlays; read‑only mode when viewer; logout to Register redirect
- Deployment Ready: Single‑project Vercel config (client + API), or split projects if preferred

## 🛠️ Technologies & Stack

### Frontend
- React (CRA)
- React Router (v7)
- Quill + quill‑cursors
- Socket.IO client
- Axios / fetch

### Backend
- Node.js + Express
- Socket.IO server
- MongoDB + Mongoose
- JWT (local) and optional Firebase ID tokens (mapped to local users)
- CORS, compression, rate limiting for auth endpoints

### DevOps & Deployment
- Vercel (single‑project monorepo config included)
- Environment‑based configuration with .env

## 🧭 Architecture Overview

- Single Page App (client) talking to a REST + Socket API (server)
- REST owns auth, document CRUD, sharing, access checks, versions
- Socket channel handles presence, deltas (send‑changes/receive‑changes), cursors, typing, title updates
- Identity: clients send a JWT (or Firebase ID token); server unifies to a single Mongo User _id
- ACL: Document.owner (User), roleMap (Map<userId, role>), collaborators/sharedWith (legacy/back‑compat)

## 📚 API Endpoints (high level)

Base URL: /api

Auth
- POST /auth/register – username, password
- POST /auth/login – returns JWT { token }

Documents
- GET /documents – list documents for user
- GET /documents/:documentId – fetch document (requires access)
- GET /documents/:documentId/access – access info { isOwner, role }
- POST /documents – create new document { title? }
- DELETE /documents/:documentId – delete (owner only)

Sharing & Invites
- POST /documents/:documentId/share – { username, role: 'editor'|'viewer' } (owner only)
- POST /documents/:documentId/unshare – { userId } (owner only)
- POST /documents/:documentId/invite-link – { role, expiresIn } → { inviteToken }
- POST /documents/accept-invite – { token } (adds caller with role)

Versioning
- GET /documents/:documentId/versions – list versions
- POST /documents/:documentId/restore – { index } (owner only)

Health
- GET /health – { ok: true }

Headers
- x-auth-token: <JWT or Firebase ID token>

## 🔌 Socket Events

Auth
- client → authenticate(token)
- server → authentication-success | authentication-failed | authentication-required

Document Load & Presence
- client → get-document(documentId)
- server → load-document(data) | load-error | access-denied
- server → users-update([users]) | user-joined(user) | user-left(user)

Editing
- client → send-changes(delta)
- server → receive-changes({ delta, user })
- client → save-document({ data, manual? })
- server → save-success | save-error(message)

Cursors & Typing
- client → cursor-change(range)
- server → cursor-update({ user, range })
- client → typing(isTyping)
- server → user-typing({ user, isTyping })

Title
- client → update-title(newTitle)
- server → title-updated(newTitle)

Path & Transports
- Socket path: /api/socket.io
- Transports: websocket + polling (for serverless compatibility)

## 🧩 Project Structure

```
TeamFlow-Docs/
├── client/                  # React app (CRA)
│   ├── src/
│   │   ├── components/      # TextEditor, Header, modals, etc.
│   │   ├── pages/           # Dashboard, Landing, Login/Register
│   │   └── lib/firebase.js  # Optional Firebase client helper
│   ├── public/
│   ├── build/               # Production build
│   ├── package.json
│   └── vercel.json          # SPA rewrites (if split deploy)
├── server/                  # Node/Express + Socket.IO API
│   ├── routes/              # auth.js, documents.js
│   ├── middleware/          # auth.js (JWT/Firebase mapping)
│   ├── models/              # User.js, Document.js (owner, roleMap, versions)
│   ├── config.js            # JWT_SECRET, CORS_ORIGINS
│   ├── server.js            # Express + Socket.IO
│   ├── package.json
│   └── vercel.json          # API config (if split deploy)
├── vercel.json              # Single-project deployment (client + API)
├── package.json             # Dev scripts (concurrently start client+server)
└── README.md
```

## 🔑 Configuration & Environment

Server (.env)
- MONGODB_URI=mongodb+srv://...
- JWT_SECRET=your-secret
- CORS_ORIGINS=https://your-domain.vercel.app,http://localhost:3000 (optional)
- FIREBASE_PROJECT_ID=... (optional)
- FIREBASE_CLIENT_EMAIL=... (optional)
- FIREBASE_PRIVATE_KEY=... (optional; replace \n with actual newlines)

Client (client/.env)
- Defaults to same‑origin in production; set only if API is on a different domain:
- REACT_APP_API_URL=
- REACT_APP_SOCKET_URL=
- Optional Firebase client keys (if enabling Google auth in client UI)

## 🧪 Local Development

Prereqs: Node 18+, MongoDB (local or Atlas)

Install all
```bash
npm run install-all
```

Run (dev)
```bash
npm start
```
- Client: http://localhost:3000
- API/Socket: http://localhost:5001 (socket path /api/socket.io)

Build client
```bash
cd client && npm run build
```

## 🚀 Deployment

Option A – Single Vercel Project (recommended)
- repo root → Vercel; `vercel.json` builds both client and API
- Set env vars (server section above) in Vercel
- Routes:
	- /api/* → server/server.js (Node function)
	- /* → client/build

Option B – Two Vercel Projects (split)
- Server project root=server (set server env vars)
- Client project root=client (set REACT_APP_API_URL and REACT_APP_SOCKET_URL to server URL)

## 🔐 Roles & Access Control

- Owner: full control; cannot be downgraded via sharing
- Editor: can edit content and title
- Viewer: read‑only
- Legacy docs: owner normalized when missing; safe owner checks (populated vs ObjectId)

## ⚠️ Notes & Limitations

- Serverless sockets: polling fallback included; for heavy realtime, consider a persistent Node host
- Quill warning: some dev warnings may appear; harmless and suppressed in production

## 👤 Author

Rajat Dua  
- GitHub: https://github.com/therajatdua  
- Instagram: https://instagram.com/therajatdua

## 📄 License

MIT License – feel free to use for learning and development.

## Gallery

<img width="1920" height="1038" alt="image" src="https://github.com/user-attachments/assets/f23d63ef-dcc3-47b7-adf4-c95cf41cbb33" />

<img width="1920" height="1040" alt="image" src="https://github.com/user-attachments/assets/bc9fca41-a98a-43f5-92a3-4ce5b57c138a" />

<img width="1920" height="1044" alt="image" src="https://github.com/user-attachments/assets/061f6350-56f5-486b-8e1a-600b51f42e49" />

<img width="1920" height="998" alt="image" src="https://github.com/user-attachments/assets/86f14671-2130-478b-9e8b-59509cf68153" />

<img width="1920" height="1040" alt="image" src="https://github.com/user-attachments/assets/ea10d1ef-c22c-4ac8-9ed7-c46cc7a50564" />
