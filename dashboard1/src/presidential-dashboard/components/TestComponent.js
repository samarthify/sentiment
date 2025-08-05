import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestComponent = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          🎯 Leader's Dashboard Test
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This is a test component to verify the leader's dashboard is working correctly.
        </Typography>
        <Typography variant="h6" color="primary">
          ✅ Leader's Dashboard is working!
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          You should now be able to access the leader's dashboard through the sidebar navigation.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestComponent; 