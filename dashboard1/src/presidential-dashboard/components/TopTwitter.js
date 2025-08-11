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
  Alert
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
  Visibility as VisibilityIcon
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
  const [topTwitter, setTopTwitter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Sentiment Analysis
                  </Typography>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Overall Sentiment
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(selectedSource.sentiment_score)}
                        label={`${(selectedSource.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(selectedSource.sentiment_score)}
                      />
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
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category
                    </Typography>
                    <Chip
                      icon={getCategoryIcon(selectedSource.category)}
                      label={selectedSource.category}
                      color={getCategoryColor(selectedSource.category)}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedSource.tweets_count} tweets • {selectedSource.last_updated}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Hashtags
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedSource.top_hashtags && selectedSource.top_hashtags.map((hashtag, idx) => (
                        <Chip key={idx} label={hashtag} size="small" variant="outlined" />
                      ))}
                    </Box>
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
    </Box>
  );
};

export default TopTwitter; 