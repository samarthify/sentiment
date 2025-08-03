import React from 'react';
import { Box, Typography, Paper, Grid, useTheme, Chip, Tooltip as MUITooltip, IconButton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';

const ThemeAnalysis = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const COLORS = [
    '#4CAF50', // green
    '#2196F3', // blue
    '#FF9800', // orange
    '#E91E63', // pink
    '#9C27B0', // purple
    '#00BCD4', // cyan
    '#FFEB3B', // yellow
    '#FF5722', // deep orange
    '#3F51B5', // indigo
    '#009688'  // teal
  ];

  if (!data?.rawData) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">{t('general.noData')}</Typography>
      </Box>
    );
  }

  // Process topics and themes
  const topicData = data.rawData.reduce((acc, item) => {
    const text = item.text || '';
    const topics = {
      'Politics': ['government', 'policy', 'election', 'minister', 'political', 'parliament'],
      'Economy': ['economy', 'business', 'market', 'trade', 'financial', 'investment'],
      'Sports': ['sports', 'football', 'tournament', 'championship', 'athlete', 'game'],
      'Diplomacy': ['diplomatic', 'relations', 'international', 'embassy', 'foreign'],
      'Technology': ['technology', 'digital', 'innovation', 'tech', 'AI', 'software'],
      'Culture': ['culture', 'art', 'music', 'festival', 'heritage', 'tradition'],
      'Education': ['education', 'school', 'university', 'student', 'academic', 'research'],
      'Healthcare': ['health', 'medical', 'hospital', 'healthcare', 'doctor', 'patient']
    };

    Object.entries(topics).forEach(([topic, keywords]) => {
      if (!acc[topic]) {
        acc[topic] = {
          name: topic,
          value: 0,
          sentiment: 0,
          engagement: 0
        };
      }

      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        acc[topic].value++;
        acc[topic].sentiment += parseFloat(item.sentiment_score) || 0;
        acc[topic].engagement += (parseInt(item.likes) || 0) + 
                               (parseInt(item.retweets) || 0) + 
                               (parseInt(item.comments) || 0);
      }
    });

    return acc;
  }, {});

  // Extract hashtags
  const hashtagData = data.rawData.reduce((acc, item) => {
    const text = item.text || '';
    const hashtags = text.match(/#\w+/g) || [];
    
    hashtags.forEach(hashtag => {
      if (!acc[hashtag]) {
        acc[hashtag] = {
          tag: hashtag,
          count: 0,
          engagement: 0
        };
      }
      acc[hashtag].count++;
      acc[hashtag].engagement += (parseInt(item.likes) || 0) + 
                                (parseInt(item.retweets) || 0) + 
                                (parseInt(item.comments) || 0);
    });

    return acc;
  }, {});

  // Extract key phrases (3-4 word sequences that appear frequently)
  const phraseData = data.rawData.reduce((acc, item) => {
    const text = item.text || '';
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = words.slice(i, i + 4).join(' ').toLowerCase();
      if (phrase.length > 10 && !phrase.includes('http')) { // Filter out URLs and short phrases
        if (!acc[phrase]) {
          acc[phrase] = {
            phrase,
            count: 0,
            sentiment: 0
          };
        }
        acc[phrase].count++;
        acc[phrase].sentiment += parseFloat(item.sentiment_score) || 0;
      }
    }

    return acc;
  }, {});

  // Format data for visualization
  const topTopics = Object.values(topicData)
    .map(topic => ({
      ...topic,
      displayName: t(`geographicalInsights.topics.${topic.name.toLowerCase()}`),
      sentiment: topic.value > 0 ? topic.sentiment / topic.value : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Limit to top 8 topics for better readability

  const topHashtags = Object.values(hashtagData)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // Limit to top 8 hashtags
    .map(tag => ({
      name: tag.tag,
      value: tag.count,
      engagement: tag.engagement
    }));

  const topPhrases = Object.values(phraseData)
    .map(phrase => ({
      ...phrase,
      sentiment: phrase.count > 0 ? phrase.sentiment / phrase.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h6" gutterBottom>
        {t('themeAnalysis.title')}
        <MUITooltip title={t('charts.themeAnalysisTooltip')}>
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </MUITooltip>
      </Typography>
      <Grid container spacing={3}>
        {/* Topic Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('themeAnalysis.topicDistribution')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={topTopics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayName" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        try {
                          const data = payload[0]?.payload;
                          if (!data) return null;
                          
                          return (
                            <Box
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                boxShadow: 2,
                              }}
                            >
                              <Typography variant="body2" gutterBottom>
                                {data.displayName}
                              </Typography>
                              <Typography variant="body2">
                                {t('themeAnalysis.mentions')}: {data.value || 0}
                              </Typography>
                              <Typography variant="body2">
                                {t('themeAnalysis.sentiment')}: {((data.sentiment || 0) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          );
                        } catch (error) {
                          console.error('Error in topic tooltip:', error);
                          return null;
                        }
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name={t('themeAnalysis.mentions')} 
                    fill={theme.palette.info.main}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Hashtag Analysis */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('themeAnalysis.topHashtags')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={topHashtags}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => entry.name}
                  >
                    {topHashtags.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        try {
                          const data = payload[0]?.payload;
                          if (!data) return null;
                          
                          return (
                            <Box
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                boxShadow: 2,
                              }}
                            >
                              <Typography variant="body2" gutterBottom>
                                {data.name || ''}
                              </Typography>
                              <Typography variant="body2">
                                {t('themeAnalysis.count')}: {data.value || 0}
                              </Typography>
                              <Typography variant="body2">
                                {t('themeAnalysis.engagement')}: {data.engagement || 0}
                              </Typography>
                            </Box>
                          );
                        } catch (error) {
                          console.error('Error in hashtag tooltip:', error);
                          return null;
                        }
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Key Phrases */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('themeAnalysis.keyPhrases')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {topPhrases.map((phrase, index) => (
                <Chip
                  key={index}
                  label={`${phrase.phrase} (${phrase.count})`}
                  color={phrase.sentiment > 0 ? "success" : phrase.sentiment < 0 ? "error" : "default"}
                  sx={{
                    fontSize: `${Math.min(16, 12 + (phrase.count / 2))}px`,
                    p: 1
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default ThemeAnalysis; 