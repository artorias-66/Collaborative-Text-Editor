# 🚀 How to Start the Application

## Step-by-Step Instructions

### Step 1: Install Dependencies

Open PowerShell or Command Prompt in the project folder and run:

```powershell
npm run install-all
```

This will install dependencies for:
- Root project
- Backend server
- Frontend client

**Expected time:** 2-5 minutes (depending on your internet speed)

---

### Step 2: Verify Environment Files

The `.env` files have been created automatically with your configuration:
- ✅ `server/.env` - Backend configuration
- ✅ `client/.env` - Frontend configuration

---

### Step 3: Start the Application

**Option A: Start Both Servers Together (Recommended)**

```powershell
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

**Option B: Start Servers Separately**

Open **two separate terminal windows**:

**Terminal 1 - Backend:**
```powershell
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm start
```

---

### Step 4: Access the Application

Once both servers are running, open your browser and go to:

🌐 **http://localhost:3000**

You should see the login page!

---

## First Time Setup

1. **Register an Account**
   - Click "Sign Up" on the login page
   - Enter username, email, and password
   - Click "Sign Up"

2. **Create Your First Document**
   - After login, you'll see the dashboard
   - Click "New Document" button
   - Enter a title and click "Create"

3. **Start Editing**
   - Click on your document to open it
   - Start typing in the editor
   - Changes auto-save every 30 seconds

---

## Test Real-Time Collaboration

1. Open the same document in **two different browser tabs/windows**
2. Type in one tab
3. See changes appear **instantly** in the other tab! ✨

---

## Test AI Features

1. Click the **AI icon** (✨) in the editor toolbar
2. Select an AI feature tab:
   - **Grammar Check** - Fix grammar and style
   - **Enhance** - Improve writing quality
   - **Summarize** - Create summaries
   - **Complete** - Auto-complete text
   - **Suggestions** - Get writing suggestions
3. Enter text or select from document
4. Click "Analyze"
5. Review results and click "Apply to Document" if you want to use them

---

## Troubleshooting

### ❌ Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:** 
- Close any other applications using port 5000 or 3000
- Or change the PORT in `server/.env`

### ❌ MongoDB Connection Error

**Error:** `MongoDB connection error`

**Solution:**
- Check your internet connection
- Verify MongoDB Atlas IP whitelist includes your IP (0.0.0.0/0 for development)

### ❌ Module Not Found

**Error:** `Cannot find module 'xxx'`

**Solution:**
```powershell
# Reinstall dependencies
npm run install-all
```

### ❌ Socket Connection Failed

**Solution:**
- Make sure backend server is running on port 5000
- Check browser console for errors
- Verify CORS settings

---

## Quick Commands Reference

```powershell
# Install all dependencies
npm run install-all

# Start both servers (recommended)
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client

# Stop servers
Press Ctrl+C in the terminal
```

---

## What You Should See

✅ **Backend Terminal:**
```
MongoDB connected successfully
Server running on port 5000
Environment: development
```

✅ **Frontend Browser:**
- Login/Register page at http://localhost:3000
- After login: Dashboard with document list
- Editor with rich text formatting toolbar

---

## Need Help?

- Check `README.md` for detailed documentation
- Check `QUICKSTART.md` for more setup details
- Check browser console (F12) for frontend errors
- Check backend terminal for server errors

---

**Happy Coding! 🎉**


