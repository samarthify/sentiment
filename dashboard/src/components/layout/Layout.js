import React from 'react';
import { Box, styled } from '@mui/material';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 80;

const Main = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: '24px',
  paddingLeft: '32px',
  transition: theme.transitions.create(['margin', 'padding'], {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.standard,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: '16px',
    paddingLeft: '20px',
  },
}));

const Layout = ({ isDrawerOpen, handleDrawerToggle }) => {
  return (
    <Sidebar isOpen={isDrawerOpen} onToggle={handleDrawerToggle} />
  );
};

export default Layout; 