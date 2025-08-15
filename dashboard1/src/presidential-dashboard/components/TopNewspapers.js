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
  Schedule as ScheduleIcon,
  Summarize as SummarizeIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ThumbsUpDown as ThumbsUpDownIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
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

const TopNewspapers = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [topNewspapers, setTopNewspapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Feedback UI state
  const [feedbackMenuAnchor, setFeedbackMenuAnchor] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Use the imported hook or fallback
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;
  const user = authContext?.user || null;

  useEffect(() => {
    const fetchNewspapers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await DataService.getNewspaperSources(accessToken, user?.id);
        
        // Filter out businessdayonline newspaper
        const filteredData = data.filter(newspaper => 
          !newspaper.name.toLowerCase().includes('businessdayonline') &&
          !newspaper.name.toLowerCase().includes('business day online')
        );
        
        setTopNewspapers(filteredData);
      } catch (err) {
        console.error('Error fetching newspaper sources:', err);
        setError(err.message || 'Failed to load newspaper sources');
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch data, even without access token (for testing)
    fetchNewspapers();
  }, [accessToken, user?.id]);

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

  // Utility functions for enhanced article analysis
  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = text ? text.trim().split(/\s+/).length : 0;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const getWordCount = (text) => {
    return text ? text.trim().split(/\s+/).length : 0;
  };

  const extractKeywords = (text) => {
    if (!text) return [];
    // Simple keyword extraction - remove common words and get most frequent
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
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

  const handleArticleClick = (article) => {
    console.log('Article clicked:', article);
    setSelectedArticle(article);
    setArticleDialogOpen(true);
  };

  const handleCloseArticleDialog = () => {
    setArticleDialogOpen(false);
    setSelectedArticle(null);
  };

  // Feedback handlers
  const handleFeedbackClick = (event) => {
    setFeedbackMenuAnchor(event.currentTarget);
  };

  const handleFeedbackClose = () => {
    setFeedbackMenuAnchor(null);
  };

  const handleSentimentFeedback = async (newSentiment) => {
    if (!selectedArticle?.id) {
      console.error('No article ID available for feedback');
      return;
    }

    setFeedbackLoading(true);
    try {
      await DataService.submitSentimentFeedback(
        selectedArticle.id,
        newSentiment,
        'article',
        accessToken
      );
      
      // Update the local state to reflect the change
      setSelectedArticle(prev => ({
        ...prev,
        sentiment: newSentiment
      }));
      
      // Update the newspaper data as well
      setTopNewspapers(prev => prev.map(newspaper => ({
        ...newspaper,
        recent_articles: newspaper.recent_articles?.map(article => 
          article.id === selectedArticle.id 
            ? { ...article, sentiment: newSentiment }
            : article
        )
      })));

      setSnackbarMessage(`Sentiment updated to ${newSentiment} successfully!`);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSnackbarMessage('Failed to update sentiment. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setFeedbackLoading(false);
      handleFeedbackClose();
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
          📰 Top Newspapers Analysis
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Unable to load newspaper sources. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (topNewspapers.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          📰 Top Newspapers Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No newspaper sources found in the current data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        📰 Top Newspapers Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topNewspapers.map((newspaper, index) => (
          <Grid item xs={12} md={6} lg={4} key={newspaper.name}>
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
                onClick={() => handleSourceClick(newspaper)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {newspaper.logo}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {newspaper.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {newspaper.coverage_count} articles • {newspaper.last_updated}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small">
                      <OpenInNewIcon />
                    </IconButton>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(newspaper.sentiment_score)}
                        label={`${(newspaper.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(newspaper.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(newspaper.sentiment_score * 100)}
                      color={getSentimentColor(newspaper.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={newspaper.bias_level}
                      color={newspaper.bias_level === 'Critical' ? 'error' : 
                             newspaper.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Headlines
                    </Typography>
                    {newspaper.top_headlines && newspaper.top_headlines.slice(0, 2).map((headline, idx) => (
                      <Typography 
                        key={idx} 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          mb: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        • {headline}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedSource && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  {selectedSource.logo}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedSource.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detailed Analysis
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Sentiment Overview
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Overall Sentiment Score
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Chip
                        icon={getSentimentIcon(selectedSource.sentiment_score)}
                        label={`${(selectedSource.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(selectedSource.sentiment_score)}
                        size="medium"
                      />
                    </Box>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Bias Classification
                    </Typography>
                    <Chip
                      label={selectedSource.bias_level}
                      color={selectedSource.bias_level === 'Critical' ? 'error' : 
                             selectedSource.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="medium"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Coverage Statistics
                    </Typography>
                    <Typography variant="body1">
                      {selectedSource.coverage_count} articles analyzed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {selectedSource.last_updated}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Articles
                  </Typography>
                  <List dense>
                    {selectedSource.recent_articles && selectedSource.recent_articles.map((article, idx) => (
                      <ListItem 
                        key={idx} 
                        sx={{ 
                          px: 0, 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderRadius: 1,
                          mb: 1
                        }}
                        onClick={() => handleArticleClick(article)}
                      >
                        <ListItemIcon>
                          <Chip
                            label={article.sentiment}
                            color={article.sentiment === 'positive' ? 'success' : 
                                   article.sentiment === 'negative' ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={article.title}
                          secondary={article.date}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                        />
                        <IconButton size="small">
                          <OpenInNewIcon />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                variant="contained" 
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

      {/* Enhanced Article Detail Dialog */}
      <Dialog 
        open={articleDialogOpen} 
        onClose={handleCloseArticleDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        {selectedArticle && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <ArticleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {selectedArticle.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedArticle.source_name} • {selectedArticle.date}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <Chip
                        icon={<ScheduleIcon />}
                        label={`${calculateReadingTime(selectedArticle.text)} min read`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<AnalyticsIcon />}
                        label={`${getWordCount(selectedArticle.text)} words`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={getSentimentIntensity(selectedArticle.sentiment_score)}
                        color={getSentimentColor(selectedArticle.sentiment_score)}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Chip
                    label={selectedArticle.sentiment}
                    color={selectedArticle.sentiment === 'positive' ? 'success' : 
                           selectedArticle.sentiment === 'negative' ? 'error' : 'warning'}
                    size="large"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h4" color={getSentimentColor(selectedArticle.sentiment_score)} sx={{ fontWeight: 700 }}>
                    {(selectedArticle.sentiment_score * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={4}>
                {/* Left Column - Analysis & Insights */}
                <Grid item xs={12} md={4}>
                  {/* Sentiment Analysis Section */}
                  <Card sx={{ mb: 3, p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Sentiment Analysis
                      </Typography>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Sentiment Score
                      </Typography>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Chip
                          icon={getSentimentIcon(selectedArticle.sentiment_score)}
                          label={`${(selectedArticle.sentiment_score * 100).toFixed(0)}%`}
                          color={getSentimentColor(selectedArticle.sentiment_score)}
                          size="medium"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          {getSentimentIntensity(selectedArticle.sentiment_score)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.abs(selectedArticle.sentiment_score * 100)}
                        color={getSentimentColor(selectedArticle.sentiment_score)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Classification
                        </Typography>
                        <Tooltip title="Provide feedback on AI sentiment analysis">
                          <IconButton 
                            size="small" 
                            onClick={handleFeedbackClick}
                            disabled={feedbackLoading}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Chip
                        label={selectedArticle.sentiment}
                        color={selectedArticle.sentiment === 'positive' ? 'success' : 
                               selectedArticle.sentiment === 'negative' ? 'error' : 'warning'}
                        size="medium"
                      />
                    </Box>
                  </Card>

                  {/* Keywords Section */}
                  <Card sx={{ mb: 3, p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SummarizeIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Key Topics
                      </Typography>
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {extractKeywords(selectedArticle.text).map((keyword, idx) => (
                        <Chip
                          key={idx}
                          label={keyword}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </Card>

                  {/* Source Link */}
                  {selectedArticle.url && (
                    <Card sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Original Source
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => window.open(selectedArticle.url, '_blank')}
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        View Original Article
                      </Button>
                    </Card>
                  )}
                </Grid>

                {/* Middle Column - AI Justification */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: 'fit-content', p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <AnalyticsIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        AI Analysis & Justification
                      </Typography>
                    </Box>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 3, 
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        border: '1px solid rgba(25, 118, 210, 0.12)',
                        maxHeight: '60vh',
                        overflow: 'auto'
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          fontSize: '0.95rem'
                        }}
                      >
                        {selectedArticle.sentiment_justification || 'No AI justification available for this article.'}
                      </Typography>
                    </Card>
                  </Card>
                </Grid>

                {/* Right Column - Article Content */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: 'fit-content', p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <ArticleIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Article Content
                      </Typography>
                    </Box>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 3, 
                        maxHeight: '60vh', 
                        overflow: 'auto',
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.7,
                          fontSize: '0.95rem',
                          textAlign: 'justify'
                        }}
                      >
                        {selectedArticle.text || 'No content available for this article.'}
                      </Typography>
                    </Card>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseArticleDialog}>Close</Button>
              {selectedArticle.url && (
                <Button 
                  variant="contained" 
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open(selectedArticle.url, '_blank')}
                >
                  Open Article
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Sentiment Feedback Menu */}
      <Menu
        anchorEl={feedbackMenuAnchor}
        open={Boolean(feedbackMenuAnchor)}
        onClose={handleFeedbackClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleSentimentFeedback('positive')} disabled={feedbackLoading}>
          <ThumbUpIcon sx={{ mr: 1, color: 'success.main' }} />
          Mark as Positive
        </MenuItem>
        <MenuItem onClick={() => handleSentimentFeedback('neutral')} disabled={feedbackLoading}>
          <ThumbsUpDownIcon sx={{ mr: 1, color: 'warning.main' }} />
          Mark as Neutral
        </MenuItem>
        <MenuItem onClick={() => handleSentimentFeedback('negative')} disabled={feedbackLoading}>
          <ThumbDownIcon sx={{ mr: 1, color: 'error.main' }} />
          Mark as Negative
        </MenuItem>
      </Menu>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default TopNewspapers; 