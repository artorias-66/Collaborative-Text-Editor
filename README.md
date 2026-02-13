# ✍️ Collaborative Text Editor with AI Assistant

A full-stack, real-time collaborative text editor powered by **Yjs CRDT**, **WebSockets**, and **Google Gemini AI** — enabling multiple users to edit documents simultaneously with intelligent writing assistance.

## 🚀 Live Demo

**[collaborative-editor-frontend.onrender.com](https://collaborative-editor-frontend.onrender.com)**

---

## ✨ Features

### Real-Time Collaboration
- **Conflict-free editing** with Yjs CRDT — no data loss, even with simultaneous edits
- **Live cursors & presence** — see who's editing in real time
- **Instant sync** via WebSocket with sub-200ms latency

### AI Writing Assistant (Google Gemini)
- **Grammar & Style Check** — get corrected text instantly
- **Text Enhancement** — improve clarity, tone, and readability
- **Summarization** — distill long content into key points
- **Auto-Complete** — continue writing naturally from context
- **Streaming responses** — see AI output as it's generated

### Document Management
- Create, edit, delete, and share documents
- **One-click sharing** — copies link to clipboard
- Auto-save with debouncing
- User authentication with JWT

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React · TypeScript · Material-UI · Quill.js · Yjs |
| **Backend** | Node.js · Express · TypeScript · WebSocket |
| **Database** | MongoDB with Mongoose |
| **AI** | Google Gemini API (streaming SSE) |
| **Realtime** | Yjs CRDT · y-websocket · y-quill |
| **Auth** | JWT with httpOnly cookies |
| **Security** | Helmet · CORS · Rate Limiting · Input Sanitization |
| **Deployment** | Render (server) · Render Static Site (client) |

---

## 📁 Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/        # Login & Register
│   │   │   ├── Dashboard/   # Document management
│   │   │   └── Editor/      # Quill editor + AI panel
│   │   ├── services/        # API & socket clients
│   │   └── theme.tsx        # MUI dark theme
│   └── package.json
│
├── server/                  # Express backend
│   ├── config/              # Database configuration
│   ├── middleware/           # Auth, rate limiting, validation
│   ├── models/              # Mongoose schemas (User, Document)
│   ├── routes/              # REST API routes
│   ├── services/            # Gemini AI service
│   ├── websockets/          # Yjs WebSocket handler
│   └── package.json
│
├── docker-compose.yml       # Docker setup
├── render.yaml              # Render deployment config
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Google Gemini API Key** ([Get one free](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/artorias-66/Collaborative-Text-Editor.git
cd Collaborative-Text-Editor

# Install all dependencies
cd server && npm install
cd ../client && npm install
```

### Environment Setup

**Server** — create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Client** — create `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Run Locally

```bash
# Terminal 1 — Start server
cd server && npm run dev

# Terminal 2 — Start client
cd client && npm start
```

Open **http://localhost:3000** in your browser.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List user's documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/share` | Generate share link |
| GET | `/api/documents/share/:link` | Access shared document |

### AI Assistant (supports SSE streaming)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/grammar-check` | Check grammar & style |
| POST | `/api/ai/enhance` | Enhance text quality |
| POST | `/api/ai/summarize` | Summarize content |
| POST | `/api/ai/complete` | Auto-complete text |
| POST | `/api/ai/suggestions` | Get writing suggestions |

---

## 🔒 Security

- **JWT authentication** with secure httpOnly cookies
- **Rate limiting** on all API endpoints
- **Input sanitization** with express-validator and XSS protection
- **Helmet.js** security headers
- **CORS** whitelisting

---

## 🐳 Docker

```bash
docker-compose up --build
```

---

## 📄 License

ISC
