import React from 'react';
import { Box, styled } from '@mui/material';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 72;

const Main = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: '20px',
  paddingLeft: '24px',
  transition: theme.transitions.create(['margin', 'padding'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: '12px',
    paddingLeft: '16px',
  },
}));

const Layout = ({ isDrawerOpen, handleDrawerToggle }) => {
  return (
    <Sidebar isOpen={isDrawerOpen} onToggle={handleDrawerToggle} />
  );
};

export default Layout; 