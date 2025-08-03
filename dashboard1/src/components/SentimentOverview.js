import React from 'react';
import { Box, Typography, useTheme, Tooltip as MUITooltip, IconButton, Paper } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';

const SentimentOverview = ({ data }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sentimentData = [
    {
      name: t('sentiments.positive'),
      value: Number(data?.metrics?.positivePercentage || 0),
      color: theme.palette.success.main,
    },
    {
      name: t('sentiments.neutral'),
      value: Number(data?.metrics?.neutralPercentage || 0),
      color: theme.palette.grey[400],
    },
    {
      name: t('sentiments.negative'),
      value: Number(data?.metrics?.negativePercentage || 0),
      color: theme.palette.error.main,
    },
  ];

  const handleSentimentClick = (sentiment) => {
    // Navigate to sentiment data page with appropriate filter
    navigate('/sentiment-data', { state: { sentimentFilter: sentiment.name.toLowerCase() } });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      try {
        const value = Number(payload[0]?.value || 0);
        return (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              p: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              minWidth: 120,
              boxShadow: 2,
              '& .MuiTypography-root': {
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: payload[0]?.payload?.color || '#000',
                fontWeight: 'medium'
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: payload[0]?.payload?.color || '#000',
                  display: 'inline-block'
                }} 
              />
              {`${payload[0]?.name || ''}: ${isNaN(value) ? '0.0' : value.toFixed(1)}%`}
            </Typography>
          </Box>
        );
      } catch (error) {
        console.error('Error in CustomTooltip:', error);
        return null;
      }
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper elevation={0} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('analysis.sentimentAnalysis')}
          <MUITooltip title={t('charts.sentimentOverTimeTooltip')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </MUITooltip>
        </Typography>
        <Box sx={{ width: '100%', height: 300, position: 'relative' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="40%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onClick={handleSentimentClick}
                // Make the chart segments interactive
                style={{ cursor: 'pointer' }}
              >
                {sentimentData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                cursor={false}
                isAnimationActive={true}
              />
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
              mt: 2,
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
            }}
          >
            {sentimentData.map((item) => (
              <Box
                key={item.name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                onClick={() => handleSentimentClick(item)}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                  }}
                />
                <Typography variant="body2">
                  {`${item.name}: ${isNaN(item.value) ? '0.0' : item.value.toFixed(1)}%`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default SentimentOverview; 