import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestComponent = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🎯 Presidential Dashboard Test
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This is a test component to verify the presidential dashboard is working correctly.
        </Typography>
        <Typography variant="h6" color="primary">
          ✅ Presidential Dashboard is working!
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          You should now be able to access the presidential dashboard through the sidebar navigation.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestComponent; 