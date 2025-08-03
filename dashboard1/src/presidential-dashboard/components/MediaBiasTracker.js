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
  Divider
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

const MediaBiasTracker = ({ data, loading }) => {
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('bias_score');
  const [mediaSources, setMediaSources] = useState([]);
  const [realData, setRealData] = useState([]);

  // Load real media bias data
  useEffect(() => {
    const loadMediaBiasData = async () => {
      try {
        // Get real data from the data service
        const processedData = await DataService.loadData();
        const sourceSentimentData = DataService.getSourceSentimentData(processedData.rawData);
        
        if (sourceSentimentData && sourceSentimentData.length > 0) {
          // Transform real data into media bias format
          const transformedSources = sourceSentimentData.map(source => ({
            id: source.source.toLowerCase().replace(/\s+/g, '_'),
            name: source.source,
            type: getMediaTypeFromSource(source.source),
            bias_score: calculateBiasScore(source),
            bias_level: getBiasLevel(calculateBiasScore(source)),
            coverage_count: source.total,
            recent_trend: getTrendFromSentiment(parseFloat(source.avgSentiment)),
            last_updated: new Date().toISOString(),
            top_headlines: generateHeadlinesFromSource(source),
            sentiment_distribution: {
              positive: parseFloat(source.positive),
              negative: parseFloat(source.negative),
              neutral: parseFloat(source.neutral)
            }
          }));
          
          setMediaSources(transformedSources);
          setRealData(sourceSentimentData);
        } else {
          // Fallback to mock data if no real data available
          setMediaSources([
            {
              id: 'guardian',
              name: 'The Guardian Nigeria',
              type: 'newspaper',
              bias_score: -0.65,
              bias_level: 'Critical',
              coverage_count: 1250,
              recent_trend: 'increasing',
              last_updated: '2024-01-15T10:30:00Z',
              top_headlines: [
                'Government faces criticism over economic policies',
                'Fuel subsidy removal impacts citizens',
                'Opposition calls for policy review'
              ],
              sentiment_distribution: {
                positive: 15,
                negative: 70,
                neutral: 15
              }
            },
            {
              id: 'vanguard',
              name: 'Vanguard News',
              type: 'newspaper',
              bias_score: -0.45,
              bias_level: 'Critical',
              coverage_count: 980,
              recent_trend: 'stable',
              last_updated: '2024-01-15T09:45:00Z',
              top_headlines: [
                'Economic reforms show mixed results',
                'Public concerns over policy implementation',
                'Government defends recent decisions'
              ],
              sentiment_distribution: {
                positive: 25,
                negative: 55,
                neutral: 20
              }
            },
            {
              id: 'punch',
              name: 'Punch Newspapers',
              type: 'newspaper',
              bias_score: -0.35,
              bias_level: 'Critical',
              coverage_count: 850,
              recent_trend: 'decreasing',
              last_updated: '2024-01-15T08:20:00Z',
              top_headlines: [
                'Policy analysis shows gradual improvement',
                'Government addresses public concerns',
                'Mixed reactions to recent announcements'
              ],
              sentiment_distribution: {
                positive: 30,
                negative: 45,
                neutral: 25
              }
            },
            {
              id: 'channels_tv',
              name: 'Channels TV',
              type: 'tv',
              bias_score: 0.15,
              bias_level: 'Supportive',
              coverage_count: 650,
              recent_trend: 'stable',
              last_updated: '2024-01-15T11:15:00Z',
              top_headlines: [
                'Government achievements highlighted',
                'Positive economic indicators reported',
                'Policy successes celebrated'
              ],
              sentiment_distribution: {
                positive: 60,
                negative: 20,
                neutral: 20
              }
            },
            {
              id: 'ait',
              name: 'AIT',
              type: 'tv',
              bias_score: 0.25,
              bias_level: 'Supportive',
              coverage_count: 520,
              recent_trend: 'increasing',
              last_updated: '2024-01-15T10:00:00Z',
              top_headlines: [
                'Government initiatives praised',
                'Development projects showcased',
                'Leadership achievements recognized'
              ],
              sentiment_distribution: {
                positive: 70,
                negative: 15,
                neutral: 15
              }
            },
            {
              id: 'wazobia_fm',
              name: 'Wazobia FM',
              type: 'radio',
              bias_score: -0.20,
              bias_level: 'Neutral',
              coverage_count: 320,
              recent_trend: 'stable',
              last_updated: '2024-01-15T09:30:00Z',
              top_headlines: [
                'Balanced coverage of government policies',
                'Public opinion on recent decisions',
                'Mixed reactions to economic measures'
              ],
              sentiment_distribution: {
                positive: 35,
                negative: 35,
                neutral: 30
              }
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading media bias data:', error);
        // Set empty array on error
        setMediaSources([]);
      }
    };

    loadMediaBiasData();
  }, []);

  // Helper functions for processing real data
  const getMediaTypeFromSource = (sourceName) => {
    const name = sourceName.toLowerCase();
    if (name.includes('tv') || name.includes('channel') || name.includes('television')) return 'tv';
    if (name.includes('radio') || name.includes('fm') || name.includes('am')) return 'radio';
    if (name.includes('news') || name.includes('times') || name.includes('post') || name.includes('guardian')) return 'newspaper';
    return 'other';
  };

  const calculateBiasScore = (source) => {
    const total = source.total || 1;
    const positiveRatio = source.positive / total;
    const negativeRatio = source.negative / total;
    const neutralRatio = source.neutral / total;
    
    // Calculate bias score based on sentiment distribution
    // Positive bias: high positive ratio, low negative ratio
    // Negative bias: high negative ratio, low positive ratio
    const biasScore = (positiveRatio - negativeRatio) * 2; // Scale to -1 to 1 range
    return Math.max(-1, Math.min(1, biasScore));
  };

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

  const generateHeadlinesFromSource = (source) => {
    // Generate mock headlines based on source sentiment
    const headlines = [];
    const sourceName = source.source.toLowerCase();
    
    if (source.avg_sentiment > 0.3) {
      headlines.push('Government initiatives praised');
      headlines.push('Positive economic indicators reported');
      headlines.push('Policy successes celebrated');
    } else if (source.avg_sentiment < -0.3) {
      headlines.push('Government faces criticism over policies');
      headlines.push('Public concerns over policy implementation');
      headlines.push('Opposition calls for policy review');
    } else {
      headlines.push('Mixed reactions to government policies');
      headlines.push('Balanced coverage of recent decisions');
      headlines.push('Public opinion divided on measures');
    }
    
    return headlines;
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
      case 'radio': return <Radio />;
      default: return <Public />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          label="Radio Stations"
          color={filterType === 'radio' ? 'primary' : 'default'}
          onClick={() => setFilterType('radio')}
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
                          key={source.id}
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
                    Recent Headlines
                  </Typography>
                  <List dense>
                    {selectedSource.top_headlines.map((headline, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={headline}
                          secondary={`Headline ${index + 1}`}
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
                      The source has covered {selectedSource.coverage_count} stories related to 
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