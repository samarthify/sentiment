import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.ts';
// import { useAuth } from '../../contexts/AuthContext.tsx'; // We might use this later for redirects or state
import {
  Box, Button, Container, TextField, Typography, Link, CircularProgress, Alert, Paper, Avatar,
  List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Import an icon
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Icon for met requirement
import HighlightOffIcon from '@mui/icons-material/HighlightOff'; // Icon for unmet requirement

export const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success messages like "Check email"

  // State for password requirements checklist
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    // specialChar: false, // Optional
  });

  // Effect to update requirements as password changes (only in signup view)
  useEffect(() => {
    if (isLoginView) return; // Only run validation for signup view

    setRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      // specialChar: /[^A-Za-z0-9]/.test(password), // Optional
    });
  }, [password, isLoginView]);

  // const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();
  //   setLoading(true);
  //   setError(null);
  //   setMessage(null);

  //   // --- Password Validation (only for Sign Up) ---
  //   if (!isLoginView) {
  //     // Check the state instead of re-validating
  //     if (!requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number /* || !requirements.specialChar */) {
  //       setError('Password does not meet all requirements.');
  //       setLoading(false);
  //       return;
  //     }
  //   }
  //   // --- End Password Validation ---

  //   try {
  //     let response;
  //     if (isLoginView) {
  //       response = await supabase.auth.signInWithPassword({
  //         email: email,
  //         password: password,
  //       });
  //     } else {
  //       response = await supabase.auth.signUp({
  //         email: email,
  //         password: password,
  //       });
  //       // If sign up is successful and requires email confirmation (default behavior)
  //       if (response.data.user && !response.error) {
  //          setMessage('Sign up successful! Please check your email to confirm your account.');
  //          // Optionally clear form or redirect 
  //          await fetch("http://localhost:8000/user/register", {
  //             method: "POST",
  //             headers: {
  //               "Content-Type": "application/json"
  //             },
  //             body: JSON.stringify({
  //                 id: response.data.user.id,
  //                 email: response.data.user.email,
  //                 name: response.data.user.email.split('@')[0], // or use form field
  //                 password: password,
  //                 is_admin: false
  //               })
  //           });

  //           // Optionally clear form or redirect
  //           setEmail('');
  //           setPassword('');
  //       }
  //     }
  //     if (response.error) {
  //       throw response.error;
  //     }

  //     // Login successful, AuthProvider will handle redirect via state change if routes are protected
  //     // console.log(isLoginView ? 'Login successful:' : 'Signup initiated:', response);

  //   } catch (error: any) {
  //     console.error('Authentication error:', error.message);
  //     setError(error.message || 'An unexpected error occurred.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!isLoginView) {
      if (!requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number) {
        setError('Password does not meet all requirements.');
        setLoading(false);
        return;
      }
    }

    try {
      let response;
      if (isLoginView) {
        response = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
      } else {
        response = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (response.data.user && !response.error) {
          setMessage('Sign up successful! Please check your email to confirm your account.');
        }
      }

      // ✅ Yeh part ab dono ke liye chalega: login + signup
      if (response.data.user && !response.error) {
        await fetch("http://localhost:8000/user/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: response.data.user.id,
            email: response.data.user.email,
            name: response.data.user.email.split('@')[0],
            password: password,
            is_admin: false
          })
        });

        setEmail('');
        setPassword('');
      }

      if (response.error) {
        throw response.error;
      }

    } catch (error: any) {
      console.error('Authentication error:', error.message);
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null); // Clear errors when switching views
    setMessage(null);
    setEmail(''); // Clear form fields
    setPassword('');
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '12px' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          {isLoginView ? 'Log In' : 'Sign Up'}
        </Typography>
        <Box component="form" onSubmit={handleAuthAction} noValidate sx={{ width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="info" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete={isLoginView ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {/* Conditionally display password requirements checklist for Sign Up */}
          {!isLoginView && (
            <List dense sx={{ width: '100%', mt: 1, mb: 0, p: 0 }}>
              {[ // Define requirements as an array for mapping
                { key: 'length', text: 'At least 8 characters' },
                { key: 'uppercase', text: 'At least one uppercase letter' },
                { key: 'lowercase', text: 'At least one lowercase letter' },
                { key: 'number', text: 'At least one number' },
                // { key: 'specialChar', text: 'At least one special character' }, // Optional
              ].map((req) => (
                <ListItem key={req.key} disablePadding sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                    {requirements[req.key] ? (
                      <CheckCircleOutlineIcon fontSize="small" color="success" />
                    ) : (
                      <HighlightOffIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={req.text} 
                    primaryTypographyProps={{ 
                      variant: 'caption', 
                      color: requirements[req.key] ? 'text.primary' : 'text.secondary' // Dim unmet requirements
                    }} 
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading || !email || !password}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : (isLoginView ? 'Log In' : 'Sign Up')}
          </Button>
          <Box textAlign="center">
            <Link component="button" variant="body2" onClick={toggleView} sx={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'primary.main', textDecoration: 'underline' }}>
              {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </Link>
          </Box>
        </Box>
      </Paper>
      {/* Add Social Login Buttons here if needed */}
      {/* <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="outlined" startIcon={<GoogleIcon />} onClick={handleGoogleSignIn} disabled={loading}>Sign in with Google</Button>
      </Box> */}
    </Container>
  );
}; 
