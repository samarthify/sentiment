import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  CompareArrows,
  CalendarToday,
  Assessment,
  Policy,
  Warning,
  CheckCircle,
  Info,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';

const PolicyImpactTracker = ({ data, loading }) => {
  const { t } = useTranslation();
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const policies = [
    {
      id: 'fuel_subsidy',
      name: 'Fuel Subsidy Removal',
      announcement_date: '2023-05-29',
      status: 'active',
      current_sentiment: -0.65,
      pre_announcement: 0.2,
      post_announcement: -0.8,
      peak_negative: -0.85,
      recovery_rate: 0.15,
      media_coverage: 1250,
      public_reaction: 'high_negative'
    },
    {
      id: 'exchange_rate',
      name: 'Exchange Rate Policy',
      announcement_date: '2023-06-14',
      status: 'active',
      current_sentiment: -0.45,
      pre_announcement: 0.1,
      post_announcement: -0.7,
      peak_negative: -0.75,
      recovery_rate: 0.3,
      media_coverage: 890,
      public_reaction: 'moderate_negative'
    },
    {
      id: 'security_measures',
      name: 'Security Measures',
      announcement_date: '2023-07-01',
      status: 'active',
      current_sentiment: 0.35,
      pre_announcement: 0.3,
      post_announcement: 0.4,
      peak_positive: 0.45,
      recovery_rate: 0.1,
      media_coverage: 650,
      public_reaction: 'positive'
    },
    {
      id: 'economic_reforms',
      name: 'Economic Reforms',
      announcement_date: '2023-08-15',
      status: 'recent',
      current_sentiment: -0.25,
      pre_announcement: 0.0,
      post_announcement: -0.4,
      peak_negative: -0.5,
      recovery_rate: 0.25,
      media_coverage: 450,
      public_reaction: 'mixed'
    }
  ];

  const getSentimentColor = (sentiment) => {
    if (sentiment >= 0.5) return 'success';
    if (sentiment >= 0.1) return 'info';
    if (sentiment >= -0.1) return 'default';
    if (sentiment >= -0.5) return 'warning';
    return 'error';
  };

  const getSentimentLabel = (sentiment) => {
    if (sentiment >= 0.5) return 'Very Positive';
    if (sentiment >= 0.1) return 'Positive';
    if (sentiment >= -0.1) return 'Neutral';
    if (sentiment >= -0.5) return 'Negative';
    return 'Very Negative';
  };

  const getReactionIcon = (reaction) => {
    switch (reaction) {
      case 'positive': return <CheckCircle color="success" />;
      case 'high_negative': return <Warning color="error" />;
      case 'moderate_negative': return <Warning color="warning" />;
      case 'mixed': return <Info color="info" />;
      default: return <Info color="info" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateRecoveryProgress = (policy) => {
    const totalChange = Math.abs(policy.post_announcement - policy.pre_announcement);
    const recovered = Math.abs(policy.current_sentiment - policy.post_announcement);
    return Math.min((recovered / totalChange) * 100, 100);
  };

  const generateTimelineData = (policy) => {
    const announcementDate = new Date(policy.announcement_date);
    const data = [];
    
    // Pre-announcement data
    for (let i = 7; i >= 1; i--) {
      const date = new Date(announcementDate);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        sentiment: policy.pre_announcement + (Math.random() - 0.5) * 0.2,
        phase: 'pre'
      });
    }
    
    // Announcement day
    data.push({
      date: policy.announcement_date,
      sentiment: policy.post_announcement,
      phase: 'announcement'
    });
    
    // Post-announcement data
    for (let i = 1; i <= 14; i++) {
      const date = new Date(announcementDate);
      date.setDate(date.getDate() + i);
      const progress = i / 14;
      const currentSentiment = policy.post_announcement + (policy.current_sentiment - policy.post_announcement) * progress;
      data.push({
        date: date.toISOString().split('T')[0],
        sentiment: currentSentiment + (Math.random() - 0.5) * 0.1,
        phase: 'post'
      });
    }
    
    return data;
  };

  const handlePolicyClick = (policy) => {
    setSelectedPolicy(policy);
    setShowDetails(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Policy Impact Tracker
      </Typography>
      
      <Grid container spacing={3}>
        {policies.map((policy, index) => (
          <Grid item xs={12} md={6} key={policy.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                elevation={3} 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { elevation: 6 }
                }}
                onClick={() => handlePolicyClick(policy)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {policy.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Announced: {formatDate(policy.announcement_date)}
                      </Typography>
                    </Box>
                    <Chip
                      label={policy.status}
                      color={policy.status === 'active' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Current Sentiment</Typography>
                      <Chip
                        label={getSentimentLabel(policy.current_sentiment)}
                        color={getSentimentColor(policy.current_sentiment)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(policy.current_sentiment) * 100}
                      color={getSentimentColor(policy.current_sentiment)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Pre-Announcement
                      </Typography>
                      <Typography variant="h6" color={getSentimentColor(policy.pre_announcement)}>
                        {policy.pre_announcement.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Post-Announcement
                      </Typography>
                      <Typography variant="h6" color={getSentimentColor(policy.post_announcement)}>
                        {policy.post_announcement.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      {getReactionIcon(policy.public_reaction)}
                      <Typography variant="body2" ml={1}>
                        {policy.media_coverage} mentions
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      endIcon={expandedPolicy === policy.id ? <ExpandLess /> : <ExpandMore />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id);
                      }}
                    >
                      Details
                    </Button>
                  </Box>

                  {expandedPolicy === policy.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Recovery Progress
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={calculateRecoveryProgress(policy)}
                          color="success"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {calculateRecoveryProgress(policy).toFixed(1)}% recovered
                        </Typography>
                      </Box>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Policy Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedPolicy && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Policy color="primary" sx={{ mr: 1 }} />
                {selectedPolicy.name} - Impact Analysis
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" mb={2}>
                    Sentiment Timeline
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={generateTimelineData(selectedPolicy)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis domain={[-1, 1]} />
                      <RechartsTooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [value.toFixed(3), 'Sentiment']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Key Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Peak Negative Sentiment"
                        secondary={`${selectedPolicy.peak_negative.toFixed(3)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Recovery Rate"
                        secondary={`${(selectedPolicy.recovery_rate * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Assessment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Media Coverage"
                        secondary={`${selectedPolicy.media_coverage} mentions`}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Public Reaction Analysis
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      {getReactionIcon(selectedPolicy.public_reaction)}
                      <Typography variant="body1" ml={1}>
                        {selectedPolicy.public_reaction.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Based on {selectedPolicy.media_coverage} media mentions and social media analysis
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

export default PolicyImpactTracker; 