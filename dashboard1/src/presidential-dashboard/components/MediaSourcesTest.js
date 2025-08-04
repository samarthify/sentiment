import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TopNewspapers from './TopNewspapers';
import TopTelevision from './TopTelevision';

const MediaSourcesTest = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Media Sources Test
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Testing Top Newspapers Component
        </Typography>
        <TopNewspapers />
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Testing Top Television Component
        </Typography>
        <TopTelevision />
      </Paper>
    </Box>
  );
};

export default MediaSourcesTest; 