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
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const TopNewspapers = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock data for top Nigerian newspapers
  const topNewspapers = [
    {
      name: 'The Guardian Nigeria',
      logo: '📰',
      sentiment_score: -0.65,
      bias_level: 'Critical',
      coverage_count: 45,
      last_updated: '2 hours ago',
      top_headlines: [
        'Fuel Subsidy Removal: Economic Impact Analysis',
        'Exchange Rate Policy Under Scrutiny',
        'Security Measures in Northern States'
      ],
      recent_articles: [
        { title: 'Economic Reforms Face Public Backlash', sentiment: 'negative', date: '2024-01-15' },
        { title: 'Infrastructure Development Progress', sentiment: 'positive', date: '2024-01-14' },
        { title: 'Healthcare Policy Implementation', sentiment: 'neutral', date: '2024-01-13' }
      ]
    },
    {
      name: 'Vanguard News',
      logo: '📰',
      sentiment_score: -0.58,
      bias_level: 'Critical',
      coverage_count: 38,
      last_updated: '1 hour ago',
      top_headlines: [
        'Government Economic Policies: Public Reaction',
        'Education Reform Initiatives',
        'Agricultural Development Programs'
      ],
      recent_articles: [
        { title: 'Youth Employment Programs Launched', sentiment: 'positive', date: '2024-01-15' },
        { title: 'Anti-Corruption Measures Announced', sentiment: 'positive', date: '2024-01-14' },
        { title: 'Economic Challenges Persist', sentiment: 'negative', date: '2024-01-13' }
      ]
    },
    {
      name: 'Punch Newspapers',
      logo: '📰',
      sentiment_score: -0.42,
      bias_level: 'Critical',
      coverage_count: 32,
      last_updated: '3 hours ago',
      top_headlines: [
        'Fuel Price Increase: Consumer Impact',
        'Security Situation in South-East',
        'Educational Infrastructure Development'
      ],
      recent_articles: [
        { title: 'Digital Economy Initiatives', sentiment: 'positive', date: '2024-01-15' },
        { title: 'Healthcare System Improvements', sentiment: 'neutral', date: '2024-01-14' },
        { title: 'Economic Policy Criticism', sentiment: 'negative', date: '2024-01-13' }
      ]
    },
    {
      name: 'ThisDay Live',
      logo: '📰',
      sentiment_score: 0.15,
      bias_level: 'Supportive',
      coverage_count: 28,
      last_updated: '4 hours ago',
      top_headlines: [
        'Government Achievements in Infrastructure',
        'Economic Recovery Indicators',
        'Security Improvements in Key Regions'
      ],
      recent_articles: [
        { title: 'Infrastructure Development Success', sentiment: 'positive', date: '2024-01-15' },
        { title: 'Economic Growth Projections', sentiment: 'positive', date: '2024-01-14' },
        { title: 'Security Measures Effectiveness', sentiment: 'positive', date: '2024-01-13' }
      ]
    },
    {
      name: 'Premium Times Nigeria',
      logo: '📰',
      sentiment_score: -0.35,
      bias_level: 'Critical',
      coverage_count: 25,
      last_updated: '5 hours ago',
      top_headlines: [
        'Transparency in Government Spending',
        'Human Rights Issues in Focus',
        'Economic Policy Transparency'
      ],
      recent_articles: [
        { title: 'Government Accountability Measures', sentiment: 'neutral', date: '2024-01-15' },
        { title: 'Human Rights Protection', sentiment: 'positive', date: '2024-01-14' },
        { title: 'Economic Policy Concerns', sentiment: 'negative', date: '2024-01-13' }
      ]
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
        📰 Top Newspapers Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topNewspapers.map((newspaper, index) => (
          <Grid item xs={12} md={6} lg={4} key={newspaper.name}>
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
                onClick={() => handleSourceClick(newspaper)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {newspaper.logo}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {newspaper.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {newspaper.coverage_count} articles • {newspaper.last_updated}
                        </Typography>
                      </Box>
                    </Box>
                                         <IconButton size="small">
                       <OpenInNewIcon />
                     </IconButton>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Chip
                        icon={getSentimentIcon(newspaper.sentiment_score)}
                        label={`${(newspaper.sentiment_score * 100).toFixed(0)}%`}
                        color={getSentimentColor(newspaper.sentiment_score)}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.abs(newspaper.sentiment_score * 100)}
                      color={getSentimentColor(newspaper.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bias Level
                    </Typography>
                    <Chip
                      label={newspaper.bias_level}
                      color={newspaper.bias_level === 'Critical' ? 'error' : 
                             newspaper.bias_level === 'Supportive' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Top Headlines
                    </Typography>
                    {newspaper.top_headlines.slice(0, 2).map((headline, idx) => (
                      <Typography 
                        key={idx} 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          mb: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        • {headline}
                      </Typography>
                    ))}
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
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  {selectedSource.logo}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedSource.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detailed Analysis
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

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Coverage Statistics
                    </Typography>
                    <Typography variant="body1">
                      {selectedSource.coverage_count} articles analyzed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {selectedSource.last_updated}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recent Articles
                  </Typography>
                  <List dense>
                    {selectedSource.recent_articles.map((article, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip
                            label={article.sentiment}
                            color={article.sentiment === 'positive' ? 'success' : 
                                   article.sentiment === 'negative' ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={article.title}
                          secondary={article.date}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
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

export default TopNewspapers; 