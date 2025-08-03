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
  Psychology as PsychologyIcon,
  Tv as TvIcon,
  LocationOn as LocationIcon
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
import PresidentialEmotionalSpectrum from './PresotionalSpectrum';
import ContextualSentimentAnalysis from './ContextualSentimentAnalysis';
import GeographicalDistribution from './GeographicalDistribution';

// Import existing components for detailed views
import SentimentOverview from '../../components/SentimentOverview';
import SentimentBySource from '../../components/SentimentBySource';
import SentimentTable from '../../components/SentimentTable';

// Import data service
import DataService from '../../services/DataService';

const PresidentialDashboard = ({ userRole = 'president' }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Load real data from the data service
    const loadPresidentialData = async () => {
      try {
        setLoading(true);
        const processedData = await DataService.loadData();
        
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

    loadPresidentialData();

    // Set up periodic data refresh (every 5 minutes)
    const refreshInterval = setInterval(loadPresidentialData, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

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
      const processedData = await DataService.loadData();
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
          label: 'Emotional Spectrum',
          icon: <PsychologyIcon />,
          component: <PresidentialEmotionalSpectrum data={data} userRole={userRole} />
        }
      );
    }

    if (userRole === 'media_team' || userRole === 'policy_analyst' || userRole === 'admin') {
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
          label: 'Emotional Spectrum',
          icon: <PsychologyIcon />,
          component: <PresidentialEmotionalSpectrum data={data} userRole={userRole} />
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
          '& .MuiDrawer-paper': { width: 240 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" color="primary">
            Presidential Dashboard
          </Typography>
        </Box>
        <Divider />
        <List>
          {tabs.map((tab, index) => (
            <ListItem
              key={index}
              button
              selected={activeTab === index}
              onClick={() => {
                setActiveTab(index);
                setDrawerOpen(false);
              }}
            >
              <ListItemIcon>{tab.icon}</ListItemIcon>
              <ListItemText primary={tab.label} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Nigeria Presidential Sentiment Dashboard
            </Typography>

            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={userRole.replace('_', ' ').toUpperCase()}
                color="secondary"
                size="small"
              />
              <IconButton color="inherit">
                <NotificationsIcon />
              </IconButton>
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
              <IconButton color="inherit">
                <AccountCircle />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Desktop Tabs */}
        {!isMobile && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Container maxWidth="xl">
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 64,
                    textTransform: 'none',
                    fontSize: '0.9rem'
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
        <Box sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
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
            bgcolor: 'error.main',
            color: 'white',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <Warning />
          <Typography variant="body2" fontWeight="bold">
            CRITICAL ALERT: Immediate attention required
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PresidentialDashboard; 