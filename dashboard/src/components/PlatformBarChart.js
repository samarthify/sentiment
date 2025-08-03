import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, styled, Tooltip as MUITooltip, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ChartModal from './ChartModal';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
}));

// Colors for bars
const COLORS = [
  '#8884d8', // Purple
  '#82ca9d', // Green
  '#ffc658', // Yellow
  '#ff7300', // Orange
  '#0088fe', // Blue
  '#00C49F', // Teal
  '#FFBB28', // Gold
  '#FF8042', // Coral
  '#a4de6c', // Light Green
  '#d0ed57'  // Lime
];

// List of platforms to exclude
const EXCLUDED_PLATFORMS = ['us', 'qa', 'US', 'QA', 'unknown', 'gb', 'ae'];

// Function to normalize platform names
const normalizePlatformName = (platform) => {
  if (!platform) return 'Unknown';
  
  // Convert to lowercase for comparison
  const lowerPlatform = platform.toLowerCase();
  
  // Map of common platform names to their proper display names
  const platformMap = {
    'twitter': 'Twitter',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'youtube': 'YouTube',
    'tiktok': 'TikTok',
    'reddit': 'Reddit',
    'pinterest': 'Pinterest',
    'tumblr': 'Tumblr',
    'snapchat': 'Snapchat'
  };

  return platformMap[lowerPlatform] || platform;
};

const PlatformBarChart = ({ mentionsByPlatform }) => {
  const [animatedData, setAnimatedData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  useEffect(() => {
    if (mentionsByPlatform && mentionsByPlatform.length > 0) {
      // Filter out excluded platforms and normalize platform names
      const filteredPlatforms = mentionsByPlatform
        .filter(item => !EXCLUDED_PLATFORMS.includes(item.platform?.toLowerCase()))
        .map(item => ({
          ...item,
          platform: normalizePlatformName(item.platform)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      setAnimatedData(filteredPlatforms);
    } else {
      setAnimatedData([]);
    }
  }, [mentionsByPlatform]);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };
  
  const handleBarClick = (data) => {
    // Navigate to sentiment data page with platform filter
    if (data && data.platform) {
      navigate('/sentiment-data', { 
        state: { 
          sourceFilter: data.platform 
        } 
      });
    }
  };

  if (!mentionsByPlatform || mentionsByPlatform.length === 0) {
    return (
      <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('metrics.mentionsByPlatform')}
            <MUITooltip title={t('charts.platformBarChartTooltip')}>
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
        return (
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              p: 2,
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {label === 'unknown' ? t('general.unknown') : label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: payload[0]?.color || '#333' }}>
              {`${t('charts.mentions')}: ${(payload[0]?.value || 0).toLocaleString()}`}
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

  const renderChart = (containerHeight = '100%', clickable = false) => (
    <ResponsiveContainer width="100%" height={containerHeight}>
      <BarChart
        data={animatedData}
        margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="platform"
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          content={<CustomTooltip />} 
          wrapperStyle={{ zIndex: 1000, outline: 'none' }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
          isAnimationActive={true}
        />
        <Bar 
          dataKey="count" 
          radius={[4, 4, 0, 0]}
          cursor={clickable ? 'pointer' : 'default'}
          onClick={clickable ? handleBarClick : null}
        >
          {animatedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
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
              {t('metrics.mentionsByPlatform')}
              <MUITooltip title={t('charts.platformBarChartTooltip')}>
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
        title={t('charts.platformDistributionDetailed')}
        subtitle={t('charts.clickPlatformBar')}
      >
        {renderChart('100%', true)}
      </ChartModal>
    </>
  );
};

export default PlatformBarChart;