# Quick Start Guide

## Prerequisites Check

- ✅ Node.js 18+ installed
- ✅ MongoDB Atlas connection string (or local MongoDB)
- ✅ Google Gemini API key

## Setup Steps

### 1. Install Dependencies

**Option A: Run setup script**
```bash
# Windows
setup.bat

# Linux/Mac
chmod +x setup.sh
./setup.sh
```

**Option B: Manual installation**
```bash
npm run install-all
```

### 2. Configure Environment Variables

**Backend** (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://23it044_db_user:artorias@cluster0.h0aiibb.mongodb.net/collab_editor?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=c7c8950a78a38d18714d452493e1859ee3a86219499cb0719276ebbf09450bfa5697fcb2a62dae46d36bad917f34e75c511624f350bea2b89ba8a20401866ff9
GEMINI_API_KEY=AIzaSyBSNYQOcaBJ0-6rv3q0m-GJ_shBfavOPJI
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Frontend** (`client/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 3. Start the Application

**Start both servers:**
```bash
npm run dev
```

**Or start separately:**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## Testing the Application

1. **Register a new account** at http://localhost:3000/register
2. **Create a document** from the dashboard
3. **Open the document** in multiple browser tabs/windows
4. **Type in one tab** - see changes appear in real-time in other tabs
5. **Click the AI icon** to open AI assistant
6. **Try AI features**:
   - Grammar Check
   - Text Enhancement
   - Summarization
   - Auto-completion
   - Writing Suggestions

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:
- Backend: Change `PORT` in `server/.env`
- Frontend: React will automatically use next available port

### MongoDB Connection Error
- Verify MongoDB URI is correct
- Check network connectivity
- Ensure MongoDB Atlas IP whitelist includes your IP

### Socket.io Connection Issues
- Check browser console for errors
- Verify CORS settings match frontend URL
- Ensure authentication token is valid

### AI API Errors
- Verify Gemini API key is correct
- Check API quota limits
- Ensure network connectivity

## Common Commands

```bash
# Install all dependencies
npm run install-all

# Start development (both servers)
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client

# Backend production mode
cd server
npm start

# Frontend build
cd client
npm run build
```

## Features to Test

- ✅ User registration and login
- ✅ Create, edit, delete documents
- ✅ Real-time collaborative editing
- ✅ Auto-save (every 30 seconds)
- ✅ Manual save
- ✅ Document sharing
- ✅ AI Grammar Check
- ✅ AI Text Enhancement
- ✅ AI Summarization
- ✅ AI Auto-completion
- ✅ AI Writing Suggestions
- ✅ User presence indicators
- ✅ Multiple users editing simultaneously

## Next Steps

After setup, explore:
1. Create multiple accounts and test collaboration
2. Try all AI features with different text samples
3. Test document sharing with share links
4. Check real-time sync with multiple browser windows

Happy coding! 🚀


