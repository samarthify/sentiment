#!/bin/bash

# Vercel Deployment Script for Sentiment Analysis Dashboard
echo "🚀 Starting Vercel deployment..."

# Check if we're in the dashboard directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the dashboard directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check environment variables
echo "🔍 Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from template..."
    cp env.example .env.local
    echo "📝 Please update .env.local with your actual credentials before deploying"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed! Please check for errors above."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📝 IMPORTANT: Configure environment variables in your Vercel dashboard:"
echo "   - Go to your Vercel project settings"
echo "   - Navigate to Environment Variables"
echo "   - Add the following variables:"
echo "     * REACT_APP_SUPABASE_URL"
echo "     * REACT_APP_SUPABASE_ANON_KEY"
echo "     * REACT_APP_API_URL (use HTTPS URL to avoid mixed content errors)"
echo ""
echo "🔧 If you're getting mixed content errors, make sure your backend supports HTTPS"
echo "   See HTTPS_SETUP.md for instructions on setting up HTTPS on your backend" 