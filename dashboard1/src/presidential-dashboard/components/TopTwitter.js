import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Twitter as TwitterIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const TopTwitter = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock data for top Nigerian Twitter influencers
  const topTwitter = [
    {
      name: 'Femi Fani-Kayode',
      handle: '@realFFK',
      logo: '🐦',
      sentiment_score: -0.75,
      bias_level: 'Critical',
      followers: '2.1M',
      tweets_count: 15,
      last_updated: '30 minutes ago',
      category: 'Politician',
      verified: true,
      recent_tweets: [
        { text: 'The current economic policies are causing hardship for Nigerians', sentiment: 'negative', engagement: 12500, time: '2 hours ago' },
        { text: 'Government needs to address the fuel subsidy removal impact', sentiment: 'negative', engagement: 8900, time: '4 hours ago' },
        { text: 'Security situation in the country requires immediate attention', sentiment: 'negative', engagement: 15600, time: '6 hours ago' }
      ],
      top_hashtags: ['#Nigeria', '#FuelSubsidy', '#EconomicPolicy']
    },
    {
      name: 'Bashir Ahmad',
      handle: '@BashirAhmaad',
      logo: '🐦',
      sentiment_score: 0.45,
      bias_level: 'Supportive',
      followers: '1.8M',
      tweets_count: 12,
      last_updated: '1 hour ago',
      category: 'Government Official',
      verified: true,
      recent_tweets: [
        { text: 'Infrastructure development projects are progressing well across Nigeria', sentiment: 'positive', engagement: 9800, time: '1 hour ago' },
        { text: 'Economic reforms are showing positive results', sentiment: 'positive', engagement: 7600, time: '3 hours ago' },
        { text: 'Government commitment to security is unwavering', sentiment: 'positive', engagement: 11200, time: '5 hours ago' }
      ],
      top_hashtags: ['#Nigeria', '#Infrastructure', '#Security']
    },
    {
      name: 'Dele Momodu',
      handle: '@DeleMomodu',
      logo: '🐦',
      sentiment_score: -0.35,
      bias_level: 'Critical',
      followers: '1.5M',
      tweets_count: 8,
      last_updated: '2 hours ago',
      category: 'Media Personality',
      verified: true,
      recent_tweets: [
        { text: 'The exchange rate policy needs urgent review', sentiment: 'negative', engagement: 6800, time: '3 hours ago' },
        { text: 'Education sector requires more funding', sentiment: 'neutral', engagement: 5400, time: '5 hours ago' },
        { text: 'Healthcare system improvements are needed', sentiment: 'negative', engagement: 7200, time: '7 hours ago' }
      ],
      top_hashtags: ['#Nigeria', '#Education', '#Healthcare']
    },
    {
      name: 'Aisha Yesufu',
      handle: '@AishaYesufu',
      logo: '🐦',
      sentiment_score: -0.65,
      bias_level: 'Critical',
      followers: '1.2M',
      tweets_count: 20,
      last_updated: '45 minutes ago',
      category: 'Activist',
      verified: true,
      recent_tweets: [
        { text: 'Human rights violations must be addressed immediately', sentiment: 'negative', engagement: 18900, time: '1 hour ago' },
        { text: 'Accountability in government spending is crucial', sentiment: 'negative', engagement: 15600, time: '3 hours ago' },
        { text: 'Youth unemployment crisis needs urgent attention', sentiment: 'negative', engagement: 13400, time: '5 hours ago' }
      ],
      top_hashtags: ['#HumanRights', '#Accountability', '#YouthEmployment']
    },
    {
      name: 'Tolu Ogunlesi',
      handle: '@toluogunlesi',
      logo: '🐦',
      sentiment_score: 0.25,
      bias_level: 'Supportive',
      followers: '950K',
      tweets_count: 10,
      last_updated: '1.5 hours ago',
      category: 'Government Official',
      verified: true,
      recent_tweets: [
        { text: 'Digital economy initiatives are transforming Nigeria', sentiment: 'positive', engagement: 7200, time: '2 hours ago' },
        { text: 'Agricultural development programs are successful', sentiment: 'positive', engagement: 5800, time: '4 hours ago' },
        { text: 'Technology adoption in government is improving', sentiment: 'positive', engagement: 6400, time: '6 hours ago' }
      ],
      top_hashtags: ['#DigitalEconomy', '#Agriculture', '#Technology']
    },
    {
      name: 'Reno Omokri',
      handle: '@renoomokri',
      logo: '🐦',
      sentiment_score: -0.55,
      bias_level: 'Critical',
      followers: '1.1M',
      tweets_count: 18,
      last_updated: '2.5 hours ago',
      category: 'Political Analyst',
      verified: true,
      recent_tweets: [
        { text: 'Economic policies are affecting the common man', sentiment: 'negative', engagement: 9800, time: '3 hours ago' },
        { text: 'Inflation rate is concerning for Nigerians', sentiment: 'negative', engagement: 8200, time: '5 hours ago' },
        { text: 'Security challenges persist in various regions', sentiment: 'negative', engagement: 11400, time: '7 hours ago' }
      ],
      top_hashtags: ['#Economy', '#Inflation', '#Security']
    }
  ];

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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Politician': return <PersonIcon />;
      case 'Government Official': return <BusinessIcon />;
      case 'Media Personality': return <GroupIcon />;
      case 'Activist': return <PersonIcon />;
      case 'Political Analyst': return <GroupIcon />;
      default: return <PersonIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Politician': return 'primary';
      case 'Government Official': return 'success';
      case 'Media Personality': return 'info';
      case 'Activist': return 'warning';
      case 'Political Analyst': return 'secondary';
      default: return 'default';
    }
  };

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSource(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        🐦 Top Twitter Influencers Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topTwitter.map((influencer, index) => (
          <Grid item xs={12} md={6} lg={4} key={influencer.name}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { elevation: 4, transform: 'translateY(-2px)' },
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleSourceClick(influencer)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          influencer.verified ? (
                            <VerifiedIcon sx={{ fontSize: 16, color: '#1DA1F2' }} />
                          ) : null
                        }
                      >
                        <Avatar sx={{ bgcolor: '#1DA1F2', mr: 2 }}>
                          {influencer.logo}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {influencer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {influencer.handle} • {influencer.followers} followers
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small">
                      <TwitterIcon />
                    </IconButton>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(influencer.sentiment_score)}
                        label={`${(influencer.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(influencer.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(influencer.sentiment_score * 100)}
                      color={getSentimentColor(influencer.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={influencer.bias_level}
                      color={influencer.bias_level === 'Critical' ? 'error' : 
                             influencer.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category & Activity
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        icon={getCategoryIcon(influencer.category)}
                        label={influencer.category}
                        color={getCategoryColor(influencer.category)}
                        size="small"
                      />
                      <Chip
                        label={`${influencer.tweets_count} tweets`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Hashtags
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {influencer.top_hashtags.slice(0, 2).map((hashtag, idx) => (
                        <Chip
                          key={idx}
                          label={hashtag}
                          size="small"
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

      {/* Detailed Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedSource && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    selectedSource.verified ? (
                      <VerifiedIcon sx={{ fontSize: 20, color: '#1DA1F2' }} />
                    ) : null
                  }
                >
                  <Avatar sx={{ bgcolor: '#1DA1F2', mr: 2 }}>
                    {selectedSource.logo}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="h6">{selectedSource.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSource.handle} • {selectedSource.category}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Sentiment Overview
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Overall Sentiment Score
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Chip
                        icon={getSentimentIcon(selectedSource.sentiment_score)}
                        label={`${(selectedSource.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(selectedSource.sentiment_score)}
                        size="medium"
                      />
                    </Box>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Bias Classification
                    </Typography>
                    <Chip
                      label={selectedSource.bias_level}
                      color={selectedSource.bias_level === 'Critical' ? 'error' : 
                             selectedSource.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="medium"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Account Statistics
                    </Typography>
                    <Typography variant="body1">
                      {selectedSource.followers} followers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSource.tweets_count} tweets analyzed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {selectedSource.last_updated}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Hashtags
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedSource.top_hashtags.map((hashtag, idx) => (
                        <Chip
                          key={idx}
                          label={hashtag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Tweets
                  </Typography>
                  <List dense>
                    {selectedSource.recent_tweets.map((tweet, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip
                            label={tweet.sentiment}
                            color={tweet.sentiment === 'positive' ? 'success' : 
                                   tweet.sentiment === 'negative' ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={tweet.text}
                          secondary={`${tweet.engagement.toLocaleString()} engagements • ${tweet.time}`}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                          sx={{ 
                            '& .MuiListItemText-primary': {
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                variant="contained" 
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(`https://twitter.com/${selectedSource.handle.substring(1)}`, '_blank')}
              >
                View Profile
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TopTwitter; 