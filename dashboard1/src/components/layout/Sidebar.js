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
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Group as GroupIcon,
  Psychology as PsychologyIcon,
  Public as PublicIcon,
  Topic as TopicIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import LanguageSwitcher from '../LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext.tsx';

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 80;

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#ffffff',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.standard,
    }),
    overflowX: 'hidden',
    borderRight: 'none',
    boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderRadius: 0,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      pointerEvents: 'none',
    }
  },
}));

const Logo = styled(Box)(({ theme, open }) => ({
  padding: open ? '24px 20px' : '24px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: open ? 'space-between' : 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
  }
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  display: 'block',
  padding: 0,
  marginBottom: theme.spacing(0.75),
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ theme, isActive, open }) => ({
  minHeight: 52,
  justifyContent: open ? 'initial' : 'center',
  px: open ? 3 : 2,
  py: 1.5,
  borderRadius: '12px',
  margin: '0 8px',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isActive 
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)'
      : 'transparent',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
  },
  
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isActive 
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)'
      : 'transparent',
    borderRadius: '12px',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    '&::after': {
      opacity: 1,
    }
  },
  
  '&.Mui-selected': {
    backgroundColor: 'transparent',
    '&::before': {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%)',
    },
    '&:hover': {
      '&::before': {
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%)',
      },
    }
  },
}));

const StyledListItemIcon = styled(ListItemIcon)(({ theme, open, isActive }) => ({
  minWidth: 0,
  marginRight: open ? theme.spacing(2.5) : 'auto',
  justifyContent: 'center',
  color: isActive ? '#6366f1' : '#ffffff',
  transition: 'all 0.3s ease',
  '& .MuiSvgIcon-root': {
    fontSize: '1.4rem',
    filter: isActive ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none',
  }
}));

const StyledListItemText = styled(ListItemText)(({ theme, isActive }) => ({
  '& .MuiTypography-root': {
    fontSize: '0.9rem',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
    transition: 'all 0.3s ease',
  }
}));

const SectionDivider = styled(Box)(({ theme, open }) => ({
  padding: open ? '16px 20px 8px' : '16px 8px 8px',
  '& .MuiDivider-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: '1px',
  }
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginTop: '12px',
  marginBottom: '8px',
  paddingLeft: '4px',
}));

