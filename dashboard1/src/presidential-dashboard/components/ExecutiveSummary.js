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
  Paper,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  Notifications,
  Visibility,
  Speed,
  Psychology
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ExecutiveSummary = ({ data, loading, onRefresh }) => {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
            Nigeria Presidential Sentiment Dashboard
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

        {/* Top Concerns */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Top Policy Concerns
                </Typography>
                <Box>
                  {data?.top_concerns?.slice(0, 5).map((concern, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Typography variant="body2">
                        {concern.topic}
                      </Typography>
                      <Chip
                        label={`${concern.sentiment_score}%`}
                        color={concern.sentiment_score < 0 ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Media Bias Overview */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Media Bias Overview
                </Typography>
                <Box>
                  {data?.media_bias?.slice(0, 5).map((source, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Typography variant="body2">
                        {source.name}
                      </Typography>
                      <Chip
                        label={source.bias_level}
                        color={source.bias_level === 'Critical' ? 'error' : source.bias_level === 'Supportive' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" mb={2}>
          Quick Actions
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Chip
            icon={<Notifications />}
            label="View All Alerts"
            clickable
            color="primary"
          />
          <Chip
            icon={<TrendingUp />}
            label="Detailed Analytics"
            clickable
            color="secondary"
          />
          <Chip
            icon={<Psychology />}
            label="Policy Impact Report"
            clickable
            color="info"
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default ExecutiveSummary; 