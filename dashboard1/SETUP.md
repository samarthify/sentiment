# Dashboard Setup Guide

## Authentication Configuration

The dashboard requires Supabase authentication to work properly. Follow these steps to configure it:

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note down your project URL and anon key from the project settings

### 2. Configure Environment Variables

Update the `env.local` file in the dashboard directory with your actual Supabase credentials:

```env
# API Configuration (your AWS backend)
REACT_APP_API_URL=http://13.202.48.110:8000

# Supabase Configuration - REPLACE WITH YOUR ACTUAL SUPABASE CREDENTIALS
# Get these from your Supabase project dashboard: https://supabase.com/dashboard
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-actual-supabase-anon-key-here
```

### 3. Configure Supabase Authentication

In your Supabase project dashboard:

1. Go to Authentication > Settings
2. Configure your authentication providers (Email, Google, etc.)
3. Set up your site URL and redirect URLs
4. Configure JWT settings if needed

### 4. Backend Configuration

Make sure your backend has the correct Supabase JWT secret configured:

1. In your Supabase project, go to Settings > API
2. Copy the JWT secret
3. Set the `SUPABASE_JWT_SECRET` environment variable in your backend

### 5. Common Issues

#### "Failed to fetch Target Individual Name"
This error typically occurs when:
- Supabase credentials are not configured properly
- User is not authenticated
- Backend JWT secret is not configured correctly

#### "Authentication required" error
This means the user needs to log in. Check that:
- Supabase URL and anon key are correct
- User has signed up/logged in through the dashboard
- Authentication is properly configured in Supabase

### 6. Testing

1. Start the dashboard: `npm start`
2. Try to log in with a test user
3. Navigate to the Target Individual Configuration page
4. The configuration should load without errors

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console for authentication errors
2. Verify your Supabase credentials are correct
3. Ensure the backend is running and accessible
4. Check that the JWT secret is properly configured on the backend 