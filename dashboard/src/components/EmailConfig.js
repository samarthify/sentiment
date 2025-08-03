import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  Chip,
  Grid,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DataService from '../services/DataService';
import { useAuth } from '../contexts/AuthContext.tsx';

const EmailConfig = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [notifyOnCollection, setNotifyOnCollection] = useState(false);
  const [notifyOnProcessing, setNotifyOnProcessing] = useState(false);
  const [notifyOnAnalysis, setNotifyOnAnalysis] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load email configuration on component mount
  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        const config = await DataService.getEmailConfig(session?.access_token);
        setEmails(config.recipients || []);
        setNotifyOnCollection(config.notifyOnCollection || false);
        setNotifyOnProcessing(config.notifyOnProcessing || false);
        setNotifyOnAnalysis(config.notifyOnAnalysis || true);
        setNotificationsEnabled(config.enabled || false);
      } catch (error) {
        console.error('Error loading email configuration:', error);
        setSnackbar({
          open: true,
          message: t('emailConfig.loadError'),
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmailConfig();
  }, [t, session?.access_token]);

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleAddEmail = () => {
    if (!newEmail) {
      setEmailError(t('emailConfig.emptyEmailError'));
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError(t('emailConfig.invalidEmailError'));
      return;
    }

    if (emails.includes(newEmail)) {
      setEmailError(t('emailConfig.duplicateEmailError'));
      return;
    }

    setEmails([...emails, newEmail]);
    setNewEmail('');
    setEmailError('');
  };

  const handleDeleteEmail = (email) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleEmailChange = (e) => {
    setNewEmail(e.target.value);
    setEmailError('');
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const config = {
        recipients: emails,
        notifyOnCollection,
        notifyOnProcessing,
        notifyOnAnalysis,
        enabled: notificationsEnabled
      };
      
      await DataService.saveEmailConfig(config, session?.access_token);
      
      setSnackbar({
        open: true,
        message: t('emailConfig.saveSuccess'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving email configuration:', error);
      setSnackbar({
        open: true,
        message: t('emailConfig.saveError'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for sending a test email
  const handleSendTestEmail = async () => {
    if (emails.length === 0) {
      setSnackbar({
        open: true,
        message: t('emailConfig.noRecipientForTest', 'Please add at least one recipient email first.'),
        severity: 'warning'
      });
      return;
    }

    const testRecipient = emails[0]; // Send to the first email in the list
    setIsSendingTest(true);
    try {
      const result = await DataService.sendTestEmail(testRecipient);
      if (result.status === 'success') {
        setSnackbar({
          open: true,
          message: t('emailConfig.testEmailSuccess', `Test email sent successfully to ${testRecipient}`),
          severity: 'success'
        });
      } else {
        // Use detail from API if available, otherwise use generic message
        const errorMessage = result.detail || result.message || 'Unknown error';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setSnackbar({
        open: true,
        message: t('emailConfig.testEmailError', `Failed to send test email: ${error.message}`),
        severity: 'error'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          {t('emailConfig.title')}
          <Tooltip title={t('emailConfig.tooltip', 'Configure email notifications for different stages.')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('emailConfig.notificationSettings')}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={t('emailConfig.enableNotifications')}
            />
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyOnCollection}
                    onChange={(e) => setNotifyOnCollection(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={t('emailConfig.notifyOnCollection')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyOnProcessing}
                    onChange={(e) => setNotifyOnProcessing(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={t('emailConfig.notifyOnProcessing')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyOnAnalysis}
                    onChange={(e) => setNotifyOnAnalysis(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={t('emailConfig.notifyOnAnalysis')}
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('emailConfig.recipientList')}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <TextField
              label={t('emailConfig.emailAddress')}
              variant="outlined"
              fullWidth
              value={newEmail}
              onChange={handleEmailChange}
              error={!!emailError}
              helperText={emailError}
              disabled={!notificationsEnabled}
              sx={{ mr: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddEmail}
              disabled={!notificationsEnabled}
            >
              {t('emailConfig.add')}
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {emails.length > 0 ? (
            <List>
              {emails.map((email, index) => (
                <ListItem key={index} divider={index < emails.length - 1}>
                  <ListItemText primary={email} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleDeleteEmail(email)}
                      disabled={!notificationsEnabled}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <MailIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="textSecondary">
                {t('emailConfig.noRecipients')}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={isSendingTest ? <CircularProgress size={20} color="inherit" /> : <MailIcon />}
              onClick={handleSendTestEmail}
              disabled={loading || isSendingTest || emails.length === 0 || !notificationsEnabled}
              sx={{ mr: 2 }}
            >
              {isSendingTest ? t('emailConfig.sending', 'Sending...') : t('emailConfig.sendTestEmail', 'Send Test Email')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveConfig}
              disabled={loading || isSendingTest}
            >
              {t('emailConfig.saveSettings')}
            </Button>
          </Box>
        </Paper>
      </motion.div>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailConfig; 