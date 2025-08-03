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
  Tv as TvIcon,
  LiveTv as LiveTvIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const TopTelevision = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock data for top Nigerian TV channels
  const topTelevision = [
    {
      name: 'Channels TV',
      logo: '📺',
      sentiment_score: 0.35,
      bias_level: 'Supportive',
      coverage_count: 28,
      last_updated: '1 hour ago',
      category: 'News Channel',
      verified: true,
      recent_programs: [
        { title: 'Government Infrastructure Achievements', sentiment: 'positive', viewership: 2.5, time: '2 hours ago' },
        { title: 'Economic Policy Analysis', sentiment: 'neutral', viewership: 1.8, time: '4 hours ago' },
        { title: 'Security Situation Report', sentiment: 'positive', viewership: 2.1, time: '6 hours ago' }
      ],
      top_topics: ['#Infrastructure', '#EconomicPolicy', '#Security']
    },
    {
      name: 'AIT (Africa Independent Television)',
      logo: '📺',
      sentiment_score: 0.25,
      bias_level: 'Supportive',
      coverage_count: 22,
      last_updated: '2 hours ago',
      category: 'News Channel',
      verified: true,
      recent_programs: [
        { title: 'Agricultural Development Programs', sentiment: 'positive', viewership: 1.9, time: '3 hours ago' },
        { title: 'Youth Employment Initiatives', sentiment: 'positive', viewership: 1.6, time: '5 hours ago' },
        { title: 'Healthcare System Improvements', sentiment: 'neutral', viewership: 1.4, time: '7 hours ago' }
      ],
      top_topics: ['#Agriculture', '#YouthEmployment', '#Healthcare']
    },
    {
      name: 'NTA (Nigerian Television Authority)',
      logo: '📺',
      sentiment_score: 0.45,
      bias_level: 'Supportive',
      coverage_count: 35,
      last_updated: '30 minutes ago',
      category: 'Government Channel',
      verified: true,
      recent_programs: [
        { title: 'Presidential Address on Economic Reforms', sentiment: 'positive', viewership: 3.2, time: '1 hour ago' },
        { title: 'Infrastructure Development Progress', sentiment: 'positive', viewership: 2.8, time: '3 hours ago' },
        { title: 'Security Measures Implementation', sentiment: 'positive', viewership: 2.5, time: '5 hours ago' }
      ],
      top_topics: ['#PresidentialAddress', '#Infrastructure', '#Security']
    },
    {
      name: 'TVC News',
      logo: '📺',
      sentiment_score: -0.15,
      bias_level: 'Critical',
      coverage_count: 18,
      last_updated: '4 hours ago',
      category: 'News Channel',
      verified: true,
      recent_programs: [
        { title: 'Fuel Subsidy Removal Impact', sentiment: 'negative', viewership: 2.1, time: '2 hours ago' },
        { title: 'Economic Challenges Analysis', sentiment: 'negative', viewership: 1.7, time: '4 hours ago' },
        { title: 'Exchange Rate Policy Concerns', sentiment: 'negative', viewership: 1.9, time: '6 hours ago' }
      ],
      top_topics: ['#FuelSubsidy', '#EconomicChallenges', '#ExchangeRate']
    },
    {
      name: 'Arise News',
      logo: '📺',
      sentiment_score: -0.25,
      bias_level: 'Critical',
      coverage_count: 15,
      last_updated: '5 hours ago',
      category: 'News Channel',
      verified: true,
      recent_programs: [
        { title: 'Economic Policy Criticism', sentiment: 'negative', viewership: 1.5, time: '3 hours ago' },
        { title: 'Government Accountability Issues', sentiment: 'negative', viewership: 1.3, time: '5 hours ago' },
        { title: 'Social Welfare Programs', sentiment: 'neutral', viewership: 1.1, time: '7 hours ago' }
      ],
      top_topics: ['#EconomicPolicy', '#Accountability', '#SocialWelfare']
    },
    {
      name: 'Silverbird Television',
      logo: '📺',
      sentiment_score: 0.05,
      bias_level: 'Neutral',
      coverage_count: 12,
      last_updated: '6 hours ago',
      category: 'Entertainment Channel',
      verified: true,
      recent_programs: [
        { title: 'Entertainment Industry Development', sentiment: 'positive', viewership: 1.2, time: '4 hours ago' },
        { title: 'Cultural Programs and Tourism', sentiment: 'positive', viewership: 0.9, time: '6 hours ago' },
        { title: 'Youth Development Initiatives', sentiment: 'neutral', viewership: 1.0, time: '8 hours ago' }
      ],
      top_topics: ['#Entertainment', '#Culture', '#YouthDevelopment']
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
      case 'News Channel': return <TvIcon />;
      case 'Government Channel': return <VerifiedIcon />;
      case 'Entertainment Channel': return <LiveTvIcon />;
      default: return <TvIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'News Channel': return 'primary';
      case 'Government Channel': return 'success';
      case 'Entertainment Channel': return 'info';
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
        📺 Top Television Channels Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topTelevision.map((channel, index) => (
          <Grid item xs={12} md={6} lg={4} key={channel.name}>
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
                onClick={() => handleSourceClick(channel)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          channel.verified ? (
                            <VerifiedIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                          ) : null
                        }
                      >
                        <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                          {channel.logo}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {channel.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {channel.coverage_count} programs • {channel.last_updated}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small">
                      <TvIcon />
                    </IconButton>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(channel.sentiment_score)}
                        label={`${(channel.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(channel.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(channel.sentiment_score * 100)}
                      color={getSentimentColor(channel.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={channel.bias_level}
                      color={channel.bias_level === 'Critical' ? 'error' : 
                             channel.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category & Coverage
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        icon={getCategoryIcon(channel.category)}
                        label={channel.category}
                        color={getCategoryColor(channel.category)}
                        size="small"
                      />
                      <Chip
                        label={`${channel.coverage_count} programs`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Topics
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {channel.top_topics.slice(0, 2).map((topic, idx) => (
                        <Chip
                          key={idx}
                          label={topic}
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
                      <VerifiedIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                    ) : null
                  }
                >
                  <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                    {selectedSource.logo}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="h6">{selectedSource.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSource.category} • {selectedSource.coverage_count} programs analyzed
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
                      Coverage Statistics
                    </Typography>
                    <Typography variant="body1">
                      {selectedSource.coverage_count} programs analyzed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {selectedSource.last_updated}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Topics
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedSource.top_topics.map((topic, idx) => (
                        <Chip
                          key={idx}
                          label={topic}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Programs
                  </Typography>
                  <List dense>
                    {selectedSource.recent_programs.map((program, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip
                            label={program.sentiment}
                            color={program.sentiment === 'positive' ? 'success' : 
                                   program.sentiment === 'negative' ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={program.title}
                          secondary={`${program.viewership}M viewers • ${program.time}`}
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
                onClick={() => window.open(`https://www.google.com/search?q=${selectedSource.name}`, '_blank')}
              >
                Visit Website
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TopTelevision; 