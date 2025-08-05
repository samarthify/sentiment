import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,

} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  Visibility,
  Speed,
  Psychology
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const ExecutiveSummary = ({ data, loading, onRefresh }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSentimentClick = (sentiment) => {
    navigate('/sentiment-data', {
      state: {
        sentimentFilter: sentiment
      }
    });
  };

  const getOverallSentiment = () => {
    console.log('ExecutiveSummary received data:', data);
    
    if (!data || !data.sentiment_distribution) {
      console.log('No data or sentiment_distribution found, returning neutral');
      return 'neutral';
    }
    
    const { positive, negative, neutral } = data.sentiment_distribution;
    console.log('Sentiment distribution values:', { positive, negative, neutral });
    
    // Calculate total for percentage comparison
    const total = positive + negative + neutral;
    if (total === 0) return 'neutral';
    
    const positivePercent = (positive / total) * 100;
    const negativePercent = (negative / total) * 100;
    const neutralPercent = (neutral / total) * 100;
    
    // Use the same thresholding logic as PlatformSentiment.js
    // More realistic thresholds for presidential context
    const threshold = 5; // Minimum 5% difference to be considered positive/negative
    const minPositiveThreshold = 30; // Minimum 30% positive to be considered positive
    const minNegativeThreshold = 30; // Minimum 30% negative to be considered negative
    
    // Debug logging to understand the sentiment distribution
    console.log('Sentiment Distribution:', {
      positive: positivePercent.toFixed(1) + '%',
      negative: negativePercent.toFixed(1) + '%',
      neutral: neutralPercent.toFixed(1) + '%',
      total: total
    });
    
    // Check if positive sentiment is significantly higher
    if (positivePercent >= minPositiveThreshold && (positivePercent - negativePercent) >= threshold) {
      console.log('Classified as POSITIVE:', {
        positivePercent: positivePercent.toFixed(1) + '%',
        negativePercent: negativePercent.toFixed(1) + '%',
        difference: (positivePercent - negativePercent).toFixed(1) + '%'
      });
      return 'positive';
    }
    
    // Check if negative sentiment is significantly higher
    if (negativePercent >= minNegativeThreshold && (negativePercent - positivePercent) >= threshold) {
      console.log('Classified as NEGATIVE:', {
        negativePercent: negativePercent.toFixed(1) + '%',
        positivePercent: positivePercent.toFixed(1) + '%',
        difference: (negativePercent - positivePercent).toFixed(1) + '%'
      });
      return 'negative';
    }
    
    // If no clear majority or difference is too small, return neutral
    console.log('Classified as NEUTRAL:', {
      positivePercent: positivePercent.toFixed(1) + '%',
      negativePercent: negativePercent.toFixed(1) + '%',
      neutralPercent: neutralPercent.toFixed(1) + '%',
      reason: 'No clear majority or difference too small'
    });
    return 'neutral';
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      case 'critical': return 'error';
      case 'supportive': return 'success';
      default: return 'default';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp color="success" />;
      case 'negative': return <TrendingDown color="error" />;
      case 'critical': return <Warning color="error" />;
      case 'supportive': return <CheckCircle color="success" />;
      default: return <Info color="info" />;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getAlertLevel = () => {
    if (!data || !data.alerts) return 'normal';
    const criticalAlerts = data.alerts.filter(alert => alert.severity === 'critical').length;
    if (criticalAlerts > 0) return 'critical';
    if (data.alerts.length > 5) return 'warning';
    return 'normal';
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Leader's Sentiment Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {currentTime.toLocaleString()}
          </Typography>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton onClick={onRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alert Status */}
      <Alert 
        severity={getAlertColor(getAlertLevel())}
        icon={getAlertLevel() === 'critical' ? <Warning /> : <CheckCircle />}
        sx={{ mb: 3 }}
      >
        {getAlertLevel() === 'critical' 
          ? 'Critical alerts detected - Immediate attention required'
          : getAlertLevel() === 'warning'
          ? 'Several alerts detected - Review recommended'
          : 'All systems normal - No critical alerts'
        }
      </Alert>

      <Grid container spacing={3}>
        {/* Overall Sentiment Card */}
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  {getSentimentIcon(getOverallSentiment())}
                  <Typography variant="h6" ml={1}>
                    Overall Sentiment
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color={`${getSentimentColor(getOverallSentiment())}.main`}>
                  {getOverallSentiment().toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Based on {data?.total_mentions || 0} media mentions
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Visibility color="primary" />
                  <Typography variant="h6" ml={1}>
                    Total Mentions
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {formatNumber(data?.total_mentions || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Last 24 hours
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Sentiment Distribution */}
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Psychology color="primary" />
                  <Typography variant="h6" ml={1}>
                    Sentiment Split
                  </Typography>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {data?.sentiment_distribution && Object.entries(data.sentiment_distribution).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}%`}
                      color={getSentimentColor(key)}
                      size="small"
                      variant="outlined"
                      onClick={() => handleSentimentClick(key)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Response Time */}
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Speed color="primary" />
                  <Typography variant="h6" ml={1}>
                    Response Time
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {data?.avg_response_time || '2.3'}s
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Average processing
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

      </Grid>
    </Box>
  );
};

export default ExecutiveSummary; 