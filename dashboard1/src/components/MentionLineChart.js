import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, styled, Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Area, AreaChart
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

const MentionLineChart = ({ mentionsByDate, aggregationPeriod }) => {
  const [animatedData, setAnimatedData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  useEffect(() => {
    if (mentionsByDate && mentionsByDate.length > 0) {
      // Start with empty data points
      setAnimatedData([]);
      
      // Animate data points appearing one by one
      mentionsByDate.forEach((item, index) => {
        setTimeout(() => {
          setAnimatedData(prev => [...prev, item]);
        }, index * 50);
      });
    }
  }, [mentionsByDate]);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleDataPointClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      const formattedDate = new Date(clickedData.date).toLocaleDateString();
      navigate('/sentiment-data', { 
        state: { 
          dateFilter: formattedDate 
        } 
      });
    }
  };

  // Helper function to format date based on aggregation
  const formatTick = (dateStr) => {
    const date = new Date(dateStr);
    if (aggregationPeriod === 'month') {
      // Format as Month YYYY (e.g., Jan 2024)
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } else if (aggregationPeriod === 'week') {
      // Format as Week starting M/D (e.g., Wk 1/15)
      // Note: Recharts labelFormatter for tooltip might show the start date of the period
      return `Wk ${date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`;
    } else {
      // Default: M/D/YYYY
      return date.toLocaleDateString();
    }
  };
  
  // Helper function for tooltip label
  const formatTooltipLabel = (label) => {
    const date = new Date(label);
     if (aggregationPeriod === 'month') {
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else if (aggregationPeriod === 'week') {
      // Show the week range if possible, otherwise just the start date
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 6);
      return `Week: ${date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderChart = (containerHeight = '100%', clickable = false) => (
    <ResponsiveContainer width="100%" height={containerHeight}>
      <AreaChart
        data={animatedData}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 30
        }}
        onClick={clickable ? handleDataPointClick : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date"
          tickFormatter={formatTick}
          angle={-60}
          textAnchor="end"
          height={60}
        />
        <YAxis />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          cursor={clickable ? { stroke: '#ccc', strokeWidth: 2 } : undefined}
          formatter={(value) => [value, t('general.mentions')]}
          labelFormatter={formatTooltipLabel}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.3}
          strokeWidth={2}
          activeDot={clickable ? { r: 8, strokeWidth: 2, onClick: handleDataPointClick } : { r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (!mentionsByDate || mentionsByDate.length === 0) {
    return (
      <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6">{t('charts.mentionsOverTime')}</Typography>
          <Typography variant="body2">{t('general.noData')}</Typography>
        </CardContent>
      </Card>
    );
  }

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
              {t('charts.mentionsOverTime')}
              <Tooltip title={t('charts.mentionsOverTimeTooltip')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
        title={t('charts.mentionsOverTimeDetailed')}
        subtitle={t('charts.clickDataPoint')}
      >
        {renderChart('100%', true)}
      </ChartModal>
    </>
  );
};

export default MentionLineChart;