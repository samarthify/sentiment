# Sentiment Analysis Dashboard - Vercel Deployment

This is the frontend React application for the Sentiment Analysis Dashboard.

## Vercel Deployment Guide

### Prerequisites
- Vercel account
- Supabase project configured
- AWS backend API running

### Environment Variables

Configure these environment variables in your Vercel project settings:

1. **REACT_APP_SUPABASE_URL**: Your Supabase project URL
2. **REACT_APP_SUPABASE_ANON_KEY**: Your Supabase anonymous key
3. **REACT_APP_API_URL**: Your AWS backend API URL

### Deployment Steps

1. **Connect to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   ```

2. **Deploy from dashboard directory**:
   ```bash
   cd dashboard
   vercel
   ```

3. **Configure Environment Variables**:
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add the required environment variables

4. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Features

- Real-time sentiment analysis dashboard
- Multi-language support (EN, AR, DE, ES, FR)
- Interactive charts and visualizations
- Supabase authentication
- Responsive design

### API Integration

The frontend connects to your AWS backend API for:
- Data retrieval
- User authentication
- Email notifications
- Agent triggers

Make sure your AWS backend is accessible and CORS is properly configured.
