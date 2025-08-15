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
  Facebook as FacebookIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
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

const MediaSourcesOverview = () => {
  const [mediaOverview, setMediaOverview] = useState({
    newspapers: { total_sources: 0, avg_sentiment: 0, total_articles: 0, top_performers: [], critical_sources: [] },
    television: { total_sources: 0, avg_sentiment: 0, total_reports: 0, top_performers: [], critical_sources: [] },
    twitter: { total_influencers: 0, avg_sentiment: 0, total_tweets: 0, top_performers: [], critical_influencers: [] },
    facebook: { total_pages: 0, avg_sentiment: 0, total_posts: 0, top_performers: [], critical_pages: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use the imported hook or fallback
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;
  const user = authContext?.user || null;

  useEffect(() => {
    const loadMediaData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📰 MediaSourcesOverview: Loading media data...');

        // Fetch data from all media sources endpoints
        const [newspapers, television, twitter, facebook] = await Promise.all([
          DataService.getNewspaperSources(accessToken, user?.id).catch(err => {
            console.error('❌ Error fetching newspapers:', err);
            return [];
          }),
          DataService.getTelevisionSources(accessToken).catch(err => {
            console.error('❌ Error fetching television:', err);
            return [];
          }),
          DataService.getTwitterSources(accessToken).catch(err => {
            console.error('❌ Error fetching twitter:', err);
            return [];
          }),
          DataService.getFacebookSources(accessToken).catch(err => {
            console.error('❌ Error fetching facebook:', err);
            return [];
          })
        ]);

        console.log('📰 MediaSourcesOverview: Raw data received:', {
          newspapers: newspapers,
          television: television,
          twitter: twitter,
          facebook: facebook
        });

        // Validate data structure
        const validateData = (data, type) => {
          if (!Array.isArray(data)) {
            console.warn(`⚠️ ${type} data is not an array:`, data);
            return [];
          }
          if (data.length > 0 && (!data[0].name || !data[0].sentiment_score)) {
            console.warn(`⚠️ ${type} data missing required fields:`, data[0]);
          }
          return data;
        };

        const validatedNewspapers = validateData(newspapers, 'Newspapers');
        const validatedTelevision = validateData(television, 'Television');
        const validatedTwitter = validateData(twitter, 'Twitter');
        const validatedFacebook = validateData(facebook, 'Facebook');

        // Log sample data structure for debugging
        if (validatedNewspapers.length > 0) {
          console.log('📰 Sample newspaper data:', validatedNewspapers[0]);
        }
        if (validatedTelevision.length > 0) {
          console.log('📺 Sample television data:', validatedTelevision[0]);
        }
        if (validatedTwitter.length > 0) {
          console.log('🐦 Sample twitter data:', validatedTwitter[0]);
        }
        if (validatedFacebook.length > 0) {
          console.log('📘 Sample facebook data:', validatedFacebook[0]);
        }

        console.log('📰 MediaSourcesOverview: Data fetched:', {
          newspapers: validatedNewspapers.length,
          television: validatedTelevision.length,
          twitter: validatedTwitter.length,
          facebook: validatedFacebook.length
        });

        // Process newspaper data
        const newspaperData = {
          total_sources: validatedNewspapers.length,
          avg_sentiment: validatedNewspapers.length > 0 ? 
            validatedNewspapers.reduce((sum, paper) => sum + (parseFloat(paper.sentiment_score) || 0), 0) / validatedNewspapers.length : 0,
          total_articles: validatedNewspapers.reduce((sum, paper) => sum + (parseInt(paper.coverage_count) || 0), 0),
          top_performers: validatedNewspapers
            .filter(paper => (parseFloat(paper.sentiment_score) || 0) > 0.1)
            .sort((a, b) => (parseFloat(b.sentiment_score) || 0) - (parseFloat(a.sentiment_score) || 0))
            .slice(0, 3)
            .map(paper => paper.name),
          critical_sources: validatedNewspapers
            .filter(paper => (parseFloat(paper.sentiment_score) || 0) < -0.1)
            .sort((a, b) => (parseFloat(a.sentiment_score) || 0) - (parseFloat(b.sentiment_score) || 0))
            .slice(0, 3)
            .map(paper => paper.name)
        };

        // Process television data
        const televisionData = {
          total_sources: validatedTelevision.length,
          avg_sentiment: validatedTelevision.length > 0 ? 
            validatedTelevision.reduce((sum, tv) => sum + (parseFloat(tv.sentiment_score) || 0), 0) / validatedTelevision.length : 0,
          total_reports: validatedTelevision.reduce((sum, tv) => sum + (parseInt(tv.coverage_count) || 0), 0),
          top_performers: validatedTelevision
            .filter(tv => (parseFloat(tv.sentiment_score) || 0) > 0.1)
            .sort((a, b) => (parseFloat(b.sentiment_score) || 0) - (parseFloat(a.sentiment_score) || 0))
            .slice(0, 3)
            .map(tv => tv.name),
          critical_sources: validatedTelevision
            .filter(tv => (parseFloat(tv.sentiment_score) || 0) < -0.1)
            .sort((a, b) => (parseFloat(a.sentiment_score) || 0) - (parseFloat(b.sentiment_score) || 0))
            .slice(0, 3)
            .map(tv => tv.name)
        };

        // Process Twitter data
        const twitterData = {
          total_influencers: validatedTwitter.length,
          avg_sentiment: validatedTwitter.length > 0 ? 
            validatedTwitter.reduce((sum, account) => sum + (parseFloat(account.sentiment_score) || 0), 0) / validatedTwitter.length : 0,
          total_tweets: validatedTwitter.reduce((sum, account) => sum + (parseInt(account.tweets_count) || 0), 0),
          top_performers: validatedTwitter
            .filter(account => (parseFloat(account.sentiment_score) || 0) > 0.1)
            .sort((a, b) => (parseFloat(b.sentiment_score) || 0) - (parseFloat(a.sentiment_score) || 0))
            .slice(0, 3)
            .map(account => account.name),
          critical_influencers: validatedTwitter
            .filter(account => (parseFloat(account.sentiment_score) || 0) < -0.1)
            .sort((a, b) => (parseFloat(a.sentiment_score) || 0) - (parseFloat(b.sentiment_score) || 0))
            .slice(0, 3)
            .map(account => account.name)
        };

        // Process Facebook data
        const facebookData = {
          total_pages: validatedFacebook.length,
          avg_sentiment: validatedFacebook.length > 0 ? 
            validatedFacebook.reduce((sum, page) => sum + (parseFloat(page.sentiment_score) || 0), 0) / validatedFacebook.length : 0,
          total_posts: validatedFacebook.reduce((sum, page) => sum + (parseInt(page.coverage_count) || 0), 0),
          top_performers: validatedFacebook
            .filter(page => (parseFloat(page.sentiment_score) || 0) > 0.1)
            .sort((a, b) => (parseFloat(b.sentiment_score) || 0) - (parseFloat(a.sentiment_score) || 0))
            .slice(0, 3)
            .map(page => page.name),
          critical_pages: validatedFacebook
            .filter(page => (parseFloat(page.sentiment_score) || 0) < -0.1)
            .sort((a, b) => (parseFloat(a.sentiment_score) || 0) - (parseFloat(b.sentiment_score) || 0))
            .slice(0, 3)
            .map(page => page.name)
        };

        setMediaOverview({
          newspapers: newspaperData,
          television: televisionData,
          twitter: twitterData,
          facebook: facebookData
        });

        console.log('📰 MediaSourcesOverview: Data processed successfully');
      } catch (error) {
        console.error('❌ MediaSourcesOverview: Error loading media data:', error);
        setError('Failed to load media data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch data, even without access token (for testing)
    loadMediaData();
  }, [accessToken, user?.id]);

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
      color: 'primary.main',
      data: mediaOverview.newspapers,
      description: 'Top Nigerian newspapers'
    },
    {
      type: 'Television',
      icon: <TvIcon />,
      color: 'secondary.main',
      data: mediaOverview.television,
      description: 'Major TV channels'
    },
    {
      type: 'Twitter',
      icon: <TwitterIcon />,
      color: 'info.main',
      data: mediaOverview.twitter,
      description: 'Key influencers & officials'
    },
    {
      type: 'Facebook',
      icon: <FacebookIcon />,
      color: 'success.main',
      data: mediaOverview.facebook,
      description: 'Popular Facebook pages'
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

  // Check if any media data is available
  const hasData = mediaOverview.newspapers.total_sources > 0 || 
                  mediaOverview.television.total_sources > 0 || 
                  mediaOverview.twitter.total_influencers > 0 || 
                  mediaOverview.facebook.total_pages > 0;

  if (!loading && !hasData) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          📊 Media Sources Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No media sources data available at the moment. Please try again later.
        </Typography>
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
                    <Avatar sx={{ bgcolor: mediaType.color, mr: 2 }}>
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