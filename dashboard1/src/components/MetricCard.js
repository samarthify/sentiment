import React from 'react';
import { Box, Card, Typography, styled } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  boxShadow: 'none',
}));

const TrendIndicator = styled(Box)(({ theme, trend }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: trend >= 0 ? '#4caf50' : '#f44336',
  fontSize: '0.875rem',
  fontWeight: 500,
}));

const MetricCard = ({ title, value, trend, color = 'primary', translationKey }) => {
  const { t } = useTranslation();
  
  const getValueColor = () => {
    switch (color) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'info':
        return '#2196f3';
      default:
        return '#1a2035';
    }
  };

  // Use the provided translation key if available, otherwise use the title directly
  const displayTitle = translationKey ? t(translationKey) : t(title);

  return (
    <StyledCard>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {displayTitle}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 1 }}>
        <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: getValueColor() }}>
          {value}
        </Typography>
        <TrendIndicator trend={trend}>
          {trend >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
          {Math.abs(trend)}%
        </TrendIndicator>
      </Box>
    </StyledCard>
  );
};

export default MetricCard;