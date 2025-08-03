import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  styled,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
  Share as ShareIcon,
  Summarize as SummarizeIcon,
  CompareArrows as CompareArrowsIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  NotificationImportant as NotificationIcon,
  AccountCircle as AccountCircleIcon,
  Group as GroupIcon,
  Analytics as AnalyticsIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import LanguageSwitcher from '../LanguageSwitcher';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 72;

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: '#1a2035',
    color: '#ffffff',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    borderRight: 'none',
    boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
  },
}));

const Logo = styled(Box)(({ theme, open }) => ({
  padding: open ? '20px 16px' : '20px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: open ? 'space-between' : 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  display: 'block',
  padding: 0,
  marginBottom: theme.spacing(0.5),
}));

const StyledListItemIcon = styled(ListItemIcon)(({ theme, open }) => ({
  minWidth: 0,
  marginRight: open ? theme.spacing(2) : 'auto',
  justifyContent: 'center',
  marginRight: 0
}));

const Sidebar = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Update the menu items to include AI-powered features
  const menuItems = [
    { text: t('sidebar.dashboard'), icon: <DashboardIcon sx={{ color: 'white' }} />, path: '/' },
    { text: t('sidebar.sentimentData'), icon: <TableChartIcon sx={{ color: 'white' }} />, path: '/sentiment-data' },
    { text: t('sidebar.comparisonReport'), icon: <CompareArrowsIcon sx={{ color: 'white' }} />, path: '/comparison-report' },
    { text: t('sidebar.emailConfig'), icon: <NotificationIcon sx={{ color: 'white' }} />, path: '/email-config' },
    { text: t('sidebar.targetConfig'), icon: <SettingsIcon sx={{ color: 'white' }} />, path: '/target-config' },
  ];

  // Presidential Dashboard menu items
  const presidentialMenuItems = [
    { text: 'President View', icon: <AccountCircleIcon sx={{ color: 'white' }} />, path: '/presidential' },
    { text: 'Media Team', icon: <GroupIcon sx={{ color: 'white' }} />, path: '/media-team' },
    { text: 'Policy Analyst', icon: <AnalyticsIcon sx={{ color: 'white' }} />, path: '/policy-analyst' },
    { text: 'Admin Panel', icon: <AdminIcon sx={{ color: 'white' }} />, path: '/admin' },
  ];

  // Add the new AI-powered menu items
  const aiMenuItems = [
    { text: t('sidebar.aiSummary'), icon: <SummarizeIcon sx={{ color: 'white' }} />, path: '/#auto-summary' },
    { text: t('sidebar.entityRelationships'), icon: <ShareIcon sx={{ color: 'white' }} />, path: '/#entity-relationship' },
    { text: t('sidebar.contextualSentiment'), icon: <AutoAwesomeIcon sx={{ color: 'white' }} />, path: '/#contextual-sentiment' },
    { text: t('sidebar.emotionalSpectrum'), icon: <PsychologyIcon sx={{ color: 'white' }} />, path: '/#emotional-spectrum' },
  ];
  
  // Check if current page is dashboard
  const isDashboardPage = location.pathname === '/';
  
  return (
    <StyledDrawer variant="permanent" open={isOpen}>
      <Logo open={isOpen}>
        {isOpen ? (
          <>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {t('sidebar.title')}
            </Typography>
            <IconButton 
              onClick={onToggle}
              sx={{ 
                color: 'white',
                padding: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </>
        ) : (
          <IconButton 
            onClick={onToggle}
            sx={{ 
              color: 'white',
              padding: '4px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Logo>
      <List sx={{ mt: 1, px: 1 }}>
        {menuItems.map((item) => (
          <StyledListItem key={item.text} disablePadding>
            <Tooltip 
              title={!isOpen ? item.text : ''} 
              placement="right"
              arrow
            >
              <ListItemButton 
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: isOpen ? 'initial' : 'center',
                  px: 2.5,
                  borderRadius: '8px',
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isOpen ? 2 : 'auto',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {isOpen && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </StyledListItem>
        ))}
        
        {/* Presidential Dashboard Section */}
        <Box sx={{ px: isOpen ? 2 : 0, my: 2 }}>
          {isOpen ? (
            <Box>
              <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  mt: 1, 
                  mb: 1,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Presidential Dashboard
              </Typography>
            </Box>
          ) : (
            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          )}
        </Box>
        
        {/* Presidential Dashboard Menu Items */}
        {presidentialMenuItems.map((item) => (
          <StyledListItem key={item.text} disablePadding>
            <Tooltip 
              title={!isOpen ? item.text : ''} 
              placement="right"
              arrow
            >
              <ListItemButton 
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: isOpen ? 'initial' : 'center',
                  px: 2.5,
                  borderRadius: '8px',
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isOpen ? 2 : 'auto',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {isOpen && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </StyledListItem>
        ))}
        
        {/* Divider and AI Features - only show on dashboard page */}
        {isDashboardPage && (
          <>
            <Box sx={{ px: isOpen ? 2 : 0, my: 2 }}>
              {isOpen ? (
                <Box>
                  <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      mt: 1, 
                      mb: 1,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {t('sidebar.advancedAIFeatures')}
                  </Typography>
                </Box>
              ) : (
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              )}
            </Box>
            
            {/* AI Feature Menu Items */}
            {aiMenuItems.map((item) => (
              <StyledListItem key={item.text} disablePadding>
                <Tooltip 
                  title={!isOpen ? item.text : ''} 
                  placement="right"
                  arrow
                >
                  <ListItemButton 
                    component="a"
                    href={item.path}
                    selected={location.hash === item.path.substring(1)}
                    sx={{
                      minHeight: 48,
                      justifyContent: isOpen ? 'initial' : 'center',
                      px: 2.5,
                      borderRadius: '8px',
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.18)',
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      const targetId = item.path.split('#')[1];
                      const targetElement = document.getElementById(targetId);
                      if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isOpen ? 2 : 'auto',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {isOpen && (
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </StyledListItem>
            ))}
          </>
        )}
      </List>

      {/* Language Switcher at the bottom */}
      <Box sx={{ 
        mt: 'auto', 
        mb: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: isOpen ? 'flex-start' : 'center',
        px: isOpen ? 3 : 1
      }}>
        <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%', mb: 2 }} />
        
        {isOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSwitcher />
          </Box>
        ) : (
          <Tooltip title={t('sidebar.languageSettings')} placement="right">
            <IconButton onClick={onToggle} sx={{ color: 'white' }}>
              <LanguageIcon sx={{ fontSize: '3rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar; 
