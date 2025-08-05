import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
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
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  AccountCircle,
  ArrowDropDown,
} from '@mui/icons-material';

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Import components
import Layout from './components/layout/Layout';
import SentimentDataPage from './components/SentimentDataPage';
import CountryFilter from './components/CountryFilter';
import GeographicalInsights from './components/GeographicalInsights';
import ThemeAnalysis from './components/ThemeAnalysis';
import EmotionalAnalysis from './components/EmotionalAnalysis';
import EventAnalysis from './components/EventAnalysis';
import PDFExportButton from './components/PDFExportButton';
import LanguageSwitcher from './components/LanguageSwitcher';
import TargetIndividualConfig from './components/TargetIndividualConfig';
import { ProfilePage } from './components/Profile/ProfilePage.tsx';
import EmailConfig from './components/EmailConfig';

// Import Presidential Dashboard
import PresidentialDashboard from './presidential-dashboard/components/PresidentialDashboard';
import TestComponent from './presidential-dashboard/components/TestComponent';



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















function App() {
  const { t } = useTranslation();
  const { session, user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [filteredData, setFilteredData] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState(null);

  
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
  
  // Keep drawer closed by default on all screen sizes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(false);
    }
  }, [isMobile]);
  
  useEffect(() => {
    if (!session) {
       return;
    } 
    const fetchData = async () => {
      try {
        const result = await DataService.loadData(session.access_token);
        console.log('Data loaded:', result);
        setData(result);
        setFilteredData(result);
      } catch (error) {
        console.error('Error loading data:', error);
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
              
              

              
              <Routes>
                <Route path="/" element={<Navigate to="/presidential" replace />} />
                <Route path="/sentiment-data" element={
                  <ContentContainer>
                    <SentimentDataPage data={filteredData?.rawData || []} />
                  </ContentContainer>
                } />
                <Route path="/emotional-analysis" element={
                  <ContentContainer>
                    <EmotionalAnalysis />
                  </ContentContainer>
                } />
                <Route path="/geographical-insights" element={
                  <ContentContainer>
                    <GeographicalInsights />
                  </ContentContainer>
                } />
                <Route path="/theme-analysis" element={
                  <ContentContainer>
                    <ThemeAnalysis />
                  </ContentContainer>
                } />
                <Route path="/event-analysis" element={
                  <ContentContainer>
                    <EventAnalysis />
                  </ContentContainer>
                } />
                <Route path="/target-config" element={
                  <ContentContainer>
                    <TargetIndividualConfig />
                  </ContentContainer>
                } />
                <Route path="/profile" element={
                  <ContentContainer>
                    <ProfilePage />
                  </ContentContainer>
                } />
                <Route path="/email-config" element={
                  <ContentContainer>
                    <EmailConfig />
                  </ContentContainer>
                } />
                
                {/* Presidential Dashboard Routes - No padding */}
                <Route path="/presidential" element={<PresidentialDashboard userRole="president" />} />
                <Route path="/media-team" element={<PresidentialDashboard userRole="media_team" />} />
                <Route path="/test-presidential" element={<TestComponent />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </MainContent>
        </Box>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
