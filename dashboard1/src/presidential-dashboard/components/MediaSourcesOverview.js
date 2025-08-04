import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  Alert
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
import DataService from '../../services/DataService';

const MediaSourcesOverview = () => {
  const [mediaOverview, setMediaOverview] = useState({
    newspapers: { total_sources: 0, avg_sentiment: 0, total_articles: 0, top_performers: [], critical_sources: [] },
    television: { total_sources: 0, avg_sentiment: 0, total_reports: 0, top_performers: [], critical_sources: [] },
    twitter: { total_influencers: 0, avg_sentiment: 0, total_tweets: 0, top_performers: [], critical_influencers: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMediaData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all three endpoints without authentication
        const [newspapers, television, twitter] = await Promise.all([
          DataService.getNewspaperSources(null),
          DataService.getTelevisionSources(null),
          DataService.getTwitterSources(null)
        ]);

        // Process newspaper data
        const newspaperData = {
          total_sources: newspapers.length,
          avg_sentiment: newspapers.length > 0 ? 
            newspapers.reduce((sum, paper) => sum + paper.sentiment_score, 0) / newspapers.length : 0,
          total_articles: newspapers.reduce((sum, paper) => sum + paper.coverage_count, 0),
          top_performers: newspapers
            .filter(paper => paper.sentiment_score > 0.1)
            .sort((a, b) => b.sentiment_score - a.sentiment_score)
            .slice(0, 3)
            .map(paper => paper.name),
          critical_sources: newspapers
            .filter(paper => paper.sentiment_score < -0.1)
            .sort((a, b) => a.sentiment_score - b.sentiment_score)
            .slice(0, 3)
            .map(paper => paper.name)
        };

        // Process television data
        const televisionData = {
          total_sources: television.length,
          avg_sentiment: television.length > 0 ? 
            television.reduce((sum, tv) => sum + tv.sentiment_score, 0) / television.length : 0,
          total_reports: television.reduce((sum, tv) => sum + tv.coverage_count, 0),
          top_performers: television
            .filter(tv => tv.sentiment_score > 0.1)
            .sort((a, b) => b.sentiment_score - a.sentiment_score)
            .slice(0, 3)
            .map(tv => tv.name),
          critical_sources: television
            .filter(tv => tv.sentiment_score < -0.1)
            .sort((a, b) => a.sentiment_score - b.sentiment_score)
            .slice(0, 3)
            .map(tv => tv.name)
        };

        // Process Twitter data
        const twitterData = {
          total_influencers: twitter.length,
          avg_sentiment: twitter.length > 0 ? 
            twitter.reduce((sum, account) => sum + account.sentiment_score, 0) / twitter.length : 0,
          total_tweets: twitter.reduce((sum, account) => sum + account.tweets_count, 0),
          top_performers: twitter
            .filter(account => account.sentiment_score > 0.1)
            .sort((a, b) => b.sentiment_score - a.sentiment_score)
            .slice(0, 3)
            .map(account => account.name),
          critical_influencers: twitter
            .filter(account => account.sentiment_score < -0.1)
            .sort((a, b) => a.sentiment_score - b.sentiment_score)
            .slice(0, 3)
            .map(account => account.name)
        };

        setMediaOverview({
          newspapers: newspaperData,
          television: televisionData,
          twitter: twitterData
        });

      } catch (err) {
        console.error('Error fetching media data:', err);
        setError('Failed to load media sources data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMediaData();
  }, []);

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
      description: 'Top Nigerian newspapers'
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

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
                Newspapers show {mediaOverview.newspapers.avg_sentiment > 0 ? 'positive' : 'negative'} coverage 
                ({(mediaOverview.newspapers.avg_sentiment * 100).toFixed(0)}% sentiment), while television channels are 
                {mediaOverview.television.avg_sentiment > 0 ? ' more balanced' : ' critical'} 
                ({(mediaOverview.television.avg_sentiment * 100).toFixed(0)}% sentiment). 
                Twitter influencers show {(mediaOverview.twitter.avg_sentiment * 100).toFixed(0)}% sentiment with significant public engagement.
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Coverage Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Newspapers lead with {mediaOverview.newspapers.total_articles} articles analyzed, followed by Twitter with {mediaOverview.twitter.total_tweets} tweets, 
                and television with {mediaOverview.television.total_reports} reports. 
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