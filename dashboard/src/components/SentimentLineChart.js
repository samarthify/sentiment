import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, styled, Tooltip as MUITooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import ChartModal from './ChartModal';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
}));

// Helper function to format date to M/D/YYYY
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

const SentimentLineChart = ({ sentimentByDate, aggregationPeriod }) => {
  const [animatedData, setAnimatedData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  useEffect(() => {
    if (sentimentByDate && sentimentByDate.length > 0) {
      // Start with empty data points
      setAnimatedData([]);
      
      // Animate data points appearing one by one
      sentimentByDate.forEach((item, index) => {
        setTimeout(() => {
          setAnimatedData(prev => [...prev, {
            ...item,
            formattedDate: formatDate(item.date) // Add formatted date
          }]);
        }, index * 50);
      });
    }
  }, [sentimentByDate]);

  // Helper function to format date based on aggregation
  const formatTick = (dateStr) => {
    const date = new Date(dateStr);
    if (aggregationPeriod === 'month') {
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } else if (aggregationPeriod === 'week') {
      return `Wk ${date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Helper function for tooltip label
  const formatTooltipLabel = (label) => {
    const date = new Date(label);
     if (aggregationPeriod === 'month') {
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else if (aggregationPeriod === 'week') {
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 6);
      return `Week: ${date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };
  
  const handleDataPointClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      navigate('/sentiment-data', { 
        state: { 
          dateFilter: clickedData.formattedDate // Use formatted date
        } 
      });
    }
  };

  if (!sentimentByDate || sentimentByDate.length === 0) {
    return (
      <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6">
            {t('charts.sentimentOverTime')}
            <MUITooltip title={t('charts.sentimentOverTimeTooltip')}>
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </MUITooltip>
          </Typography>
          <Typography variant="body2">{t('general.noData')}</Typography>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      try {
        // Find the data point that matches the label
        const dataPoint = animatedData.find(item => formatTooltipLabel(item.date) === label);
        
        return (
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              p: 2,
              border: '1px solid #ccc',
              borderRadius: 1,
              boxShadow: 3
            }}
          >
            <Typography variant="subtitle2" color="textSecondary">
              {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'rgba(54, 162, 235, 1)' }}>
              {t('charts.averageSentiment')}: {payload[0]?.payload?.avgScorePercent || '0'}%
            </Typography>
            {dataPoint && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: '#4caf50' }}>
                  {t('sentiments.positive')}: {dataPoint.positive || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                  {t('sentiments.neutral')}: {dataPoint.neutral || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#f44336' }}>
                  {t('sentiments.negative')}: {dataPoint.negative || 0}
                </Typography>
              </Box>
            )}
          </Box>
        );
      } catch (error) {
        console.error('Error in CustomTooltip:', error);
        return null;
      }
    }
    return null;
  };

  // Prepare the data for visualization
  const chartData = animatedData.map(item => ({
    ...item,
    avgScorePercent: item.avgScore ? (item.avgScore * 100).toFixed(1) : "0"
  }));

  const renderChart = (containerHeight = '100%', clickable = false) => (
    <ResponsiveContainer width="100%" height={containerHeight}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
        onClick={clickable ? handleDataPointClick : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          angle={-45}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          content={<CustomTooltip />}
          wrapperStyle={{ zIndex: 1000 }}
          cursor={{ strokeDasharray: '3 3', stroke: '#ccc', strokeWidth: 1 }}
        />
        <Legend formatter={(value) => {
          if (value === 'positive') return t('sentiments.positive');
          if (value === 'negative') return t('sentiments.negative');
          if (value === 'neutral') return t('sentiments.neutral');
          return value;
        }} />
        <Line
          type="monotone"
          dataKey="positive"
          stroke="#4caf50"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="positive"
          activeDot={clickable ? { 
            r: 6, 
            strokeWidth: 2, 
            onClick: (e, payload) => {
              navigate('/sentiment-data', { 
                state: { 
                  dateFilter: payload.payload.formattedDate,
                  sentimentFilter: 'positive'
                } 
              });
            } 
          } : { r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="negative"
          stroke="#f44336"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="negative"
          activeDot={clickable ? { 
            r: 6, 
            strokeWidth: 2, 
            onClick: (e, payload) => {
              navigate('/sentiment-data', { 
                state: { 
                  dateFilter: payload.payload.formattedDate,
                  sentimentFilter: 'negative'
                } 
              });
            } 
          } : { r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="neutral"
          stroke="#9e9e9e"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="neutral"
          activeDot={clickable ? { 
            r: 6, 
            strokeWidth: 2, 
            onClick: (e, payload) => {
              navigate('/sentiment-data', { 
                state: { 
                  dateFilter: payload.payload.formattedDate,
                  sentimentFilter: 'neutral'
                } 
              });
            } 
          } : { r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StyledCard onClick={handleCardClick}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('charts.sentimentOverTime')}
              <MUITooltip title={t('charts.sentimentOverTimeTooltip')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </MUITooltip>
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              {renderChart('100%')}
            </Box>
          </CardContent>
        </StyledCard>
      </motion.div>

      <ChartModal
        open={isModalOpen}
        onClose={handleModalClose}
        title={t('charts.sentimentTrendsDetailed')}
        subtitle={t('charts.clickDataPointSentiment')}
      >
        {renderChart('100%', true)}
      </ChartModal>
    </>
  );
};

export default SentimentLineChart;