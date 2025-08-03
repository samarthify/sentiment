import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  useTheme, 
  Avatar, 
  Chip,
  Card,
  CardContent,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingUpIcon,
  Share as ShareIcon,
  Comment as CommentIcon,
  Favorite as FavoriteIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const InfluencerAnalysis = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Helper function to get sentiment info based on average sentiment score
  // Keep using score for the gradient classification
  const getSentimentInfo = (sentiment) => {
    if (sentiment >= 0.7) return { text: t('sentiments.veryPositive'), color: theme.palette.success.dark, icon: '😄' };
    if (sentiment >= 0.3) return { text: t('sentiments.positive'), color: theme.palette.success.main, icon: '🙂' };
    if (sentiment > -0.3) return { text: t('sentiments.neutral'), color: theme.palette.grey[600], icon: '😐' };
    if (sentiment > -0.7) return { text: t('sentiments.negative'), color: theme.palette.error.main, icon: '🙁' };
    return { text: t('sentiments.veryNegative'), color: theme.palette.error.dark, icon: '😞' };
  };

  // Process raw data to identify influencers
  const processInfluencers = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    // Helper function to validate and clean author name
    const isValidAuthor = (author) => {
      if (!author) return false;
      
      // Convert to string and trim
      const name = author.toString().trim();
      
      // Exclude single characters, numbers only, and specific invalid names
      const invalidNames = ['x', 'unknown', 'anonymous', 'user'];
      if (
        name.length <= 1 || 
        /^\d+$/.test(name) || 
        invalidNames.includes(name.toLowerCase()) ||
        name.toLowerCase() === name.toUpperCase() // Contains only special characters
      ) {
        return false;
      }
      
      return true;
    };

    // Group mentions by author
    const influencerMap = rawData.reduce((acc, mention) => {
      // Try to get the best author name from available fields
      const possibleAuthors = [
        mention.author,
        mention.username,
        mention.user_name,
        mention.name
      ].filter(isValidAuthor);

      // Use the first valid author name
      const author = possibleAuthors[0];
      if (!author) return acc;

      // Clean up the author name
      const cleanAuthorName = author.replace(/^@/, '').trim();
      
      if (!acc[cleanAuthorName]) {
        acc[cleanAuthorName] = {
          name: cleanAuthorName,
          handle: author.startsWith('@') ? author : `@${cleanAuthorName}`,
          platform: mention.platform || mention.source || t('general.unknown'),
          posts: 0,
          totalSentiment: 0,
          sentiments: [],
          location: mention.location || mention.country,
          mentions: [],
          topics: new Set(),
          engagement: 0
        };
      }

      // Add mention data
      acc[cleanAuthorName].posts += 1;
      acc[cleanAuthorName].totalSentiment += parseFloat(mention.sentiment_score) || 0;
      acc[cleanAuthorName].sentiments.push(parseFloat(mention.sentiment_score) || 0);
      acc[cleanAuthorName].mentions.push(mention);
      
      // Extract topics from text content
      if (mention.text) {
        // Extract hashtags and meaningful words
        const hashtags = mention.text.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          const cleanTag = tag.substring(1).toLowerCase();
          if (cleanTag.length > 2) { // Only add tags with more than 2 characters
            acc[cleanAuthorName].topics.add(cleanTag);
          }
        });
      }

      // Calculate engagement (if available)
      if (mention.likes || mention.shares || mention.comments) {
        acc[cleanAuthorName].engagement += (mention.likes || 0) + (mention.shares || 0) + (mention.comments || 0);
      }

      return acc;
    }, {});

    // Convert to array and calculate metrics
    return Object.values(influencerMap)
      .map(inf => {
        const avgSentiment = inf.totalSentiment / inf.posts;
        
        // Count posts by sentiment label
        let positivePosts = 0;
        let negativePosts = 0;
        let neutralPosts = 0;
        
        // Use mentions to access original data with labels
        inf.mentions.forEach(mention => {
          const label = (mention.sentiment_label || '').toLowerCase();
          if (label && label.includes('positive')) {
            positivePosts++;
          } else if (label && label.includes('negative')) {
            negativePosts++;
          } else if (label && label.includes('neutral')) {
            neutralPosts++;
          } else {
            // Fallback to sentiment score
            const score = parseFloat(mention.sentiment_score) || 0;
            if (score > 0.2) positivePosts++;
            else if (score < -0.2) negativePosts++;
            else neutralPosts++;
          }
        });
        
        return {
          ...inf,
          averageSentiment: avgSentiment,
          topics: Array.from(inf.topics)
            .filter(topic => topic.length > 2) // Filter out short topics
            .slice(0, 3), // Take top 3 topics
          sentiment: {
            positive: (positivePosts / inf.posts) * 100,
            negative: (negativePosts / inf.posts) * 100,
            neutral: (neutralPosts / inf.posts) * 100
          },
          engagementRate: ((inf.engagement / inf.posts) * 100).toFixed(2),
          sentimentInfo: getSentimentInfo(avgSentiment)
        };
      })
      .filter(inf => 
        inf.posts >= 3 && // Must have at least 3 posts
        inf.name.length > 1 && // Name must be longer than 1 character
        !/^\d+$/.test(inf.name) // Name cannot be just numbers
      )
      .sort((a, b) => b.engagement - a.engagement || b.posts - a.posts)
      .slice(0, 5); // Get top 5 influencers
  };

  const topInfluencers = processInfluencers(data?.rawData);

  // Process viral posts
  const getViralPosts = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData
      .filter(post => post.text && post.sentiment_score) // Ensure posts have content and sentiment
      .map(post => {
        // Get the author name if available
        const author = post.author || post.username || post.user_name;
        const platform = post.platform || post.source;
        
        // Clean up author and platform names
        const cleanAuthor = author?.toLowerCase().replace(/^www\./, '').replace(/\.[^.]+$/, '');
        const cleanPlatform = platform?.toLowerCase().replace(/^www\./, '').replace(/\.[^.]+$/, '');
        
        return {
          text: post.text,
          author: cleanAuthor === cleanPlatform ? null : author, // Only set author if different from platform
          location: post.location || post.country,
          sentiment: parseFloat(post.sentiment_score),
          likes: post.likes || 0,
          retweets: post.shares || 0,
          comments: post.comments || 0,
          platform: platform,
          date: post.date,
          viralityScore: (
            Math.abs(parseFloat(post.sentiment_score)) * 5 +
            ((post.likes || 0) + (post.shares || 0) * 2 + (post.comments || 0) * 3) / 100
          )
        };
      })
      .sort((a, b) => b.viralityScore - a.viralityScore)
      .slice(0, 5); // Get top 5 viral posts
  };

  const viralPosts = getViralPosts(data?.rawData);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h6" gutterBottom>
        {t('analysis.influencerAnalysis')}
        <Tooltip title={t('charts.influencerAnalysisTooltip')}>
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      <Grid container spacing={3}>
        {/* Top Influencers */}
        {topInfluencers.map((influencer, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: '#2196F3' }}>
                  {influencer.name ? influencer.name[0].toUpperCase() : <PersonIcon />}
                </Avatar>
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {influencer.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      icon={<LanguageIcon />}
                      label={influencer.platform}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      icon={<TrendingUpIcon />}
                      label={`${influencer.posts} ${t('influencerAnalysis.posts')}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#2196F3',
                        color: 'white',
                        '& .MuiChip-icon': {
                          color: 'white'
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    color: influencer.sentimentInfo.color,
                    mt: 1
                  }}>
                    <Typography variant="body2">
                      {influencer.sentimentInfo.icon} {influencer.sentimentInfo.text}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      ({(influencer.averageSentiment * 100).toFixed(1)}%)
                    </Typography>
                  </Box>
                  {influencer.topics.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('influencerAnalysis.topics')}: {influencer.topics.join(', ')}
                    </Typography>
                  )}
                  {influencer.location && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        mt: 0.5 
                      }}
                    >
                      <LocationIcon fontSize="small" />
                      {influencer.location}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}

        {/* Viral Posts */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('influencerAnalysis.mostViralContent')}
            </Typography>
            <Grid container spacing={2}>
              {viralPosts.map((post, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {(post.author || post.platform) && (
                            <>
                              {post.author && (
                                <Typography variant="subtitle2" color="text.secondary">
                                  {post.author}
                                </Typography>
                              )}
                              {post.platform && (
                                <Chip 
                                  size="small" 
                                  label={post.platform}
                                  sx={{
                                    '& .MuiChip-label': {
                                      maxWidth: '200px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {post.likes > 0 && (
                            <Tooltip title={t('influencerAnalysis.likes')}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FavoriteIcon color="error" sx={{ fontSize: 16, mr: 0.5 }} />
                                <Typography variant="body2">{post.likes}</Typography>
                              </Box>
                            </Tooltip>
                          )}
                          {post.retweets > 0 && (
                            <Tooltip title={t('influencerAnalysis.shares')}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ShareIcon color="primary" sx={{ fontSize: 16, mr: 0.5 }} />
                                <Typography variant="body2">{post.retweets}</Typography>
                              </Box>
                            </Tooltip>
                          )}
                          {post.comments > 0 && (
                            <Tooltip title={t('influencerAnalysis.comments')}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CommentIcon color="action" sx={{ fontSize: 16, mr: 0.5 }} />
                                <Typography variant="body2">{post.comments}</Typography>
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {post.text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon 
                          sx={{ 
                            color: post.sentiment > 0 ? 'success.main' : 'error.main',
                            fontSize: 16 
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {t('influencerAnalysis.viralityScore')}: {post.viralityScore.toFixed(1)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default InfluencerAnalysis; 