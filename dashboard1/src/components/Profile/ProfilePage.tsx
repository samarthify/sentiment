import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import {
  Box, Button, Container, TextField, Typography, Paper, CircularProgress, Alert,
  List, ListItem, ListItemIcon, ListItemText,
  Grid, Divider, Collapse
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth(); // Get the current user
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false); // Used for both password and profile update
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false); // <-- State for collapse

  // State for profile info
  const [displayName, setDisplayName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Populate profile state from user metadata on load
  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name);
    } else if (user?.email) {
      // Fallback to part of email if no display name exists
      setDisplayName(user.email.split('@')[0]);
    }
  }, [user]);

  // State and effect for password requirements checklist (similar to AuthPage)
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    setRequirements({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
    });
  }, [newPassword]);

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    // --- Validation ---
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (!requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number) {
      setPasswordError('New password does not meet all requirements.');
      return;
    }
    // --- End Validation ---

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      console.error('Password update error:', err.message);
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);

    if (!displayName) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ 
        data: { display_name: displayName } 
      });

      if (updateError) {
        throw updateError;
      }

      setProfileMessage('Display name updated successfully!');
      setIsEditingProfile(false);

    } catch (err: any) {
      console.error('Profile update error:', err.message);
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const resetDisplayName = () => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name);
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    } else {
      setDisplayName('');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    // Should ideally not happen if routes are protected, but good practice
    return (
      <Container component="main" maxWidth="md">
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography>Please log in to view your profile.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm"> { /* Changed maxWidth back to sm */}
      <Paper elevation={3} sx={{ padding: { xs: 2, md: 4 }, mt: 4, borderRadius: '12px' }}>
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          {t('profile.title', 'Profile Settings')}
        </Typography>

        {/* --- Account Information Section --- */}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>{t('profile.accountInfo', 'Account Information')}</Typography>
        
        {/* Email Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}> { /* Reduced margin bottom */ }
          <AccountCircle sx={{ fontSize: 40, mr: 2, color: 'text.secondary' }} />
          <Box>
            <Typography variant="caption" color="text.secondary">{t('profile.emailLabel', 'Email')}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{user.email}</Typography>
          </Box>
        </Box>

        {/* --- Display Name Section (Moved Here) --- */}
        {isEditingProfile ? (
           <Box component="form" onSubmit={handleUpdateProfile} noValidate sx={{ width: '100%', my: 2 }}> { /* Added vertical margin */ }
             {profileError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{profileError}</Alert>}
             {profileMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{t(profileMessage)}</Alert>}
             <TextField
               margin="dense"
               required
               fullWidth
               id="displayName"
               label={t('profile.displayNameLabel', 'Display Name')}
               name="displayName"
               value={displayName}
               onChange={(e) => setDisplayName(e.target.value)}
               disabled={loading}
               size="small"
             />
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}> { /* Reduced top margin */}
               <Button 
                 size="small" 
                 onClick={() => { setIsEditingProfile(false); setProfileError(null); setProfileMessage(null); resetDisplayName(); }}
                 disabled={loading}
               >
                 {t('profile.cancel', 'Cancel')}
               </Button>
               <Button 
                 variant="contained" 
                 size="small" 
                 type="submit"
                 disabled={loading || !displayName}
               >
                  {loading && isEditingProfile ? <CircularProgress size={20} color="inherit" /> : t('profile.save', 'Save')}
               </Button>
             </Box>
           </Box>
         ) : (
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mt: 1, mb: 2 }}> { /* Adjusted margin */ }
             <Box>
                <Typography variant="caption" color="text.secondary">{t('profile.displayNameLabel', 'Display Name')}</Typography>
                <Typography variant="body1">{displayName || t('profile.notSet', 'Not Set')}</Typography>
             </Box>
             <Button 
               variant="text" // Use text button for less emphasis
               size="small"
               onClick={() => { setIsEditingProfile(true); setProfileError(null); setProfileMessage(null); }}
               sx={{ ml: 2 }} // Add margin left
             >
               {t('profile.edit', 'Edit')}
             </Button>
           </Box>
         )}
         {/* End Display Name Section */}

        <Divider sx={{ my: 2 }} />
        
        {/* Account Dates */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('profile.accountCreated', 'Account Created:')}</Typography>
          <Typography variant="body1">
            {user.created_at ? format(new Date(user.created_at), 'PPP p') : 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">{t('profile.lastSignedIn', 'Last Signed In:')}</Typography>
          <Typography variant="body1">
             {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPP p') : 'N/A'}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} /> { /* Divider remains before Password section */}

        {/* --- Update Password Section (Collapsible) --- */}
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
           <Typography variant="h6">{t('profile.password', 'Password')}</Typography>
           <Button 
             variant="outlined" 
             size="small"
             onClick={() => setShowPasswordForm(!showPasswordForm)}
           >
             {showPasswordForm ? t('profile.cancel', 'Cancel') : t('profile.changePassword', 'Change Password')}
           </Button>
         </Box>

        <Collapse in={showPasswordForm} timeout="auto" unmountOnExit>
          <Box component="form" onSubmit={handleUpdatePassword} noValidate sx={{ width: '100%', mt: 2 }}>
            {passwordError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{passwordError}</Alert>}
            {passwordMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{t(passwordMessage)}</Alert>}

            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label={t('profile.newPassword', 'New Password')}
              type="password"
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              size="small"
            />
            
            {/* Password Requirements Checklist */}
            <List dense sx={{ width: '100%', mt: 1, mb: 1, p: 0 }}>
               {[ 
                 { key: 'length', text: t('validation.passwordMinLength', 'At least 8 characters') },
                 { key: 'uppercase', text: t('validation.passwordUppercase', 'At least one uppercase letter') },
                 { key: 'lowercase', text: t('validation.passwordLowercase', 'At least one lowercase letter') },
                 { key: 'number', text: t('validation.passwordNumber', 'At least one number') },
               ].map((req) => (
                 <ListItem key={req.key} disablePadding sx={{ py: 0 }}>
                   <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                     {requirements[req.key] ? (
                       <CheckCircleOutlineIcon fontSize="small" color="success" />
                     ) : (
                       <HighlightOffIcon fontSize="small" color={newPassword.length > 0 ? 'error' : 'disabled'} />
                     )}
                   </ListItemIcon>
                   <ListItemText 
                     primary={req.text} 
                     primaryTypographyProps={{ variant: 'caption', color: requirements[req.key] ? 'text.primary' : 'text.secondary' }} 
                   />
                 </ListItem>
               ))}
            </List>

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label={t('profile.confirmNewPassword', 'Confirm New Password')}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              size="small"
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 1, py: 1 }} 
              disabled={loading || !newPassword || !confirmPassword || !requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number}
            >
              {loading && !isEditingProfile ? <CircularProgress size={24} color="inherit" /> : t('profile.updatePasswordButton', 'Update Password')}
            </Button>
          </Box>
        </Collapse>

        {/* Sign Out Section */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="error">{t('profile.accountActions', 'Account Actions')}</Typography>
        </Box>
        
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          sx={{ 
            py: 1.5,
            borderColor: '#ef4444',
            color: '#ef4444',
            '&:hover': {
              borderColor: '#dc2626',
              backgroundColor: 'rgba(239, 68, 68, 0.04)',
            }
          }}
        >
          {t('profile.signOut', 'Sign Out')}
        </Button>

      </Paper>
    </Container>
  );
}; 