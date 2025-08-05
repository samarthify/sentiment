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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography 
            variant="h3" 
            fontWeight={800} 
            sx={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Leader's Sentiment Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
            Last updated: {currentTime.toLocaleString()}
          </Typography>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton 
            onClick={onRefresh} 
            sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              p: 1.5,
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            <Refresh color="primary" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alert Status */}
      <Alert 
        severity={getAlertColor(getAlertLevel())}
        icon={getAlertLevel() === 'critical' ? <Warning /> : <CheckCircle />}
        sx={{ 
          mb: 4,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          '& .MuiAlert-icon': {
            fontSize: '1.5rem'
          },
          '& .MuiAlert-message': {
            fontWeight: 500
          }
        }}
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
            <Card elevation={3} sx={{ 
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              }
            }}>
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                p: 3
              }}>
                <Box display="flex" alignItems="center" mb={2.5}>
                  <Box sx={{
                    p: 1,
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${getSentimentColor(getOverallSentiment()) === 'success' ? 'rgba(34, 197, 94, 0.1)' : getSentimentColor(getOverallSentiment()) === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'} 0%, ${getSentimentColor(getOverallSentiment()) === 'success' ? 'rgba(34, 197, 94, 0.05)' : getSentimentColor(getOverallSentiment()) === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)'} 100%)`,
                    border: `1px solid ${getSentimentColor(getOverallSentiment()) === 'success' ? 'rgba(34, 197, 94, 0.2)' : getSentimentColor(getOverallSentiment()) === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                    mr: 1.5
                  }}>
                    {getSentimentIcon(getOverallSentiment())}
                  </Box>
                  <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '0.95rem' }}>
                    Overall Sentiment
                  </Typography>
                </Box>
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  <Typography 
                    variant="h4" 
                    fontWeight={800} 
                    color={`${getSentimentColor(getOverallSentiment())}.main`}
                    sx={{
                      background: `linear-gradient(135deg, ${getSentimentColor(getOverallSentiment()) === 'success' ? '#22c55e' : getSentimentColor(getOverallSentiment()) === 'error' ? '#ef4444' : '#3b82f6'} 0%, ${getSentimentColor(getOverallSentiment()) === 'success' ? '#16a34a' : getSentimentColor(getOverallSentiment()) === 'error' ? '#dc2626' : '#2563eb'} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontSize: '1.75rem'
                    }}
                  >
                    {getOverallSentiment().toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
                    Based on {data?.total_mentions || 0} media mentions
                  </Typography>
                </Box>
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
            <Card elevation={3} sx={{ 
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              }
            }}>
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                p: 3
              }}>
                <Box display="flex" alignItems="center" mb={2.5}>
                  <Box sx={{
                    p: 1,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    mr: 1.5
                  }}>
                    <Visibility color="primary" />
                  </Box>
                  <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '0.95rem' }}>
                    Total Mentions
                  </Typography>
                </Box>
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  <Typography 
                    variant="h4" 
                    fontWeight={800}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                      lineHeight: 1.1,
                      textAlign: 'center',
                      fontSize: '1.75rem'
                    }}
                  >
                    {formatNumber(data?.total_mentions || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
                    Last 24 hours
                  </Typography>
                </Box>
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
            <Card elevation={3} sx={{ 
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              }
            }}>
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                p: 3
              }}>
                <Box display="flex" alignItems="center" mb={2.5}>
                  <Box sx={{
                    p: 1,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    mr: 1.5
                  }}>
                    <Psychology color="primary" />
                  </Box>
                  <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '0.95rem' }}>
                    Sentiment Split
                  </Typography>
                </Box>
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Box display="flex" gap={1.5} flexWrap="wrap" justifyContent="center" sx={{ mb: 2 }}>
                    {data?.sentiment_distribution && Object.entries(data.sentiment_distribution).map(([key, value]) => (
                                              <Chip
                          key={key}
                          label={`${key}: ${value}%`}
                          color={getSentimentColor(key)}
                          size="small"
                          variant="filled"
                          onClick={() => handleSentimentClick(key)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            },
                            transition: 'all 0.3s ease-in-out',
                            minWidth: '70px'
                          }}
                        />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, textAlign: 'center', fontSize: '0.8rem' }}>
                    Click to filter by sentiment
                  </Typography>
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
            <Card elevation={3} sx={{ 
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              }
            }}>
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                p: 3
              }}>
                <Box display="flex" alignItems="center" mb={2.5}>
                  <Box sx={{
                    p: 1,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    mr: 1.5
                  }}>
                    <Speed color="primary" />
                  </Box>
                  <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '0.95rem' }}>
                    Response Time
                  </Typography>
                </Box>
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  <Typography 
                    variant="h4" 
                    fontWeight={800}
                    sx={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                      lineHeight: 1.1,
                      textAlign: 'center',
                      fontSize: '1.75rem'
                    }}
                  >
                    {data?.avg_response_time || '2.3'}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
                    Average processing
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

      </Grid>
    </Box>
  );
};

export default ExecutiveSummary; 