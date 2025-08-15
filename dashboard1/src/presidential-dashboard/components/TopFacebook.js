import React, { useState, useEffect } from 'react';
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
  Badge,
  CircularProgress,
  Alert
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
  Facebook as FacebookIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DataService from '../../services/DataService';

// Import useAuth hook or create a fallback
let useAuth;
try {
  const authModule = require('../../contexts/AuthContext');
  useAuth = authModule.useAuth;
} catch (error) {
  // Fallback if AuthContext is not available
  useAuth = () => ({ accessToken: null });
}

const TopFacebook = () => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topFacebook, setTopFacebook] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Use the imported hook or fallback
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;

  useEffect(() => {
    // Use mock data only for now
    setLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setTopFacebook(getMockFacebookData());
      setLoading(false);
    }, 800);
  }, []);

  // Mock data function
  const getMockFacebookData = () => {
    return [
      {
        name: "Legit.ng",
        logo: "📘",
        sentiment_score: 0.45,
        bias_level: "Supportive",
        coverage_count: 156,
        last_updated: "2 hours ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Breaking: New Economic Policy Announced by Government",
            sentiment: "positive",
            engagement: 2.4,
            time: "1 hour ago",
            facebook_url: "https://www.facebook.com/Legitng"
          },
          {
            title: "Analysis: Impact of Fuel Subsidy Removal on Nigerian Economy",
            sentiment: "neutral",
            engagement: 1.8,
            time: "3 hours ago",
            facebook_url: "https://www.facebook.com/Legitng"
          },
          {
            title: "Exclusive: Interview with Minister of Finance",
            sentiment: "positive",
            engagement: 3.1,
            time: "5 hours ago",
            facebook_url: "https://www.facebook.com/Legitng"
          }
        ],
        top_topics: ["#BreakingNews", "#Economy", "#Nigeria"],
        facebook_url: "https://www.facebook.com/Legitng"
      },
      {
        name: "Vanguard Nigeria",
        logo: "📘",
        sentiment_score: -0.12,
        bias_level: "Neutral",
        coverage_count: 203,
        last_updated: "1 hour ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Security Update: Latest Developments in Northern Region",
            sentiment: "negative",
            engagement: 2.7,
            time: "2 hours ago",
            facebook_url: "https://www.facebook.com/Vanguardngr"
          },
          {
            title: "Business News: Stock Market Performance This Week",
            sentiment: "neutral",
            engagement: 1.5,
            time: "4 hours ago",
            facebook_url: "https://www.facebook.com/Vanguardngr"
          },
          {
            title: "Sports: Super Eagles Training Camp Update",
            sentiment: "positive",
            engagement: 2.9,
            time: "6 hours ago",
            facebook_url: "https://www.facebook.com/Vanguardngr"
          }
        ],
        top_topics: ["#Security", "#Business", "#Sports"],
        facebook_url: "https://www.facebook.com/Vanguardngr"
      },
      {
        name: "Punch Newspapers",
        logo: "📘",
        sentiment_score: 0.28,
        bias_level: "Supportive",
        coverage_count: 178,
        last_updated: "45 minutes ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Education: New Curriculum Implementation in Schools",
            sentiment: "positive",
            engagement: 2.1,
            time: "1 hour ago",
            facebook_url: "https://www.facebook.com/PunchNGonline"
          },
          {
            title: "Health: COVID-19 Vaccination Drive Success",
            sentiment: "positive",
            engagement: 1.9,
            time: "3 hours ago",
            facebook_url: "https://www.facebook.com/PunchNGonline"
          },
          {
            title: "Technology: Nigerian Startups Making Global Impact",
            sentiment: "positive",
            engagement: 2.6,
            time: "5 hours ago",
            facebook_url: "https://www.facebook.com/PunchNGonline"
          }
        ],
        top_topics: ["#Education", "#Health", "#Technology"],
        facebook_url: "https://www.facebook.com/PunchNGonline"
      },
      {
        name: "Daily Trust",
        logo: "📘",
        sentiment_score: -0.35,
        bias_level: "Critical",
        coverage_count: 134,
        last_updated: "30 minutes ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Investigation: Corruption Allegations in Ministry",
            sentiment: "negative",
            engagement: 3.2,
            time: "2 hours ago",
            facebook_url: "https://www.facebook.com/dailytrust"
          },
          {
            title: "Analysis: Rising Inflation and Its Effects",
            sentiment: "negative",
            engagement: 2.8,
            time: "4 hours ago",
            facebook_url: "https://www.facebook.com/dailytrust"
          },
          {
            title: "Report: Infrastructure Challenges in Rural Areas",
            sentiment: "negative",
            engagement: 2.4,
            time: "6 hours ago",
            facebook_url: "https://www.facebook.com/dailytrust"
          }
        ],
        top_topics: ["#Corruption", "#Inflation", "#Infrastructure"],
        facebook_url: "https://www.facebook.com/dailytrust"
      },
      {
        name: "Premium Times",
        logo: "📘",
        sentiment_score: 0.18,
        bias_level: "Neutral",
        coverage_count: 167,
        last_updated: "1 hour ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Politics: Opposition Party Announces New Leadership",
            sentiment: "neutral",
            engagement: 2.3,
            time: "2 hours ago",
            facebook_url: "https://www.facebook.com/premiumtimesng"
          },
          {
            title: "Environment: Climate Change Impact on Agriculture",
            sentiment: "neutral",
            engagement: 1.7,
            time: "4 hours ago",
            facebook_url: "https://www.facebook.com/premiumtimesng"
          },
          {
            title: "Culture: Traditional Festival Celebrations",
            sentiment: "positive",
            engagement: 2.5,
            time: "6 hours ago",
            facebook_url: "https://www.facebook.com/premiumtimesng"
          }
        ],
        top_topics: ["#Politics", "#Environment", "#Culture"],
        facebook_url: "https://www.facebook.com/premiumtimesng"
      },
      {
        name: "Channels TV",
        logo: "📘",
        sentiment_score: 0.52,
        bias_level: "Supportive",
        coverage_count: 189,
        last_updated: "15 minutes ago",
        category: "News Page",
        verified: true,
        recent_posts: [
          {
            title: "Live Coverage: Presidential Address to Nation",
            sentiment: "positive",
            engagement: 4.1,
            time: "30 minutes ago",
            facebook_url: "https://www.facebook.com/ChannelsTelevision"
          },
          {
            title: "Special Report: Economic Recovery Indicators",
            sentiment: "positive",
            engagement: 3.3,
            time: "2 hours ago",
            facebook_url: "https://www.facebook.com/ChannelsTelevision"
          },
          {
            title: "Interview: Central Bank Governor on Monetary Policy",
            sentiment: "positive",
            engagement: 3.7,
            time: "4 hours ago",
            facebook_url: "https://www.facebook.com/ChannelsTelevision"
          }
        ],
        top_topics: ["#LiveCoverage", "#Economy", "#CentralBank"],
        facebook_url: "https://www.facebook.com/ChannelsTelevision"
      }
    ];
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Government Page':
        return <BusinessIcon />;
      case 'News Page':
        return <PersonIcon />;
      case 'Business Page':
        return <GroupIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Government Page':
        return 'primary';
      case 'News Page':
        return 'secondary';
      case 'Business Page':
        return 'success';
      default:
        return 'default';
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

  const handleViewPosts = () => {
    if (selectedSource) {
      // Navigate to sentiment data page with Facebook filter
      navigate('/sentiment-data', { 
        state: { 
          sourceFilter: selectedSource.name,
          platformFilter: 'Facebook'
        }
      });
      handleCloseDialog();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!topFacebook || topFacebook.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          �� Top Facebook Pages Analysis
        </Typography>
        <Alert severity="info">
          No Facebook pages data available at the moment.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        �� Top Facebook Pages Analysis
      </Typography>
      
      <Grid container spacing={3}>
        {topFacebook.map((page, index) => (
          <Grid item xs={12} md={6} lg={4} key={page.name}>
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
                onClick={() => handleSourceClick(page)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        mr: 2,
                        width: 48,
                        height: 48
                      }}
                    >
                      {page.logo}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        {page.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={page.category} 
                          size="small" 
                          color={getCategoryColor(page.category)}
                          icon={getCategoryIcon(page.category)}
                        />
                        {page.verified && (
                          <VerifiedIcon color="primary" fontSize="small" />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSentimentIcon(page.sentiment_score)}
                        <Typography variant="body2" fontWeight={600}>
                          {page.sentiment_score.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={((page.sentiment_score + 1) / 2) * 100}
                      color={getSentimentColor(page.sentiment_score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="primary" fontWeight={600}>
                            {page.coverage_count}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Posts
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="secondary" fontWeight={600}>
                            {page.bias_level}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Bias Level
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {page.last_updated}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (page.facebook_url) {
                          window.open(page.facebook_url, '_blank');
                        }
                      }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {selectedSource?.logo}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedSource?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedSource?.category} • {selectedSource?.bias_level}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedSource && (
            <Box>
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Recent Posts
                </Typography>
                <List>
                  {selectedSource.recent_posts?.map((post, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Badge 
                          badgeContent={post.engagement} 
                          color="primary"
                          max={999}
                        >
                          <VisibilityIcon />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={post.title}
                        secondary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Chip 
                              label={post.sentiment} 
                              size="small" 
                              color={getSentimentColor(post.sentiment_score || 0)}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {post.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Top Topics
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {selectedSource.top_topics?.map((topic, index) => (
                    <Chip key={index} label={topic} size="small" />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="h4" color="primary" fontWeight={600}>
                        {selectedSource.coverage_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Posts
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="h4" color="secondary" fontWeight={600}>
                        {selectedSource.sentiment_score.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment Score
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button 
            variant="contained" 
            onClick={handleViewPosts}
            startIcon={<VisibilityIcon />}
          >
            View All Posts
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TopFacebook;
