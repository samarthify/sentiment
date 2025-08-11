import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  Alert,
  TextField,
  Typography,
  Grid,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Edit as EditIcon, 
  PlayArrow as StartIcon
} from '@mui/icons-material';
import InfoIcon from '@mui/icons-material/Info';
import DataService from '../services/DataService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext.tsx';

const TargetIndividualConfig = () => {
  const { t } = useTranslation();
  const { session, accessToken } = useAuth();
  const [targetConfig, setTargetConfig] = useState({
    individual_name: '',
    query_variations: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newVariation, setNewVariation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // --- State for trigger run --- 
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(null);
  const [triggerError, setTriggerError] = useState(null);
  // -----------------------------

  // Load target individual configuration
  useEffect(() => {
    const loadTargetConfig = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        if (!accessToken) {
          console.error("No authentication token available");
          setError("Authentication required. Please log in to access target individual configuration.");
          setTargetConfig({ individual_name: '', query_variations: [] });
          return;
        }
        
        console.log("Attempting to load target config...");
        const response = await DataService.getTargetIndividual(accessToken);
        
        console.log("Received response from GET /target:", response);

        if (response.status === 'success' && response.data) {
          console.log("Load successful, data found:", response.data);
          setTargetConfig({
            individual_name: response.data.individual_name || '',
            query_variations: response.data.query_variations || []
          });
          setError(null);
        } else {
          console.error("Load failed or data structure incorrect. Response:", response);
          setError(response.message || t('target.loadError'));
          setTargetConfig({ individual_name: '', query_variations: [] });
        }
      } catch (err) {
        console.error("Error caught during loadTargetConfig:", err);
        // Provide more specific error messages based on the error type
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          setError("Authentication failed. Please log in again.");
        } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
          setError("Access denied. Please check your permissions.");
        } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError(t('target.loadError'));
        }
        setTargetConfig({ individual_name: '', query_variations: [] });
      } finally {
        setIsLoading(false);
      }
    };

    loadTargetConfig();
  }, [t, accessToken]);

  // Handle save button click
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Check if user is authenticated
      if (!accessToken) {
        setError("Authentication required. Please log in to save target individual configuration.");
        return;
      }
      
      const response = await DataService.updateTargetIndividual(targetConfig, accessToken);
      
      if (response.status === 'success') {
        setSuccess(t('target.saveSuccess'));
        // Reset editing state
        setIsEditing(false);
      } else {
        setError(response.message || t('target.saveError'));
      }
    } catch (err) {
      console.error('Error saving target config:', err);
      // Provide more specific error messages based on the error type
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError("Authentication failed. Please log in again.");
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError("Access denied. Please check your permissions.");
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(t('target.saveError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- Function to handle triggering the agent run ---
  const handleTriggerRun = async () => {
    setIsTriggering(true);
    setTriggerSuccess(null);
    setTriggerError(null);
    try {
      const result = await DataService.triggerAgentRun(accessToken);
      setTriggerSuccess(result.message || "Agent run successfully triggered!");
    } catch (err) {
      console.error("Error triggering agent run from component:", err);
      setTriggerError(err.message || "Failed to trigger agent run.");
    } finally {
      setIsTriggering(false);
    }
  };
  // -------------------------------------------------

  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle adding a new query variation
  const handleAddVariation = () => {
    if (newVariation.trim() !== '' && !targetConfig.query_variations.includes(newVariation.trim())) {
      setTargetConfig({
        ...targetConfig,
        query_variations: [...targetConfig.query_variations, newVariation.trim()]
      });
      setNewVariation('');
    }
  };

  // Handle removing a query variation
  const handleRemoveVariation = (variation) => {
    setTargetConfig({
      ...targetConfig,
      query_variations: targetConfig.query_variations.filter(v => v !== variation)
    });
  };

  // Begin editing name
  const handleEditNameClick = () => {
    setEditName(targetConfig.individual_name);
    setIsEditing(true);
  };

  // Save new name
  const handleNameSave = () => {
    if (editName.trim() !== '') {
      setTargetConfig({
        ...targetConfig,
        individual_name: editName
      });
      setIsEditing(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <>
      <Card elevation={3}>
        <CardHeader 
          title={
            <Typography variant="h5" component="h1" gutterBottom>
              {t('target.title')}
              <Tooltip title={t('target.subtitle')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          }
          action={
            <Tooltip title={t('target.triggerTooltip', 'Manually start a data collection and processing cycle')}>
              <span>
                <Button 
                  variant="outlined"
                  color="secondary"
                  startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <StartIcon />}
                  onClick={handleTriggerRun}
                  disabled={isLoading || isTriggering}
                >
                  {isTriggering ? t('target.triggering', 'Starting...') : t('target.triggerRun', 'Start Agent Run')}
                </Button>
              </span>
            </Tooltip>
          }
        />
        <Divider />
        <CardContent>
          {isLoading && !isTriggering && (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          {/* --- Display trigger feedback --- */} 
          {triggerSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {triggerSuccess}
            </Alert>
          )}
          {triggerError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {triggerError}
            </Alert>
          )}
          {/* ------------------------------ */}
          
          <Grid container spacing={3}>
            {/* Target Individual Name */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">{t('target.nameSection')}</Typography>
                  {!isEditing && (
                    <IconButton onClick={handleEditNameClick} color="primary" size="small" disabled={isLoading || isTriggering}>
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                
                {isEditing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      label={t('target.nameLabel')}
                      variant="outlined"
                      size="small"
                    />
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small" 
                      onClick={handleNameSave}
                      startIcon={<SaveIcon />}
                    >
                      {t('common.save')}
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="secondary" 
                      size="small" 
                      onClick={handleCancelEdit}
                    >
                      {t('common.cancel')}
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 'bold', py: 1 }}>
                    {targetConfig.individual_name || t('target.noNameSet')}
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            {/* Query Variations */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" mb={2}>{t('target.variationsSection')}</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <TextField
                    fullWidth
                    value={newVariation}
                    onChange={(e) => setNewVariation(e.target.value)}
                    label={t('target.addVariationLabel')}
                    variant="outlined"
                    size="small"
                    disabled={isLoading || isTriggering}
                  />
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={handleAddVariation}
                    disabled={newVariation.trim() === '' || isLoading || isTriggering}
                  >
                    {t('common.add')}
                  </Button>
                </Box>
                
                <List sx={{ maxHeight: '300px', overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
                  {targetConfig.query_variations.length > 0 ? (
                    targetConfig.query_variations.map((variation, index) => (
                      <ListItem
                        key={index}
                        divider={index < targetConfig.query_variations.length - 1}
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => handleRemoveVariation(variation)}
                            disabled={isLoading || isTriggering}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={variation} />
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      {t('target.noVariations')}
                    </Typography>
                  )}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
        
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isLoading || isTriggering}
          >
            {t('common.saveChanges')}
          </Button>
        </Box>
      </Card>

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
    </>
  );
};

export default TargetIndividualConfig; 