# Vercel Deployment Guide

## Quick Start

### 1. Prerequisites
- [Vercel account](https://vercel.com/signup)
- [Supabase project](https://supabase.com) (for authentication)
- AWS backend API running

### 2. Install Vercel CLI
```bash
npm i -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy
```bash
cd dashboard
vercel
```

## Environment Variables Setup

### Required Variables
Configure these in your Vercel project dashboard (Settings > Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `REACT_APP_API_URL` | Your AWS backend API URL | `https://your-api-domain.com` |

### How to Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon public" key

## Backend CORS Configuration

You need to update your AWS backend CORS settings to allow your Vercel domain:

### Update your FastAPI CORS configuration:
```python
# In src/api/service.py, update the origins list:
origins = [
    "http://localhost:3000",
    "https://your-app-name.vercel.app",  # Add your Vercel domain
    "https://your-custom-domain.com"     # Add if you have a custom domain
]
```

## Deployment Steps

### Option 1: Using Vercel CLI
```bash
# Navigate to dashboard directory
cd dashboard

# Deploy
vercel

# For production deployment
vercel --prod
```

### Option 2: Using GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy on every push

### Option 3: Using the Deployment Script
```bash
cd dashboard
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

## Post-Deployment Checklist

- [ ] Environment variables configured in Vercel dashboard
- [ ] Backend CORS updated to allow Vercel domain
- [ ] Supabase authentication working
- [ ] API endpoints accessible from frontend
- [ ] All features tested (charts, data loading, etc.)

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is compatible (14+ recommended)

2. **Environment Variables Not Working**
   - Verify variable names start with `REACT_APP_`
   - Redeploy after adding environment variables

3. **CORS Errors**
   - Update backend CORS configuration
   - Ensure your Vercel domain is in the allowed origins

4. **API Connection Issues**
   - Verify `REACT_APP_API_URL` is correct
   - Check that your AWS backend is accessible
   - Ensure HTTPS is used for production

### Debug Commands
```bash
# Check build locally
npm run build

# Test environment variables
echo $REACT_APP_SUPABASE_URL

# View Vercel logs
vercel logs
```

## Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update DNS records as instructed

## Performance Optimization

- The app is already optimized with React 18
- Charts use efficient libraries (Nivo, Recharts)
- Images are optimized for web
- Code splitting is enabled

## Security Notes

- Environment variables are encrypted in Vercel
- Supabase handles authentication securely
- API keys are stored securely in Vercel environment variables
- HTTPS is enforced in production

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test API connectivity
4. Check browser console for errors 