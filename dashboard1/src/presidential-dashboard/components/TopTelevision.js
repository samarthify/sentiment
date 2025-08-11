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
  Tv as TvIcon,
  LiveTv as LiveTvIcon,
  Visibility as VisibilityIcon
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
  const [topTelevision, setTopTelevision] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSource(null);
  };

  const handleViewFeed = (source) => {
    // Navigate to sentiment data page with the channel name as search term
    navigate('/sentiment-data', { 
      state: { 
        searchTerm: source.name 
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

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Coverage Statistics
                    </Typography>
                    <Typography variant="body1">
                      {selectedSource.coverage_count} programs analyzed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {selectedSource.last_updated}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Topics
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedSource.top_topics && selectedSource.top_topics.map((topic, idx) => (
                        <Chip
                          key={idx}
                          label={topic}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Programs
                  </Typography>
                  <List dense>
                    {selectedSource.recent_programs && selectedSource.recent_programs.map((program, idx) => (
                      <ListItem 
                        key={idx} 
                        sx={{ 
                          px: 0,
                          cursor: program.youtube_url ? 'pointer' : 'default',
                          '&:hover': program.youtube_url ? {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: 1
                          } : {}
                        }}
                        onClick={() => {
                          if (program.youtube_url) {
                            window.open(program.youtube_url, '_blank');
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Chip
                            label={program.sentiment}
                            color={program.sentiment === 'positive' ? 'success' : 
                                   program.sentiment === 'negative' ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={program.title}
                          secondary={`${program.viewership}M viewers • ${program.time}`}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                          sx={{ 
                            '& .MuiListItemText-primary': {
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }
                          }}
                        />
                        {program.youtube_url && (
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(program.youtube_url, '_blank');
                            }}
                            title="Watch on YouTube"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        )}
                      </ListItem>
                    ))}
                  </List>
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
    </Box>
  );
};

export default TopTelevision; 