import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Box, 
  Typography, 
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Paper,
  useScrollTrigger,
  Zoom,
  Fab,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  styled,
  Drawer,
  Divider,
  Menu,
  useMediaQuery,
  Button
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Favorite as FavoriteIcon,
  ThumbDown as ThumbDownIcon,
  StackedLineChart as StackedLineChartIcon,
  Dashboard as DashboardIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Public as PublicIcon,
  Language as LanguageIcon,
  Analytics as AnalyticsIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  Event as EventIcon,
  TableChart as TableChartIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Share as ShareIcon,
  AutoAwesome as AutoAwesomeIcon,
  CompareArrows as CompareArrowsIcon,
  MoreVert as MoreVertIcon,
  AccountCircle,
  ArrowDropDown,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Import components
import Layout from './components/layout/Layout';
import MetricCard from './components/MetricCard';
import MentionLineChart from './components/MentionLineChart';
import SentimentLineChart from './components/SentimentLineChart';
import PlatformBarChart from './components/PlatformBarChart';
import SentimentTable from './components/SentimentTable';
import SentimentData from './components/SentimentData';
import SentimentDataPage from './components/SentimentDataPage';
import CountryFilter from './components/CountryFilter';
import CountryBarChart from './components/CountryBarChart';
import SentimentOverview from './components/SentimentOverview';
import SentimentBySource from './components/SentimentBySource';
import GeographicalInsights from './components/GeographicalInsights';
import ThemeAnalysis from './components/ThemeAnalysis';
import EmotionalAnalysis from './components/EmotionalAnalysis';
import EventAnalysis from './components/EventAnalysis';
import PDFExportButton from './components/PDFExportButton';
import ComparisonReport from './components/ComparisonReport';
import LanguageSwitcher from './components/LanguageSwitcher';
import EmailConfig from './components/EmailConfig';
import TargetIndividualConfig from './components/TargetIndividualConfig';
import { ProfilePage } from './components/Profile/ProfilePage.tsx';

// Import Presidential Dashboard
import PresidentialDashboard from './presidential-dashboard/components/PresidentialDashboard';
import TestComponent from './presidential-dashboard/components/TestComponent';

// Import our new advanced NLP & AI components
import EntityRelationshipGraph from './components/EntityRelationshipGraph';
import ContextualSentiment from './components/ContextualSentiment';
import AutoSummary from './components/AutoSummary';
import EmotionalSpectrum from './components/EmotionalSpectrum';

// Import services
import DataService from './services/DataService';

// Import language provider
import { LanguageProvider } from './contexts/LanguageContext';

// Import Auth context and page
import { useAuth } from './contexts/AuthContext.tsx';
import { AuthPage } from './components/Auth/AuthPage.tsx';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 72;
const MAX_DAILY_POINTS = 90; // Threshold for switching to weekly aggregation
const MAX_WEEKLY_POINTS = 180; // Threshold for switching to monthly aggregation

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a2035',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a2035',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a2035',
          color: '#ffffff',
          width: DRAWER_WIDTH,
          borderRight: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
  },
});

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0, 3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0, 1.5),
  }
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  backgroundColor: '#fff',
  borderBottom: '1px solid #e0e0e0',
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(10),
  width: '100%',
  boxSizing: 'border-box',
  overflowX: 'hidden',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(9),
  }
}));

const MainContent = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginLeft: 0,
    },
    [theme.breakpoints.up('md')]: {
      width: `calc(100% - ${open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px)`
    }
  }),
);

const Sidebar = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      backgroundColor: '#1a2035',
      color: '#ffffff',
      overflowX: 'hidden',
    },
  }),
);

const SidebarContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 2),
  '& .MuiListItemIcon-root': {
    color: '#ffffff',
    minWidth: 40,
  },
  '& .MuiListItemText-primary': {
    color: '#ffffff',
  },
}));

const DrawerHeader = styled(Box)(({ theme }) => ({
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1),
}));

