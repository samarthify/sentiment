import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Policy as PolicyIcon,
  Newspaper as NewspaperIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  AccountCircle,
  Warning,
  CheckCircle,
  Info,
  Twitter as TwitterIcon,
  Tv as TvIcon,
  LocationOn as LocationIcon,
  Summarize as SummarizeIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Import presidential components
import ExecutiveSummary from './ExecutiveSummary';
import PolicyImpactTracker from './PolicyImpactTracker';
import MediaBiasTracker from './MediaBiasTracker';
import TopNewspapers from './TopNewspapers';
import TopTelevision from './TopTelevision';
import TopTwitter from './TopTwitter';
import MediaSourcesOverview from './MediaSourcesOverview';

import ContextualSentimentAnalysis from './ContextualSentimentAnalysis';
import GeographicalDistribution from './GeographicalDistribution';
import AutoSummary from '../../components/AutoSummary';
import EmotionalSpectrum from '../../components/EmotionalSpectrum';

// Import existing components for detailed views
import SentimentOverview from '../../components/SentimentOverview';
import SentimentBySource from '../../components/SentimentBySource';
import SentimentTable from '../../components/SentimentTable';

// Import data service
import DataService from '../../services/DataService';
import { useAuth } from '../../contexts/AuthContext.tsx';

