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
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  OpenInNew as OpenInNewIcon
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
  
  // Use the imported hook or fallback
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;

  useEffect(() => {
    const fetchNewspapers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await DataService.getNewspaperSources(accessToken);
        
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

      {/* Article Detail Dialog */}
      <Dialog 
        open={articleDialogOpen} 
        onClose={handleCloseArticleDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedArticle && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    📰
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedArticle.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedArticle.source_name} • {selectedArticle.date}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={selectedArticle.sentiment}
                  color={selectedArticle.sentiment === 'positive' ? 'success' : 
                         selectedArticle.sentiment === 'negative' ? 'error' : 'warning'}
                  size="medium"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Sentiment Analysis
                  </Typography>
                  <Box mb={3}>
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
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(selectedArticle.sentiment_score * 100)}
                      color={getSentimentColor(selectedArticle.sentiment_score)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      AI Justification
                    </Typography>
                    <Card variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedArticle.sentiment_justification}
                      </Typography>
                    </Card>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Article Content
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedArticle.text}
                    </Typography>
                  </Card>

                  {selectedArticle.url && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Source URL
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => window.open(selectedArticle.url, '_blank')}
                        fullWidth
                      >
                        View Original Article
                      </Button>
                    </Box>
                  )}
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
    </Box>
  );
};

export default TopNewspapers; 