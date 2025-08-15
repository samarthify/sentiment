import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  Badge,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Tv as TvIcon,
  LiveTv as LiveTvIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  PlayCircleOutline as PlayIcon,
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  Analytics as AnalyticsIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ThumbsUpDown as ThumbsUpDownIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DataService from '../../services/DataService';

// Import AuthContext with error handling
let useAuth = null;
try {
  const authModule = require('../../contexts/AuthContext');
  useAuth = authModule.useAuth;
} catch (error) {
  console.warn('AuthContext not available, using fallback');
  useAuth = () => ({ accessToken: null });
}

const TopTelevision = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [topTelevision, setTopTelevision] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Feedback state
  const [feedbackMenuAnchor, setFeedbackMenuAnchor] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();
  
  // Use the imported hook or fallback
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;

  useEffect(() => {
    const fetchTelevision = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await DataService.getTelevisionSources(accessToken);
        setTopTelevision(data);
      } catch (err) {
        console.error('Error fetching television sources:', err);
        setError(err.message || 'Failed to load television sources');
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch data, even without access token (for testing)
    fetchTelevision();
  }, [accessToken]);

  const getSentimentColor = (score) => {
    if (score >= 0.3) return 'success';
    if (score <= -0.3) return 'error';
    return 'warning';
  };

  const getSentimentIcon = (score) => {
    if (score >= 0.3) return <TrendingUpIcon />;
    if (score <= -0.3) return <TrendingDownIcon />;
    return <RemoveIcon />;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'News Channel': return <TvIcon />;
      case 'Government Channel': return <VerifiedIcon />;
      case 'Entertainment Channel': return <LiveTvIcon />;
      default: return <TvIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'News Channel': return 'primary';
      case 'Government Channel': return 'success';
      case 'Entertainment Channel': return 'info';
      default: return 'default';
    }
  };

  // Utility functions for TV enhancement
  const formatViewership = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const getSentimentIntensity = (score) => {
    const absScore = Math.abs(score);
    if (absScore >= 0.7) return 'Very Strong';
    if (absScore >= 0.5) return 'Strong';
    if (absScore >= 0.3) return 'Moderate';
    if (absScore >= 0.1) return 'Weak';
    return 'Neutral';
  };

  const calculateDuration = (content) => {
    if (!content) return 0;
    // Estimate duration based on content length (rough estimate: 200 words per minute)
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  };

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSource(null);
  };

  const handleViewFeed = (source) => {
    // Navigate to sentiment data page with the channel name as search term only
    navigate('/sentiment-data', { 
      state: { 
        searchTerm: source.name,
        isTwitterSource: false // Explicitly indicate this is NOT a Twitter source
      } 
    });
    handleCloseDialog();
  };

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
    setProgramDialogOpen(true);
  };

  const handleCloseProgramDialog = () => {
    setProgramDialogOpen(false);
    setSelectedProgram(null);
  };

  // Feedback handlers
  const handleFeedbackClick = (event) => {
    setFeedbackMenuAnchor(event.currentTarget);
  };

  const handleFeedbackClose = () => {
    setFeedbackMenuAnchor(null);
  };

  const handleSentimentFeedback = async (newSentiment) => {
    if (!selectedProgram?.id) {
      setSnackbarMessage('No program selected for feedback');
      setSnackbarOpen(true);
      setFeedbackMenuAnchor(null);
      return;
    }

    setFeedbackLoading(true);
    setFeedbackMenuAnchor(null);

    try {
      await DataService.submitSentimentFeedback(
        selectedProgram.id,
        newSentiment,
        'television',
        accessToken
      );
      
      setSnackbarMessage(`Sentiment updated to ${newSentiment} successfully!`);
      setSnackbarOpen(true);
      
      // Update the local state to reflect the change
      setSelectedProgram(prev => ({
        ...prev,
        sentiment: newSentiment
      }));
      
      // Optionally refresh the Television data
      const data = await DataService.getTelevisionSources(accessToken);
      setTopTelevision(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSnackbarMessage('Failed to update sentiment. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setSnackbarMessage('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          📺 Top Television Channels Analysis
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Unable to load television sources. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (topTelevision.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          📺 Top Television Channels Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No television sources found in the current data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        📺 Top Television Channels Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topTelevision.map((channel, index) => (
          <Grid item xs={12} md={6} lg={4} key={channel.name}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { elevation: 4, transform: 'translateY(-2px)' },
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleSourceClick(channel)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          channel.verified ? (
                            <VerifiedIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                          ) : null
                        }
                      >
                        <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                          {channel.logo}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {channel.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {channel.coverage_count} programs • {channel.last_updated}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFeed(channel);
                        }}
                        title="Go to Feed"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton size="small">
                        <TvIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(channel.sentiment_score)}
                        label={`${(channel.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(channel.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(channel.sentiment_score * 100)}
                      color={getSentimentColor(channel.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={channel.bias_level}
                      color={channel.bias_level === 'Critical' ? 'error' : 
                             channel.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category & Coverage
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        icon={getCategoryIcon(channel.category)}
                        label={channel.category}
                        color={getCategoryColor(channel.category)}
                        size="small"
                      />
                      <Chip
                        label={`${channel.coverage_count} programs`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Topics
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {channel.top_topics && channel.top_topics.slice(0, 2).map((topic, idx) => (
                        <Chip
                          key={idx}
                          label={topic}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Enhanced Television Channel Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        {selectedSource && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    selectedSource.verified ? (
                      <VerifiedIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                    ) : null
                  }
                >
                  <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                    {selectedSource.logo}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="h6">{selectedSource.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSource.category} • {selectedSource.coverage_count} programs analyzed
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={4}>
                {/* Left Column - Channel Analytics */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ mb: 3, p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Sentiment Analysis
                      </Typography>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Overall Sentiment
                      </Typography>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Chip
                          icon={getSentimentIcon(selectedSource.sentiment_score)}
                          label={`${(selectedSource.sentiment_score * 100).toFixed(0)}%`}
                          color={getSentimentColor(selectedSource.sentiment_score)}
                          size="medium"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          {getSentimentIntensity(selectedSource.sentiment_score)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.abs(selectedSource.sentiment_score * 100)}
                        color={getSentimentColor(selectedSource.sentiment_score)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Bias Level
                      </Typography>
                      <Chip
                        label={selectedSource.bias_level}
                        color={selectedSource.bias_level === 'Critical' ? 'error' : 
                               selectedSource.bias_level === 'Supportive' ? 'success' : 'warning'}
                        size="medium"
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Category
                      </Typography>
                      <Chip
                        icon={getCategoryIcon(selectedSource.category)}
                        label={selectedSource.category}
                        color={getCategoryColor(selectedSource.category)}
                        size="medium"
                      />
                    </Box>
                  </Card>

                  <Card sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TvIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Channel Stats
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedSource.coverage_count} programs • {selectedSource.last_updated}
                    </Typography>
                    
                    {selectedSource.top_topics && selectedSource.top_topics.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Top Topics
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {selectedSource.top_topics.map((topic, idx) => (
                            <Chip key={idx} label={topic} size="small" variant="outlined" color="primary" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Card>
                </Grid>
                
                {/* Right Column - Recent Programs */}
                <Grid item xs={12} md={8}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LiveTvIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Recent Programs
                    </Typography>
                  </Box>
                  
                  <Box sx={{ maxHeight: '60vh', overflow: 'auto', pr: 1 }}>
                    {selectedSource.recent_programs && selectedSource.recent_programs.length > 0 ? (
                      selectedSource.recent_programs.map((program, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Card 
                            sx={{ 
                              mb: 2, 
                              p: 2, 
                              cursor: 'pointer',
                              '&:hover': { 
                                backgroundColor: 'action.hover',
                                transform: 'translateY(-2px)',
                                boxShadow: 2
                              },
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleProgramClick(program)}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" color="text.secondary">
                                  <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                  {program.time || 'Recently'}
                                </Typography>
                                <Chip
                                  label={program.sentiment || 'neutral'}
                                  color={program.sentiment === 'positive' ? 'success' : 
                                         program.sentiment === 'negative' ? 'error' : 'warning'}
                                  size="small"
                                />
                              </Box>
                              <Box textAlign="right">
                                {program.sentiment_score !== undefined && (
                                  <Typography 
                                    variant="caption" 
                                    color={getSentimentColor(program.sentiment_score)}
                                    sx={{ fontWeight: 600, display: 'block' }}
                                  >
                                    {(program.sentiment_score * 100).toFixed(0)}%
                                  </Typography>
                                )}
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontWeight: 400 }}
                                >
                                  {formatViewership(Math.floor(program.viewership * 1000000))} viewers
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                mb: 2,
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontWeight: 500
                              }}
                            >
                              {program.title}
                            </Typography>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box display="flex" gap={2}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatViewership(Math.floor(program.viewership * 1000000))}
                                  </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {calculateDuration(program.content)}m
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                                <PlayIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <Card sx={{ p: 3, textAlign: 'center' }}>
                        <TvIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Recent Programs
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          No programs available for this channel in the current dataset.
                        </Typography>
                      </Card>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                onClick={() => handleViewFeed(selectedSource)}
                variant="contained" 
                color="primary"
                startIcon={<VisibilityIcon />}
              >
                Go to Feed
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<OpenInNewIcon />}
                onClick={() => {
                  if (selectedSource.website_url) {
                    window.open(selectedSource.website_url, '_blank');
                  } else {
                    // Fallback to Google search if no website URL is available
                    window.open(`https://www.google.com/search?q=${selectedSource.name}`, '_blank');
                  }
                }}
              >
                Visit Website
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Individual Program Detail Dialog */}
      <Dialog 
        open={programDialogOpen} 
        onClose={handleCloseProgramDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedProgram && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <LiveTvIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Program Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSource?.name} • {selectedProgram.time || 'Recently'}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Chip
                    label={selectedProgram.sentiment || 'neutral'}
                    color={selectedProgram.sentiment === 'positive' ? 'success' : 
                           selectedProgram.sentiment === 'negative' ? 'error' : 'warning'}
                    size="large"
                    sx={{ mb: 1 }}
                  />
                  {selectedProgram.sentiment_score !== undefined && (
                    <Typography 
                      variant="h4" 
                      color={getSentimentColor(selectedProgram.sentiment_score)} 
                      sx={{ fontWeight: 700 }}
                    >
                      {(selectedProgram.sentiment_score * 100).toFixed(0)}%
                    </Typography>
                  )}
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ fontWeight: 400 }}
                  >
                    {formatViewership(Math.floor(selectedProgram.viewership * 1000000))} viewers
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                {/* Left Column - Program Content */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <LiveTvIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Program Content
                      </Typography>
                    </Box>
                    
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      {selectedProgram.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        lineHeight: 1.6,
                        fontSize: '1rem',
                        mb: 3,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {selectedProgram.content || selectedProgram.title}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-around" p={2} bgcolor="grey.50" borderRadius={2}>
                      <Box textAlign="center">
                        <PeopleIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {formatViewership(Math.floor(selectedProgram.viewership * 1000000))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Viewers
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <ScheduleIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {calculateDuration(selectedProgram.content)}m
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Duration
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <AnalyticsIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {selectedProgram.sentiment}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sentiment
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Right Column - Sentiment Analysis */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Sentiment Analysis
                      </Typography>
                    </Box>
                    
                    {selectedProgram.sentiment_score !== undefined && (
                      <Box mb={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Sentiment Score
                        </Typography>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Chip
                            icon={getSentimentIcon(selectedProgram.sentiment_score)}
                            label={`${(selectedProgram.sentiment_score * 100).toFixed(0)}%`}
                            color={getSentimentColor(selectedProgram.sentiment_score)}
                            size="medium"
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {getSentimentIntensity(selectedProgram.sentiment_score)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.abs(selectedProgram.sentiment_score * 100)}
                          color={getSentimentColor(selectedProgram.sentiment_score)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}

                    <Box mb={3}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Classification
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={selectedProgram.sentiment || 'neutral'}
                          color={selectedProgram.sentiment === 'positive' ? 'success' : 
                                 selectedProgram.sentiment === 'negative' ? 'error' : 'warning'}
                          size="medium"
                        />
                        <Tooltip title="Provide feedback on AI sentiment judgment">
                          <IconButton
                            size="small"
                            onClick={handleFeedbackClick}
                            disabled={feedbackLoading}
                            sx={{ 
                              bgcolor: 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box mb={3}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Viewership Level
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {formatViewership(Math.floor(selectedProgram.viewership * 1000000))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total viewers
                      </Typography>
                    </Box>

                    {selectedProgram.sentiment_justification && (
                      <Box mb={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          AI Justification
                        </Typography>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(25, 118, 210, 0.04)',
                            border: '1px solid rgba(25, 118, 210, 0.12)'
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedProgram.sentiment_justification}
                          </Typography>
                        </Card>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Aired
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedProgram.time || 'Recently'}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseProgramDialog}>Close</Button>
              {selectedProgram.url ? (
                <Button 
                  variant="contained" 
                  startIcon={<PlayIcon />}
                  onClick={() => window.open(selectedProgram.url, '_blank')}
                >
                  Watch Program
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  startIcon={<TvIcon />}
                  onClick={() => window.open(`https://www.google.com/search?q=${selectedProgram.title} ${selectedSource?.name}`, '_blank')}
                >
                  Search Online
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Feedback Menu */}
      <Menu
        anchorEl={feedbackMenuAnchor}
        open={Boolean(feedbackMenuAnchor)}
        onClose={handleFeedbackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => handleSentimentFeedback('positive')}
          disabled={feedbackLoading}
        >
          <ListItemIcon>
            <ThumbUpIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Mark as Positive</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => handleSentimentFeedback('neutral')}
          disabled={feedbackLoading}
        >
          <ListItemIcon>
            <ThumbsUpDownIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Mark as Neutral</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => handleSentimentFeedback('negative')}
          disabled={feedbackLoading}
        >
          <ListItemIcon>
            <ThumbDownIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Mark as Negative</ListItemText>
        </MenuItem>
      </Menu>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      />
    </Box>
  );
};

export default TopTelevision; 