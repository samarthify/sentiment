import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
  Visibility,
  Speed,
  Psychology,
  Newspaper,
  Tv,
  Radio,
  Public,
  ExpandMore,
  ExpandLess,
  FilterList,
  Sort
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ResponsiveContainer, HeatMap, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

// Import data service
import DataService from '../../services/DataService';

const MediaBiasTracker = () => {
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('bias_score');
  const [mediaSources, setMediaSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load real media bias data
  useEffect(() => {
    const loadMediaBiasData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all three media sources endpoints without authentication
        const [newspapers, television, twitter] = await Promise.all([
          DataService.getNewspaperSources(null),
          DataService.getTelevisionSources(null),
          DataService.getTwitterSources(null)
        ]);

        // Transform all sources into a unified format
        const allSources = [
          ...newspapers.map(source => ({
            ...source,
            type: 'newspaper',
            bias_score: source.sentiment_score,
            bias_level: getBiasLevel(source.sentiment_score),
            coverage_count: source.coverage_count,
            recent_trend: getTrendFromSentiment(source.sentiment_score),
            last_updated: source.last_updated,
            top_headlines: source.top_headlines || [],
            sentiment_distribution: {
              positive: source.sentiment_score > 0.2 ? 60 : source.sentiment_score < -0.2 ? 20 : 40,
              negative: source.sentiment_score < -0.2 ? 60 : source.sentiment_score > 0.2 ? 20 : 40,
              neutral: source.sentiment_score >= -0.2 && source.sentiment_score <= 0.2 ? 60 : 20
            }
          })),
          ...television.map(source => ({
            ...source,
            type: 'tv',
            bias_score: source.sentiment_score,
            bias_level: getBiasLevel(source.sentiment_score),
            coverage_count: source.coverage_count,
            recent_trend: getTrendFromSentiment(source.sentiment_score),
            last_updated: source.last_updated,
            top_headlines: source.recent_programs?.map(program => program.title) || [],
            sentiment_distribution: {
              positive: source.sentiment_score > 0.2 ? 60 : source.sentiment_score < -0.2 ? 20 : 40,
              negative: source.sentiment_score < -0.2 ? 60 : source.sentiment_score > 0.2 ? 20 : 40,
              neutral: source.sentiment_score >= -0.2 && source.sentiment_score <= 0.2 ? 60 : 20
            }
          })),
          ...twitter.map(source => ({
            ...source,
            type: 'social',
            bias_score: source.sentiment_score,
            bias_level: getBiasLevel(source.sentiment_score),
            coverage_count: source.tweets_count,
            recent_trend: getTrendFromSentiment(source.sentiment_score),
            last_updated: source.last_updated,
            top_headlines: source.recent_tweets?.map(tweet => tweet.text) || [],
            sentiment_distribution: {
              positive: source.sentiment_score > 0.2 ? 60 : source.sentiment_score < -0.2 ? 20 : 40,
              negative: source.sentiment_score < -0.2 ? 60 : source.sentiment_score > 0.2 ? 20 : 40,
              neutral: source.sentiment_score >= -0.2 && source.sentiment_score <= 0.2 ? 60 : 20
            }
          }))
        ];

        setMediaSources(allSources);

      } catch (error) {
        console.error('Error loading media bias data:', error);
        setError('Failed to load media bias data. Please try again later.');
        setMediaSources([]);
      } finally {
        setLoading(false);
      }
    };

    loadMediaBiasData();
  }, []);

  // Helper functions
  const getBiasLevel = (biasScore) => {
    if (biasScore >= 0.3) return 'Supportive';
    if (biasScore <= -0.3) return 'Critical';
    return 'Neutral';
  };

  const getTrendFromSentiment = (avgSentiment) => {
    if (avgSentiment > 0.2) return 'increasing';
    if (avgSentiment < -0.2) return 'decreasing';
    return 'stable';
  };

  const getBiasColor = (bias_score) => {
    if (bias_score >= 0.5) return 'success';
    if (bias_score >= 0.1) return 'info';
    if (bias_score >= -0.1) return 'default';
    if (bias_score >= -0.5) return 'warning';
    return 'error';
  };

  const getBiasIcon = (bias_level) => {
    switch (bias_level) {
      case 'Supportive': return <CheckCircle color="success" />;
      case 'Critical': return <Warning color="error" />;
      case 'Neutral': return <Info color="info" />;
      default: return <Info color="info" />;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="success" />;
      case 'decreasing': return <TrendingDown color="error" />;
      case 'stable': return <Info color="info" />;
      default: return <Info color="info" />;
    }
  };

  const getMediaTypeIcon = (type) => {
    switch (type) {
      case 'newspaper': return <Newspaper />;
      case 'tv': return <Tv />;
      case 'social': return <Public />;
      default: return <Public />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const filteredSources = mediaSources.filter(source => {
    if (filterType === 'all') return true;
    return source.type === filterType;
  });

  const sortedSources = [...filteredSources].sort((a, b) => {
    switch (sortBy) {
      case 'bias_score':
        return Math.abs(b.bias_score) - Math.abs(a.bias_score);
      case 'coverage_count':
        return b.coverage_count - a.coverage_count;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setShowDetails(true);
  };

  const getBiasHeatmapData = () => {
    return sortedSources.map(source => ({
      name: source.name,
      bias_score: source.bias_score,
      coverage_count: source.coverage_count,
      type: source.type
    }));
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
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Media Bias Tracker
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (mediaSources.length === 0) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Media Bias Tracker
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No media sources found in the current data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Media Bias Tracker
      </Typography>

      {/* Filter and Sort Controls */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Chip
          label="All Sources"
          color={filterType === 'all' ? 'primary' : 'default'}
          onClick={() => setFilterType('all')}
          clickable
        />
        <Chip
          label="Newspapers"
          color={filterType === 'newspaper' ? 'primary' : 'default'}
          onClick={() => setFilterType('newspaper')}
          clickable
        />
        <Chip
          label="TV Channels"
          color={filterType === 'tv' ? 'primary' : 'default'}
          onClick={() => setFilterType('tv')}
          clickable
        />
        <Chip
          label="Social Media"
          color={filterType === 'social' ? 'primary' : 'default'}
          onClick={() => setFilterType('social')}
          clickable
        />
      </Box>

      <Grid container spacing={3}>
        {/* Bias Overview Card */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Overall Bias Distribution
                </Typography>
                <Box>
                  {['Critical', 'Neutral', 'Supportive'].map((level) => {
                    const count = sortedSources.filter(s => s.bias_level === level).length;
                    const percentage = (count / sortedSources.length) * 100;
                    return (
                      <Box key={level} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">
                            {level} ({count})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={level === 'Critical' ? 'error' : level === 'Supportive' ? 'success' : 'info'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Bias Heatmap */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Bias Score Heatmap
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {getBiasHeatmapData().map((source, index) => (
                    <Tooltip
                      key={source.name}
                      title={`${source.name}: ${source.bias_score.toFixed(2)}`}
                    >
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          backgroundColor: source.bias_score >= 0 
                            ? `rgba(76, 175, 80, ${Math.abs(source.bias_score)})`
                            : `rgba(244, 67, 54, ${Math.abs(source.bias_score)})`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: '1px solid #ddd',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            transition: 'transform 0.2s'
                          }
                        }}
                        onClick={() => handleSourceClick(sortedSources[index])}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                          }}
                        >
                          {source.name.split(' ')[0]}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Media Sources Table */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Detailed Media Analysis
                </Typography>
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Media Source</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Bias Score</TableCell>
                        <TableCell>Bias Level</TableCell>
                        <TableCell>Coverage Count</TableCell>
                        <TableCell>Recent Trend</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedSources.map((source) => (
                        <TableRow
                          key={source.name}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleSourceClick(source)}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getMediaTypeIcon(source.type)}
                              <Typography variant="body2" ml={1}>
                                {source.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={source.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={`${getBiasColor(source.bias_score)}.main`}
                              fontWeight="bold"
                            >
                              {source.bias_score.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getBiasIcon(source.bias_level)}
                              <Typography variant="body2" ml={1}>
                                {source.bias_level}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {source.coverage_count.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getTrendIcon(source.recent_trend)}
                              <Typography variant="body2" ml={1}>
                                {source.recent_trend}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(source.last_updated)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Media Source Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedSource && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                {getMediaTypeIcon(selectedSource.type)}
                <Typography variant="h6" ml={1}>
                  {selectedSource.name} - Bias Analysis
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Sentiment Distribution
                  </Typography>
                  <Box>
                    {Object.entries(selectedSource.sentiment_distribution).map(([key, value]) => (
                      <Box key={key} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" textTransform="capitalize">
                            {key}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {value}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={value}
                          color={key === 'positive' ? 'success' : key === 'negative' ? 'error' : 'info'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Recent Content
                  </Typography>
                  <List dense>
                    {selectedSource.top_headlines && selectedSource.top_headlines.slice(0, 3).map((headline, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={headline}
                          secondary={`Item ${index + 1}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" mb={2}>
                    Bias Analysis Summary
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSource.name} shows a {selectedSource.bias_level.toLowerCase()} bias 
                      with a score of {selectedSource.bias_score.toFixed(2)}. 
                      The source has covered {selectedSource.coverage_count} items related to 
                      government policies and decisions in the last 24 hours.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetails(false)}>Close</Button>
              <Button variant="contained" color="primary">
                Generate Report
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MediaBiasTracker; 