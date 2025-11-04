#!/bin/bash

echo "🚀 Setting up Collaborative Text Editor..."

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing backend dependencies..."
cd server
npm install

echo "📦 Installing frontend dependencies..."
cd ../client
npm install

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Or start separately:"
echo "  Backend:  cd server && npm run dev"
echo "  Frontend: cd client && npm start"