const Sidebar = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const location = useLocation();
  
  // Presidential Dashboard menu items
  const presidentialMenuItems = [
    { text: 'Leader\'s Dashboard', icon: <AccountCircleIcon />, path: '/presidential' },
    { text: 'Media Team', icon: <GroupIcon />, path: '/media-team' },
  ];

  // Analytics menu items
  const analyticsMenuItems = [
    { text: t('sidebar.sentimentData', 'Sentiment Data'), icon: <TableChartIcon />, path: '/sentiment-data' },
  ];

  // Settings & Profile menu items
  const settingsMenuItems = [
    { text: t('sidebar.targetConfig', 'Target Config'), icon: <SettingsIcon />, path: '/target-config' },
    { text: t('sidebar.profile', 'Profile'), icon: <PersonIcon />, path: '/profile' },
    { text: t('sidebar.emailConfig', 'Email Config'), icon: <EmailIcon />, path: '/email-config' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <StyledDrawer variant="permanent" open={isOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Logo open={isOpen}>
          {isOpen ? (
            <>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.5px'
                }}
              >
                {t('sidebar.title')}
              </Typography>
              <IconButton 
                onClick={onToggle}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    transform: 'scale(1.05)',
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
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}
        </Logo>
        
        <List sx={{ flex: 1, px: 1, py: 2 }}>
          {/* Presidential Dashboard Menu Items */}
          {presidentialMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <StyledListItem key={item.text} disablePadding>
                <Tooltip 
                  title={!isOpen ? item.text : ''} 
                  placement="right"
                  arrow
                  PopperProps={{
                    sx: {
                      '& .MuiTooltip-tooltip': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }
                    }
                  }}
                >
                  <StyledListItemButton 
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    isActive={isActive}
                    open={isOpen}
                    sx={{ position: 'relative' }}
                  >
                    <StyledListItemIcon
                      isActive={isActive}
                      open={isOpen}
                    >
                      {item.icon}
                    </StyledListItemIcon>
                    {isOpen && (
                      <StyledListItemText 
                        primary={item.text} 
                        isActive={isActive}
                      />
                    )}
                  </StyledListItemButton>
                </Tooltip>
              </StyledListItem>
            );
          })}
          
          {/* Divider */}
          <SectionDivider open={isOpen}>
            <Divider />
            {isOpen && (
              <SectionTitle>
                Analytics
              </SectionTitle>
            )}
          </SectionDivider>
          
          {/* Analytics Menu Items */}
          {analyticsMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <StyledListItem key={item.text} disablePadding>
                <Tooltip 
                  title={!isOpen ? item.text : ''} 
                  placement="right"
                  arrow
                  PopperProps={{
                    sx: {
                      '& .MuiTooltip-tooltip': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }
                    }
                  }}
                >
                  <StyledListItemButton 
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    isActive={isActive}
                    open={isOpen}
                    sx={{ position: 'relative' }}
                  >
                    <StyledListItemIcon
                      isActive={isActive}
                      open={isOpen}
                    >
                      {item.icon}
                    </StyledListItemIcon>
                    {isOpen && (
                      <StyledListItemText 
                        primary={item.text} 
                        isActive={isActive}
                      />
                    )}
                  </StyledListItemButton>
                </Tooltip>
              </StyledListItem>
            );
          })}

          {/* Divider */}
          <SectionDivider open={isOpen}>
            <Divider />
            {isOpen && (
              <SectionTitle>
                Settings & Profile
              </SectionTitle>
            )}
          </SectionDivider>
          
          {/* Settings Menu Items */}
          {settingsMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <StyledListItem key={item.text} disablePadding>
                <Tooltip 
                  title={!isOpen ? item.text : ''} 
                  placement="right"
                  arrow
                  PopperProps={{
                    sx: {
                      '& .MuiTooltip-tooltip': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }
                    }
                  }}
                >
                  <StyledListItemButton 
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    isActive={isActive}
                    open={isOpen}
                    sx={{ position: 'relative' }}
                  >
                    <StyledListItemIcon
                      isActive={isActive}
                      open={isOpen}
                    >
                      {item.icon}
                    </StyledListItemIcon>
                    {isOpen && (
                      <StyledListItemText 
                        primary={item.text} 
                        isActive={isActive}
                      />
                    )}
                  </StyledListItemButton>
                </Tooltip>
              </StyledListItem>
            );
          })}

          {/* Sign Out Button */}
          <StyledListItem disablePadding>
            <Tooltip 
              title={!isOpen ? 'Sign Out' : ''} 
              placement="right"
              arrow
              PopperProps={{
                sx: {
                  '& .MuiTooltip-tooltip': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }
                }
              }}
            >
              <StyledListItemButton 
                onClick={handleSignOut}
                open={isOpen}
                sx={{ 
                  position: 'relative',
                  color: '#ef4444',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }
                }}
              >
                <StyledListItemIcon
                  isActive={false}
                  open={isOpen}
                  sx={{ color: '#ef4444' }}
                >
                  <LogoutIcon />
                </StyledListItemIcon>
                {isOpen && (
                  <StyledListItemText 
                    primary="Sign Out" 
                    isActive={false}
                    sx={{ 
                      '& .MuiTypography-root': {
                        color: '#ef4444',
                      }
                    }}
                  />
                )}
              </StyledListItemButton>
            </Tooltip>
          </StyledListItem>
        </List>

        {/* Language Switcher at the bottom */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: isOpen ? 'flex-start' : 'center',
          px: isOpen ? 3 : 1,
          pb: 2
        }}>
          <Divider sx={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
            width: '100%', 
            mb: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            }
          }} />
          
          {isOpen ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
            }}>
              <LanguageSwitcher />
            </Box>
          ) : (
            <Tooltip title={t('sidebar.languageSettings')} placement="right">
              <IconButton 
                onClick={onToggle} 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <LanguageIcon sx={{ fontSize: '1.4rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar; 