const PresidentialDashboard = ({ userRole = 'president' }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { accessToken } = useAuth();
  
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Load real data from the data service
    const loadPresidentialData = async () => {
      try {
        setLoading(true);
        
        const processedData = await DataService.loadData(accessToken);
        
        // Store original data for AI components
        setOriginalData(processedData);
        
        // Transform data to presidential dashboard format
        const presidentialData = transformToPresidentialFormat(processedData);
        setData(presidentialData);
        
        // Set initial alerts from the data
        if (presidentialData.alerts && presidentialData.alerts.length > 0) {
          setAlerts(presidentialData.alerts);
          if (presidentialData.alerts.some(alert => alert.severity === 'critical')) {
            setShowAlert(true);
          }
        }
      } catch (error) {
        console.error('Error loading presidential data:', error);
        // Set default data on error
        setData({
          total_mentions: 0,
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
          alerts: [],
          top_concerns: [],
          media_bias: [],
          avg_response_time: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      loadPresidentialData();
    }

    // Set up periodic data refresh (every 5 minutes)
    const refreshInterval = setInterval(() => {
      if (accessToken) {
        loadPresidentialData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [accessToken]);

  const transformToPresidentialFormat = (processedData) => {
    const { rawData, metrics } = processedData;
    
    // Calculate sentiment distribution
    const sentimentDistribution = {
      positive: parseFloat(metrics.positivePercentage) || 0,
      negative: parseFloat(metrics.negativePercentage) || 0,
      neutral: parseFloat(metrics.neutralPercentage) || 0
    };

    // Debug logging to understand the metrics
    console.log('DataService Metrics:', {
      totalMentions: metrics.totalMentions,
      positiveMentions: metrics.positiveMentions,
      negativeMentions: metrics.negativeMentions,
      neutralMentions: metrics.neutralMentions,
      positivePercentage: metrics.positivePercentage,
      negativePercentage: metrics.negativePercentage,
      neutralPercentage: metrics.neutralPercentage
    });

    console.log('Transformed Sentiment Distribution:', sentimentDistribution);
    
    // Check if the transformation is causing issues
    console.log('Raw metrics percentages:', {
      positive: metrics.positivePercentage,
      negative: metrics.negativePercentage,
      neutral: metrics.neutralPercentage
    });
    
    console.log('Parsed floats:', {
      positive: parseFloat(metrics.positivePercentage),
      negative: parseFloat(metrics.negativePercentage),
      neutral: parseFloat(metrics.neutralPercentage)
    });
    
    // Check if the data is being transformed correctly
    console.log('Final sentiment distribution for ExecutiveSummary:', sentimentDistribution);
    
    // Verify the percentages add up correctly
    const totalPercent = sentimentDistribution.positive + sentimentDistribution.negative + sentimentDistribution.neutral;
    console.log('Total percentage check:', totalPercent);
    
    // Check if there's any data corruption
    if (totalPercent !== 100) {
      console.error('WARNING: Percentages do not add up to 100%:', totalPercent);
    }

    // Generate alerts based on sentiment analysis
    const alerts = [];
    if (metrics.negativePercentage > 60) {
      alerts.push({
        id: 1,
        severity: 'critical',
        message: `High negative sentiment detected: ${metrics.negativePercentage}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (metrics.totalMentions > 1000) {
      alerts.push({
        id: 2,
        severity: 'info',
        message: `High volume of mentions detected: ${metrics.totalMentions}`,
        timestamp: new Date().toISOString()
      });
    }

    // Extract top concerns from text content
    const topConcerns = [];
    const topicKeywords = [
      'fuel subsidy', 'economy', 'security', 'infrastructure', 'education',
      'healthcare', 'corruption', 'unemployment', 'inflation', 'foreign policy',
      'agriculture', 'technology', 'youth', 'women', 'poverty', 'electricity',
      'roads', 'railway', 'airport', 'port', 'refinery', 'petroleum'
    ];

    topicKeywords.forEach(topic => {
      const topicMentions = rawData.filter(record => {
        const text = (record.text || '').toLowerCase();
        const title = (record.title || '').toLowerCase();
        return text.includes(topic.toLowerCase()) || title.includes(topic.toLowerCase());
      });

      if (topicMentions.length > 0) {
        const avgSentiment = topicMentions.reduce((sum, record) => {
          return sum + (parseFloat(record.sentiment_score) || 0);
        }, 0) / topicMentions.length;

        topConcerns.push({
          topic: topic,
          mentions: topicMentions.length,
          avg_sentiment: avgSentiment
        });
      }
    });

    // Sort by mentions and take top 5
    topConcerns.sort((a, b) => b.mentions - a.mentions);
    const topConcernsFinal = topConcerns.slice(0, 5);

    // Analyze media bias from source data
    const sourceSentimentData = DataService.getSourceSentimentData(rawData);
    const mediaBias = sourceSentimentData.slice(0, 10).map(source => ({
      source: source.source,
      bias_level: parseFloat(source.avgSentiment) > 0.3 ? 'Supportive' : 
                  parseFloat(source.avgSentiment) < -0.3 ? 'Critical' : 'Neutral',
      coverage_count: source.total
    }));

    return {
      total_mentions: metrics.totalMentions,
      sentiment_distribution: sentimentDistribution,
      alerts: alerts,
      top_concerns: topConcernsFinal,
      media_bias: mediaBias,
      avg_response_time: 2.3, // Mock value
      raw_data: rawData
    };
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      const processedData = await DataService.loadData(accessToken);
      
      // Store original data for AI components
      setOriginalData(processedData);
      
      const presidentialData = transformToPresidentialFormat(processedData);
      setData(presidentialData);
      
      // Update alerts from the refreshed data
      if (presidentialData.alerts && presidentialData.alerts.length > 0) {
        setAlerts(presidentialData.alerts);
        if (presidentialData.alerts.some(alert => alert.severity === 'critical')) {
          setShowAlert(true);
        }
      }
    } catch (error) {
      console.error('Error refreshing presidential data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTabConfig = () => {
    const baseTabs = [
      {
        label: 'Executive Summary',
        icon: <DashboardIcon />,
        component: <ExecutiveSummary data={data} loading={loading} onRefresh={handleRefresh} />
      }
    ];

    // Add role-specific tabs
    if (userRole === 'president') {
      baseTabs.push(
        {
          label: 'Policy Impact',
          icon: <PolicyIcon />,
          component: <PolicyImpactTracker data={data} loading={loading} />
        },
        {
          label: 'AI Summary',
          icon: <SummarizeIcon />,
          component: <AutoSummary data={originalData} />
        }
      );
    }

    if (userRole === 'media_team') {
      baseTabs.push(
        {
          label: 'Media Overview',
          icon: <DashboardIcon />,
          component: <MediaSourcesOverview />
        },
        {
          label: 'Top Newspapers',
          icon: <NewspaperIcon />,
          component: <TopNewspapers />
        },
        {
          label: 'Top Television',
          icon: <TvIcon />,
          component: <TopTelevision />
        },
        {
          label: 'Top Twitter',
          icon: <TwitterIcon />,
          component: <TopTwitter />
        },
        {
          label: 'Media Bias',
          icon: <NewspaperIcon />,
          component: <MediaBiasTracker data={data} loading={loading} />
        },
        {
          label: 'AI Summary',
          icon: <SummarizeIcon />,
          component: <AutoSummary data={originalData} />
        },
        {
          label: 'Emotional Spectrum',
          icon: <PsychologyIcon />,
          component: <EmotionalSpectrum data={originalData} />
        }
      );
    }

    if (userRole === 'policy_analyst' || userRole === 'admin') {
      baseTabs.push(
        {
          label: 'Media Overview',
          icon: <DashboardIcon />,
          component: <MediaSourcesOverview />
        },
        {
          label: 'Top Newspapers',
          icon: <NewspaperIcon />,
          component: <TopNewspapers />
        },
        {
          label: 'Top Television',
          icon: <TvIcon />,
          component: <TopTelevision />
        },
        {
          label: 'Top Twitter',
          icon: <TwitterIcon />,
          component: <TopTwitter />
        },
        {
          label: 'Media Bias',
          icon: <NewspaperIcon />,
          component: <MediaBiasTracker data={data} loading={loading} />
        },
        {
          label: 'Detailed Analytics',
          icon: <TrendingUpIcon />,
          component: <SentimentOverview />
        },
        {
          label: 'Contextual Analysis',
          icon: <PolicyIcon />,
          component: <ContextualSentimentAnalysis data={data} userRole={userRole} />
        },
        {
          label: 'Geographical Impact',
          icon: <LocationIcon />,
          component: <GeographicalDistribution data={data} userRole={userRole} />
        }
      );
    }

    if (userRole === 'policy_analyst' || userRole === 'admin') {
      baseTabs.push(
        {
          label: 'Source Analysis',
          icon: <NewspaperIcon />,
          component: <SentimentBySource />
        },
        {
          label: 'Raw Data',
          icon: <Info />,
          component: <SentimentTable />
        }
      );
    }

    return baseTabs;
  };

  const tabs = getTabConfig();

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Warning color="error" />;
      case 'warning': return <Info color="warning" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            width: 240,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              pointerEvents: 'none',
            }
          }
        }}
      >
        <Box sx={{ 
          p: 2,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <Typography 
            variant="h6" 
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1a2035 0%, #2d3748 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px'
            }}
          >
            Leader's Dashboard
          </Typography>
        </Box>
        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <List sx={{ background: 'transparent' }}>
          {tabs.map((tab, index) => (
            <ListItem
              key={index}
              button
              selected={activeTab === index}
              onClick={() => {
                setActiveTab(index);
                setDrawerOpen(false);
              }}
              sx={{
                margin: '4px 8px',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  }
                },
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.05)',
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: activeTab === index ? '#6366f1' : 'rgba(0,0,0,0.7)',
                transition: 'color 0.3s ease'
              }}>
                {tab.icon}
              </ListItemIcon>
              <ListItemText 
                primary={tab.label} 
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: activeTab === index ? 600 : 500,
                    color: activeTab === index ? '#6366f1' : 'rgba(0,0,0,0.8)',
                    transition: 'all 0.3s ease'
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Desktop Tabs */}
        {!isMobile && (
          <Box sx={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            backdropFilter: 'blur(15px)',
            borderBottom: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              pointerEvents: 'none',
            }
          }}>
            <Container maxWidth="xl" sx={{ px: 0 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 64,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    color: 'rgba(0,0,0,0.7)',
                    fontWeight: 500,
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': {
                      color: '#6366f1',
                      fontWeight: 600,
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '8px 8px 0 0',
                      backdropFilter: 'blur(10px)',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.05)',
                      color: '#6366f1',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#6366f1',
                    height: '3px',
                    borderRadius: '2px',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }
                }}
              >
                {tabs.map((tab, index) => (
                  <Tab
                    key={index}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        {tab.icon}
                        {tab.label}
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Container>
          </Box>
        )}

        {/* Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          minHeight: '100vh',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
            pointerEvents: 'none',
          }
        }}>
          <Container maxWidth="xl" sx={{ py: 3, pl: 0, pr: 0, position: 'relative', zIndex: 1 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {tabs[activeTab]?.component}
              </motion.div>
            </AnimatePresence>
          </Container>
        </Box>
      </Box>

      {/* Alert Snackbar */}
      <Snackbar
        open={showAlert}
        autoHideDuration={6000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowAlert(false)}
          severity={alerts[0]?.severity || 'info'}
          icon={getAlertIcon(alerts[0]?.severity)}
          sx={{ width: '100%' }}
        >
          {alerts[0]?.message}
        </Alert>
      </Snackbar>

      {/* Critical Alert Banner */}
      {alerts.some(alert => alert.severity === 'critical') && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            py: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              pointerEvents: 'none',
            }
          }}
        >
          <Warning sx={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          <Typography 
            variant="body2" 
            fontWeight="bold"
            sx={{
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              letterSpacing: '0.5px'
            }}
          >
            CRITICAL ALERT: Immediate attention required
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PresidentialDashboard; 