const menuItems = (t) => [
  { text: t('general.dashboard'), icon: <DashboardIcon />, path: '/' },
  { text: t('analysis.sentimentAnalysis'), icon: <TimelineIcon />, path: '/sentiment' },
  { text: t('app.sentimentData'), icon: <TableChartIcon />, path: '/sentiment-data' },
  { text: t('analysis.geographicalInsights'), icon: <LanguageIcon />, path: '/geographic' },
  { text: t('general.analytics'), icon: <AnalyticsIcon />, path: '/analytics' },
  { text: t('general.settings'), icon: <SettingsIcon />, path: '/settings' },
];

// Scroll to top button
function ScrollToTop(props) {
  const { children } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      '#back-to-top-anchor',
    );

    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        {children}
      </Box>
    </Zoom>
  );
}

// Section header component
const SectionHeader = ({ title }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {t(title)}
      </Typography>
      <Divider />
    </Box>
  );
};

// Loading spinner animation
const LoadingAnimation = () => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        scale: [1, 1.2, 1],
        rotate: [0, 360]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        repeatType: "loop"
      }}
    >
      <CircularProgress size={60} />
    </motion.div>
  );
};

// Add this function after the menuItems definition
const scrollToSection = (e, id) => {
  e.preventDefault();
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};

function App() {
  const { t } = useTranslation();
  const { session, user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [filteredData, setFilteredData] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState(null);
  const [aggregationPeriod, setAggregationPeriod] = useState('day'); // 'day', 'week', or 'month'
  
  // Mobile menu handlers
  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };
  
  const mobileMenuOpen = Boolean(mobileMenuAnchorEl);
  
  // Profile menu handlers
  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchorEl(null);
  };
  
  // Close drawer by default on mobile when screen size changes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
    }
  }, [isMobile]);
  
  useEffect(() => {
    if (!session) {
       setLoading(false);
       return;
    } 
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await DataService.loadData(session.access_token);
        console.log('Data loaded:', result);
        setData(result);
        setFilteredData(result);
        
        // Add a small delay to ensure animations are seen
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [session, selectedCountry, timeRange]);
  
  // Apply filters when selected country or time range changes
  useEffect(() => {
    if (!data) return;
    
    console.log('Filtering data for country:', selectedCountry, 'and time range:', timeRange);
    
    // First filter by country
    let filteredRawData = selectedCountry === 'all' 
      ? data.rawData 
      : DataService.filterDataByCountry(data.rawData, selectedCountry);

    // Then filter by time range
    filteredRawData = DataService.filterDataByTimeRange(filteredRawData, timeRange);
    
    console.log('Filtered raw data:', filteredRawData);
    
    // Decide on aggregation based on data density
    let currentMentionsByDate, currentSentimentByDate;
    let currentAggregationPeriod = 'day';
    const dates = filteredRawData.map(item => DataService.ensureValidDate(item.date)).filter(Boolean);
    const uniqueDays = new Set(dates).size;

    if (uniqueDays > MAX_WEEKLY_POINTS) {
      currentAggregationPeriod = 'month';
      console.log(`Aggregating data by ${currentAggregationPeriod} (${uniqueDays} days > ${MAX_WEEKLY_POINTS})`);
      currentMentionsByDate = DataService.aggregateMentionsByPeriod(filteredRawData, currentAggregationPeriod);
      currentSentimentByDate = DataService.aggregateSentimentByPeriod(filteredRawData, currentAggregationPeriod);
    } else if (uniqueDays > MAX_DAILY_POINTS) {
        currentAggregationPeriod = 'week';
        console.log(`Aggregating data by ${currentAggregationPeriod} (${uniqueDays} days > ${MAX_DAILY_POINTS})`);
        currentMentionsByDate = DataService.aggregateMentionsByPeriod(filteredRawData, currentAggregationPeriod);
        currentSentimentByDate = DataService.aggregateSentimentByPeriod(filteredRawData, currentAggregationPeriod);
    } else {
        console.log(`Using daily data (${uniqueDays} days <= ${MAX_DAILY_POINTS})`);
        currentMentionsByDate = DataService.getMentionsByDate(filteredRawData);
        currentSentimentByDate = DataService.getSentimentByDate(filteredRawData);
    }
    setAggregationPeriod(currentAggregationPeriod);
    
    // Recalculate other metrics and charts with filtered data
    const metrics = DataService.calculateMetrics(filteredRawData);
    const topSentiment = DataService.getTopSentiment(filteredRawData, 5);
    const bottomSentiment = DataService.getBottomSentiment(filteredRawData, 5);
    const mentionsByPlatform = DataService.getMentionsByPlatform(filteredRawData);
    const mentionsByCountry = DataService.getMentionsByCountry(filteredRawData);
    const sourceSentimentData = DataService.getSourceSentimentData(filteredRawData);
    
    setFilteredData({
      ...data,
      rawData: filteredRawData,
      metrics,
      mentionsByDate: currentMentionsByDate,
      sentimentByDate: currentSentimentByDate,
      topSentiment,
      bottomSentiment,
      mentionsByPlatform,
      mentionsByCountry,
      sourceSentimentData
    });
  }, [selectedCountry, timeRange, data]);
  
  const handleCountryChange = (country) => {
    setSelectedCountry(country.toLowerCase());
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }
  
  if (!session) {
    return (
       <ThemeProvider theme={theme}>
         <CssBaseline />
         <AuthPage />
       </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <CssBaseline />
        <Box sx={{ display: 'flex',width: '100%',minHeight: '100vh', margin: 0, padding: 0 }}>
          {/* Sidebar - use temporary variant on mobile */}
          {isMobile ? (
            <Drawer
              variant="temporary"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  backgroundColor: '#1a2035',
                  color: '#ffffff',
                },
              }}
            >
              <Layout 
                isDrawerOpen={true} 
                handleDrawerToggle={() => setDrawerOpen(false)}
                selectedPath={window.location.pathname}
              />
            </Drawer>
          ) : (
            <Layout 
              isDrawerOpen={drawerOpen} 
              handleDrawerToggle={toggleDrawer}
              selectedPath={window.location.pathname}
            />
          )}
          
          <MainContent open={drawerOpen}>
            <Box component="main" sx={{ flexGrow: 1, p: 0, width: '100%', overflowX: 'hidden' }}>
              <AppBar 
                position="fixed" 
                color="default" 
                elevation={0}
                sx={{ 
                  backgroundColor: 'white',
                  borderBottom: '1px solid #e0e0e0',
                  zIndex: (theme) => theme.zIndex.drawer - 1,
                  transition: theme.transitions.create(['width', 'margin'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                  }),
                  width: isMobile ? '100%' : (drawerOpen ? 
                    `calc(100% - ${DRAWER_WIDTH}px)` : 
                    `calc(100% - ${COLLAPSED_DRAWER_WIDTH}px)`)
                }}
              >
                <StyledToolbar>
                  <Box display="flex" alignItems="center">
                    <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={toggleDrawer}
                      sx={{
                        mr: 2,
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                      {t('general.dashboard')}
                    </Typography>
                  </Box>
                  
                  {/* Desktop header buttons */}
                  {!isMobile ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <LanguageSwitcher variant="header" />
                      <Button
                        color="inherit"
                        aria-label="account of current user"
                        aria-controls={'primary-profile-menu'}
                        aria-haspopup="true"
                        onClick={handleProfileMenuOpen}
                        startIcon={<AccountCircle />}
                        endIcon={<ArrowDropDown />}
                        sx={{ textTransform: 'none', ml: 1 }}
                      >
                        {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Account'}
                      </Button>
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="center">
                      <LanguageSwitcher variant="header" />
                      <IconButton
                        color="inherit"
                        aria-label="more options"
                        onClick={handleMobileMenuOpen}
                        aria-controls={mobileMenuOpen ? 'mobile-menu' : undefined}
                        aria-haspopup="true"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  )}
                </StyledToolbar>
              </AppBar>
              
              {/* Profile Menu (Desktop) */}
              <Menu
                id="primary-profile-menu"
                anchorEl={profileMenuAnchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(profileMenuAnchorEl)}
                onClose={handleProfileMenuClose}
                sx={{ mt: '45px' }}
              >
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/'); }}>{t('general.dashboard')}</MenuItem>
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>{t('general.profile')}</MenuItem>
                <MenuItem onClick={() => { handleProfileMenuClose(); signOut(); }}>{t('general.logout')}</MenuItem>
              </Menu>
              
              {/* Mobile Menu */}
              <Menu
                id="mobile-menu"
                anchorEl={mobileMenuAnchorEl}
                open={mobileMenuOpen}
                onClose={handleMobileMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: { width: '300px', maxWidth: '90vw', mt: 1.5 }
                }}
              >
                <Box sx={{ p: 1.5, pb: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('general.language')}
                  </Typography>
                  <LanguageSwitcher variant="header" />
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('general.export')}
                  </Typography>
                  <PDFExportButton 
                    title={`${window.location.pathname === '/sentiment' ? 'Sentiment Analysis' : 'Sentiment Analysis Dashboard'} Export`} 
                  />
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('filters.country')}
                  </Typography>
                  <CountryFilter 
                    selectedCountry={selectedCountry} 
                    onCountryChange={(country) => {
                      handleCountryChange(country);
                      handleMobileMenuClose();
                    }} 
                  />
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('filters.timeRange')}
                  </Typography>
                  <FormControl variant="outlined" size="small" sx={{ width: '100%' }}>
                    <InputLabel id="mobile-time-range-label">{t('filters.timeRange')}</InputLabel>
                    <Select
                      labelId="mobile-time-range-label"
                      id="mobile-time-range"
                      value={timeRange}
                      onChange={(e) => {
                        handleTimeRangeChange(e);
                        handleMobileMenuClose();
                      }}
                      label={t('filters.timeRange')}
                    >
                      <MenuItem value="all">{t('filters.allTime')}</MenuItem>
                      <MenuItem value="7d">{t('filters.last7Days')}</MenuItem>
                      <MenuItem value="30d">{t('filters.last30Days')}</MenuItem>
                      <MenuItem value="90d">{t('filters.last90Days')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <MenuItem onClick={() => { handleMobileMenuClose(); navigate('/profile'); }}>Profile</MenuItem>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={() => { handleMobileMenuClose(); signOut(); }}>Logout</MenuItem>
              </Menu>
              
              <ContentContainer>
                <Routes>
                  <Route path="/" element={
                    loading ? (
                      <LoadingAnimation />
                    ) : error ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="error">{error}</Typography>
                      </Box>
                    ) : (
                      <Grid container spacing={3} sx={{ maxWidth: '100%' }}>
                        {/* Dashboard Overview */}
                        <Grid item xs={12} id="dashboard">
                          <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
                            <Typography variant="h5" gutterBottom>
                              {t('general.dashboardOverview')}
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={3}>
                                <MetricCard
                                  title={t('metrics.totalMentions')}
                                  value={filteredData?.metrics?.totalMentions || 0}
                                  trend={+5.2}
                                />
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <MetricCard
                                  title={t('metrics.positiveSentiment')}
                                  value={`${filteredData?.metrics?.positivePercentage || 0}%`}
                                  trend={+2.1}
                                  color="success"
                                />
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <MetricCard
                                  title={t('metrics.negativeSentiment')}
                                  value={`${filteredData?.metrics?.negativePercentage || 0}%`}
                                  trend={-1.5}
                                  color="error"
                                />
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <MetricCard
                                  title={t('metrics.engagementRate')}
                                  value={`${filteredData?.metrics?.presenceScore || 0}%`}
                                  trend={+3.7}
                                  color="info"
                                />
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>

                        {/* Sentiment Overview */}
                        <Grid item xs={12} md={6} id="sentiment-overview">
                          <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                            <SentimentOverview data={filteredData} />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                            <SentimentBySource data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Mentions & Trends */}
                        <Grid item xs={12} id="mentions-trends">
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                              <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                                <MentionLineChart mentionsByDate={filteredData?.mentionsByDate} aggregationPeriod={aggregationPeriod} />
                              </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                                <SentimentLineChart sentimentByDate={filteredData?.sentimentByDate} aggregationPeriod={aggregationPeriod} />
                              </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                                <PlatformBarChart mentionsByPlatform={filteredData?.mentionsByPlatform} />
                              </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
                                <CountryBarChart mentionsByCountry={filteredData?.mentionsByCountry} />
                              </Paper>
                            </Grid>
                          </Grid>
                        </Grid>



                        {/* Theme Analysis */}
                        <Grid item xs={12} id="theme-analysis">
                          <Paper elevation={0} sx={{ p: 2 }}>
                            <ThemeAnalysis data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Emotional Analysis */}
                        <Grid item xs={12} id="emotional-analysis">
                          <Paper elevation={0} sx={{ p: 2 }}>
                            <EmotionalAnalysis data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Event Analysis */}
                        <Grid item xs={12} id="event-analysis">
                          <Paper elevation={0} sx={{ p: 2 }}>
                            <EventAnalysis data={filteredData} />
                          </Paper>
                        </Grid>



                        {/* Geographical Insights */}
                        <Grid item xs={12} id="geographical-insights">
                          <Paper elevation={0} sx={{ p: 2 }}>
                            <GeographicalInsights data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Divider for Advanced AI Features */}
                        <Grid item xs={12} id="ai-features">
                          <Paper elevation={0} sx={{ p: 2, mb: 2, mt: 2, bgcolor: 'primary.main', color: 'white' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AutoAwesomeIcon sx={{ mr: 1 }} />
                              <Typography variant="h5">{t('app.advancedAIPoweredAnalysis')}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                              {t('app.exploreDeepInsights')}
                            </Typography>
                          </Paper>
                        </Grid>

                        {/* Advanced AI Features Section */}
                        <Grid item xs={12} sx={{ mt: 4 }}>
                          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                            {t('app.advancedAIFeatures')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {t('app.aiPoweredAdvancedAnalysis')}
                          </Typography>
                        </Grid>

                        {/* Auto Summary */}
                        <Grid item xs={12} md={12} lg={12} sx={{ mb: 3 }}>
                          <Paper 
                            elevation={0} 
                            sx={{ p: 3, borderRadius: 2 }}
                            id="auto-summary"
                          >
                            <AutoSummary data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Entity Relationship Graph */}
                        <Grid item xs={12} md={12} lg={12} sx={{ mb: 3 }}>
                          <Paper 
                            elevation={0} 
                            sx={{ p: 3, borderRadius: 2 }}
                            id="entity-relationship"
                          >
                            <EntityRelationshipGraph data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Contextual Sentiment */}
                        <Grid item xs={12} md={12} lg={12} sx={{ mb: 3 }}>
                          <Paper 
                            elevation={0} 
                            sx={{ p: 3, borderRadius: 2 }}
                            id="contextual-sentiment"
                          >
                            <ContextualSentiment data={filteredData} />
                          </Paper>
                        </Grid>

                        {/* Emotional Spectrum */}
                        <Grid item xs={12} md={12} lg={12} sx={{ mb: 5 }}>
                          <Paper 
                            elevation={0} 
                            sx={{ p: 3, borderRadius: 2 }}
                            id="emotional-spectrum"
                          >
                            <EmotionalSpectrum 
                              data={filteredData} 
                              timeRange={timeRange}
                              onTimeRangeChange={setTimeRange}
                            />
                          </Paper>
                        </Grid>
                      </Grid>
                    )
                  } />
                  <Route path="/sentiment-data" element={<SentimentDataPage data={filteredData?.rawData || []} />} />
                  <Route path="/emotional-analysis" element={<EmotionalAnalysis />} />
                  <Route path="/geographical-insights" element={<GeographicalInsights />} />
                  <Route path="/theme-analysis" element={<ThemeAnalysis />} />
                  <Route path="/event-analysis" element={<EventAnalysis />} />
                  <Route path="/auto-summary" element={<AutoSummary />} />
                  <Route path="/comparison-report" element={<ComparisonReport />} />
                  <Route path="/email-config" element={<EmailConfig />} />
                  <Route path="/target-config" element={<TargetIndividualConfig />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  
                  {/* Presidential Dashboard Routes */}
                  <Route path="/presidential" element={<PresidentialDashboard userRole="president" />} />
                  <Route path="/media-team" element={<PresidentialDashboard userRole="media_team" />} />
                  <Route path="/policy-analyst" element={<PresidentialDashboard userRole="policy_analyst" />} />
                  <Route path="/admin" element={<PresidentialDashboard userRole="admin" />} />
                  <Route path="/test-presidential" element={<TestComponent />} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ContentContainer>
            </Box>
          </MainContent>
        </Box>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
