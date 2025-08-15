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
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Twitter as TwitterIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Reply as ReplyIcon,
  Repeat as RetweetIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  Psychology as PsychologyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ThumbsUpDown as ThumbsUpDownIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DataService from '../../services/DataService';

// Import useAuth hook or create a fallback
let useAuth;
try {
  const authModule = require('../../contexts/AuthContext');
  useAuth = authModule.useAuth;
} catch (error) {
  // Fallback if AuthContext is not available
  useAuth = () => ({ accessToken: null });
}

const TopTwitter = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [tweetDialogOpen, setTweetDialogOpen] = useState(false);
  const [topTwitter, setTopTwitter] = useState([]);
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
    const fetchTwitter = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await DataService.getTwitterSources(accessToken);
        
        // Log the actual data structure for debugging
        console.log('Twitter API Response:', data);
        if (data.length > 0) {
          console.log('First account structure:', data[0]);
          console.log('Recent tweets structure:', data[0].recent_tweets);
        }
        
        setTopTwitter(data);
      } catch (err) {
        console.error('Error fetching Twitter sources:', err);
        setError(err.message || 'Failed to load Twitter sources');
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch data, even without access token (for testing)
    fetchTwitter();
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
      case 'Government Official':
        return <BusinessIcon />;
      case 'Media Personality':
        return <PersonIcon />;
      case 'Business Leader':
        return <GroupIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Government Official':
        return 'primary';
      case 'Media Personality':
        return 'secondary';
      case 'Business Leader':
        return 'success';
      default:
        return 'default';
    }
  };

  // Utility functions for tweet enhancement
  const formatTweetMetric = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const tweetDate = new Date(dateString);
    const diffInHours = Math.floor((now - tweetDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return tweetDate.toLocaleDateString();
  };

  const getSentimentIntensity = (score) => {
    const absScore = Math.abs(score);
    if (absScore >= 0.7) return 'Very Strong';
    if (absScore >= 0.5) return 'Strong';
    if (absScore >= 0.3) return 'Moderate';
    if (absScore >= 0.1) return 'Weak';
    return 'Neutral';
  };



  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSource(null);
  };

  const handleViewTweets = (source) => {
    // Navigate to sentiment data page with the influencer's handle as search term
    navigate('/sentiment-data', { 
      state: { 
        searchTerm: source.handle || source.name 
      } 
    });
    handleCloseDialog();
  };

  const handleTweetClick = (tweet) => {
    setSelectedTweet(tweet);
    setTweetDialogOpen(true);
  };

  const handleCloseTweetDialog = () => {
    setTweetDialogOpen(false);
    setSelectedTweet(null);
  };

  // Feedback handlers
  const handleFeedbackClick = (event) => {
    setFeedbackMenuAnchor(event.currentTarget);
  };

  const handleFeedbackClose = () => {
    setFeedbackMenuAnchor(null);
  };

  const handleSentimentFeedback = async (newSentiment) => {
    if (!selectedTweet?.id) {
      setSnackbarMessage('No tweet selected for feedback');
      setSnackbarOpen(true);
      setFeedbackMenuAnchor(null);
      return;
    }

    setFeedbackLoading(true);
    setFeedbackMenuAnchor(null);

    try {
      await DataService.submitSentimentFeedback(
        selectedTweet.id,
        newSentiment,
        'twitter',
        accessToken
      );
      
      setSnackbarMessage(`Sentiment updated to ${newSentiment} successfully!`);
      setSnackbarOpen(true);
      
      // Update the local state to reflect the change
      setSelectedTweet(prev => ({
        ...prev,
        sentiment: newSentiment
      }));
      
      // Optionally refresh the Twitter data
      const data = await DataService.getTwitterSources(accessToken);
      setTopTwitter(Array.isArray(data) ? data : []);
      
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
          🐦 Top Twitter Influencers
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Unable to load Twitter sources. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (topTwitter.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          🐦 Top Twitter Influencers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No Twitter sources found in the current data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        🐦 Top Twitter Influencers
      </Typography>
      
      <Grid container spacing={3}>
        {topTwitter.map((account, index) => (
          <Grid item xs={12} md={6} lg={4} key={account.handle}>
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
                onClick={() => handleSourceClick(account)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {account.logo}
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {account.name}
                          </Typography>
                          {account.verified && <VerifiedIcon color="primary" fontSize="small" />}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {account.handle} • {account.followers} followers
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTweets(account);
                        }}
                        title="View Tweets"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (account.profile_url) {
                            window.open(account.profile_url, '_blank');
                          }
                        }}
                        title="Visit Profile"
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(account.sentiment_score)}
                        label={`${(account.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(account.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(account.sentiment_score * 100)}
                      color={getSentimentColor(account.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={account.bias_level}
                      color={account.bias_level === 'Critical' ? 'error' : 
                             account.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category
                    </Typography>
                    <Chip
                      icon={getCategoryIcon(account.category)}
                      label={account.category}
                      color={getCategoryColor(account.category)}
                      size="small"
                    />
                  </Box>


                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Enhanced Twitter Account Dialog */}
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
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {selectedSource.logo}
                </Avatar>
                <Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedSource.name}
                    </Typography>
                    {selectedSource.verified && <VerifiedIcon color="primary" />}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSource.handle} • {selectedSource.followers} followers
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={4}>
                {/* Left Column - Account Analytics */}
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
                      <TwitterIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Account Stats
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedSource.tweets_count} tweets • {selectedSource.last_updated}
                    </Typography>
                    
                    {selectedSource.top_hashtags && selectedSource.top_hashtags.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Top Hashtags
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {selectedSource.top_hashtags.map((hashtag, idx) => (
                            <Chip key={idx} label={hashtag} size="small" variant="outlined" color="primary" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Card>
                </Grid>
                
                {/* Right Column - Recent Tweets */}
                <Grid item xs={12} md={8}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TwitterIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Recent Tweets
                    </Typography>
                  </Box>
                  
                  <Box sx={{ maxHeight: '60vh', overflow: 'auto', pr: 1 }}>
                    {selectedSource.recent_tweets && selectedSource.recent_tweets.length > 0 ? (
                      selectedSource.recent_tweets.map((tweet, idx) => (
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
                            onClick={() => handleTweetClick(tweet)}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" color="text.secondary">
                                  <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                  {tweet.time || 'Recently'}
                                </Typography>
                                <Chip
                                  label={tweet.sentiment || 'neutral'}
                                  color={tweet.sentiment === 'positive' ? 'success' : 
                                         tweet.sentiment === 'negative' ? 'error' : 'warning'}
                                  size="small"
                                />
                              </Box>
                              <Box textAlign="right">
                                {tweet.sentiment_score !== undefined && (
                                  <Typography 
                                    variant="caption" 
                                    color={getSentimentColor(tweet.sentiment_score)}
                                    sx={{ fontWeight: 600, display: 'block' }}
                                  >
                                    {(tweet.sentiment_score * 100).toFixed(0)}%
                                  </Typography>
                                )}
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontWeight: 400 }}
                                >
                                  {formatTweetMetric(tweet.engagement || 0)} interactions
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
                                overflow: 'hidden'
                              }}
                            >
                              {tweet.text || tweet.content}
                            </Typography>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box display="flex" gap={2}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <ReplyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTweetMetric(Math.floor((tweet.engagement || 100) * 0.1))}
                                  </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <RetweetIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTweetMetric(Math.floor((tweet.engagement || 100) * 0.2))}
                                  </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <FavoriteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTweetMetric(Math.floor((tweet.engagement || 100) * 0.6))}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <Card sx={{ p: 3, textAlign: 'center' }}>
                        <TwitterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Recent Tweets
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          No tweets available for this account in the current dataset.
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
                onClick={() => handleViewTweets(selectedSource)}
                variant="contained" 
                color="primary"
                startIcon={<VisibilityIcon />}
              >
                View Tweets
              </Button>
              {selectedSource.profile_url && (
                <Button 
                  variant="outlined" 
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open(selectedSource.profile_url, '_blank')}
                >
                  Visit Profile
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Individual Tweet Detail Dialog */}
      <Dialog 
        open={tweetDialogOpen} 
        onClose={handleCloseTweetDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedTweet && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <TwitterIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Tweet Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSource?.name} • {selectedTweet.time || 'Recently'}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Chip
                    label={selectedTweet.sentiment || 'neutral'}
                    color={selectedTweet.sentiment === 'positive' ? 'success' : 
                           selectedTweet.sentiment === 'negative' ? 'error' : 'warning'}
                    size="large"
                    sx={{ mb: 1 }}
                  />
                  <Box textAlign="right">
                    {selectedTweet.sentiment_score !== undefined && (
                      <Typography 
                        variant="h4" 
                        color={getSentimentColor(selectedTweet.sentiment_score)} 
                        sx={{ fontWeight: 700 }}
                      >
                        {(selectedTweet.sentiment_score * 100).toFixed(0)}%
                      </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ fontWeight: 400 }}
                    >
                      {formatTweetMetric(selectedTweet.engagement || 0)} interactions
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                {/* Left Column - Tweet Content */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TwitterIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Tweet Content
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        lineHeight: 1.6,
                        fontSize: '1.1rem',
                        mb: 3,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {selectedTweet.text || selectedTweet.content}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-around" p={2} bgcolor="grey.50" borderRadius={2}>
                      <Box textAlign="center">
                        <ReplyIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {formatTweetMetric(Math.floor((selectedTweet.engagement || 100) * 0.1))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Replies
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <RetweetIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {formatTweetMetric(Math.floor((selectedTweet.engagement || 100) * 0.2))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Retweets
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <FavoriteIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {formatTweetMetric(Math.floor((selectedTweet.engagement || 100) * 0.6))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Likes
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
                    
                    {selectedTweet.sentiment_score !== undefined && (
                      <Box mb={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Sentiment Score
                        </Typography>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Chip
                            icon={getSentimentIcon(selectedTweet.sentiment_score)}
                            label={`${(selectedTweet.sentiment_score * 100).toFixed(0)}%`}
                            color={getSentimentColor(selectedTweet.sentiment_score)}
                            size="medium"
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {getSentimentIntensity(selectedTweet.sentiment_score)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.abs(selectedTweet.sentiment_score * 100)}
                          color={getSentimentColor(selectedTweet.sentiment_score)}
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
                          label={selectedTweet.sentiment || 'neutral'}
                          color={selectedTweet.sentiment === 'positive' ? 'success' : 
                                 selectedTweet.sentiment === 'negative' ? 'error' : 'warning'}
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
                        Engagement Level
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {formatTweetMetric(selectedTweet.engagement || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total interactions
                      </Typography>
                    </Box>

                    {selectedTweet.sentiment_justification && (
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
                            {selectedTweet.sentiment_justification}
                          </Typography>
                        </Card>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Posted
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedTweet.time || 'Recently'}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseTweetDialog}>Close</Button>
              {selectedTweet.url ? (
                <Button 
                  variant="contained" 
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open(selectedTweet.url, '_blank')}
                >
                  View Tweet
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  startIcon={<TwitterIcon />}
                  onClick={() => window.open(`https://twitter.com/${selectedSource?.handle?.replace('@', '') || 'search'}`, '_blank')}
                >
                  View Profile
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
          <ThumbUpIcon fontSize="small" color="success" sx={{ mr: 1 }} />
          Mark as Positive
        </MenuItem>
        <MenuItem 
          onClick={() => handleSentimentFeedback('neutral')}
          disabled={feedbackLoading}
        >
          <ThumbsUpDownIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
          Mark as Neutral
        </MenuItem>
        <MenuItem 
          onClick={() => handleSentimentFeedback('negative')}
          disabled={feedbackLoading}
        >
          <ThumbDownIcon fontSize="small" color="error" sx={{ mr: 1 }} />
          Mark as Negative
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

export default TopTwitter; 