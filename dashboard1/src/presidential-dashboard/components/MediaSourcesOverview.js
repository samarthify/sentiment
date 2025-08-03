import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Newspaper as NewspaperIcon,
  Tv as TvIcon,
  Twitter as TwitterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MediaSourcesOverview = () => {
  // Mock data for media sources overview
  const mediaOverview = {
    newspapers: {
      total_sources: 10,
      avg_sentiment: -0.25,
      total_articles: 156,
      top_performers: ['ThisDay Live', 'Premium Times'],
      critical_sources: ['The Guardian Nigeria', 'Vanguard News', 'Punch Newspapers']
    },
    television: {
      total_sources: 8,
      avg_sentiment: 0.15,
      total_reports: 89,
      top_performers: ['NTA', 'Channels TV'],
      critical_sources: ['Arise TV', 'TVC News']
    },
    twitter: {
      total_influencers: 15,
      avg_sentiment: -0.35,
      total_tweets: 234,
      top_performers: ['Bashir Ahmad', 'Tolu Ogunlesi'],
      critical_influencers: ['Femi Fani-Kayode', 'Aisha Yesufu', 'Reno Omokri']
    }
  };

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

  const mediaTypes = [
    {
      type: 'Newspapers',
      icon: <NewspaperIcon />,
      color: 'primary',
      data: mediaOverview.newspapers,
      description: 'Top 10 Nigerian newspapers'
    },
    {
      type: 'Television',
      icon: <TvIcon />,
      color: 'secondary',
      data: mediaOverview.television,
      description: 'Major TV channels'
    },
    {
      type: 'Twitter',
      icon: <TwitterIcon />,
      color: 'info',
      data: mediaOverview.twitter,
      description: 'Key influencers & officials'
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        📊 Media Sources Overview
      </Typography>
      
      <Grid container spacing={3}>
        {mediaTypes.map((mediaType, index) => (
          <Grid item xs={12} md={4} key={mediaType.type}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: `${mediaType.color}.main`, mr: 2 }}>
                      {mediaType.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {mediaType.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {mediaType.description}
                      </Typography>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Average Sentiment
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(mediaType.data.avg_sentiment)}
                        label={`${(mediaType.data.avg_sentiment * 100).toFixed(0)}%`}
                        color={getSentimentColor(mediaType.data.avg_sentiment)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(mediaType.data.avg_sentiment * 100)}
                      color={getSentimentColor(mediaType.data.avg_sentiment)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Coverage Statistics
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {mediaType.data.total_sources || mediaType.data.total_influencers} sources
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {mediaType.data.total_articles || mediaType.data.total_reports || mediaType.data.total_tweets} items analyzed
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Performers
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {mediaType.data.top_performers.slice(0, 2).map((performer, idx) => (
                        <Chip
                          key={idx}
                          label={performer}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Critical Sources
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {mediaType.data.critical_sources?.slice(0, 2).map((source, idx) => (
                        <Chip
                          key={idx}
                          label={source}
                          size="small"
                          color="error"
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

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📈 Key Insights
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                🎯 Overall Media Sentiment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Newspapers show the most critical coverage (-25% sentiment), while television channels are more balanced (+15% sentiment). 
                Twitter influencers are highly critical (-35% sentiment) with significant public engagement.
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Coverage Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Newspapers lead with 156 articles analyzed, followed by Twitter with 234 tweets, and television with 89 reports. 
                This provides comprehensive coverage across all media types.
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MediaSourcesOverview; 