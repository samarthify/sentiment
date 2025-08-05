import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  useTheme,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Event as EventIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  Label,
} from 'recharts';
import { useTranslation } from 'react-i18next';

const EmotionalAnalysis = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!data?.rawData) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">{t('general.noData')}</Typography>
      </Box>
    );
  }

  // Process emotional data
  const emotionData = data.rawData.reduce((acc, item) => {
    const text = item.text?.toLowerCase() || '';
    const date = new Date(item.date);
    const dateStr = date.toISOString().split('T')[0];
    
    // Emotion keywords
    const emotions = {
      'Joy': ['happy', 'excited', 'delighted', 'pleased', 'grateful', 'wonderful', 'fantastic'],
      'Anger': ['angry', 'furious', 'outraged', 'frustrated', 'annoyed', 'upset'],
      'Fear': ['afraid', 'worried', 'concerned', 'anxious', 'scared', 'threatened'],
      'Sadness': ['sad', 'disappointed', 'unhappy', 'depressed', 'regret', 'sorry'],
      'Trust': ['trust', 'confident', 'reliable', 'honest', 'faithful', 'assured']
    };

    // Count emotions in text
    Object.entries(emotions).forEach(([emotion, keywords]) => {
      if (!acc.distribution[emotion]) {
        acc.distribution[emotion] = 0;
      }
      if (keywords.some(keyword => text.includes(keyword))) {
        acc.distribution[emotion]++;
      }
    });

    // Track emotions over time
    if (!acc.timeline[dateStr]) {
      acc.timeline[dateStr] = {
        date: dateStr,
        Joy: 0,
        Anger: 0,
        Fear: 0,
        Sadness: 0,
        Trust: 0,
        sentiment: 0,
        count: 0
      };
    }

    Object.entries(emotions).forEach(([emotion, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        acc.timeline[dateStr][emotion]++;
      }
    });

    // Add sentiment data
    acc.timeline[dateStr].sentiment += parseFloat(item.sentiment_score) || 0;
    acc.timeline[dateStr].count++;

    return acc;
  }, { distribution: {}, timeline: {} });

  // Format distribution data for pie chart
  const emotionDistribution = Object.entries(emotionData.distribution).map(([name, value]) => ({
    name,
    value
  }));

  // Format timeline data for area chart
  const emotionTimeline = Object.values(emotionData.timeline)
    .map(day => ({
      ...day,
      sentiment: day.count > 0 ? day.sentiment / day.count : 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Identify significant sentiment shifts
  const sentimentShifts = emotionTimeline.reduce((acc, curr, index, array) => {
    if (index === 0) return acc;
    
    const prevSentiment = array[index - 1].sentiment;
    const change = curr.sentiment - prevSentiment;
    
    // Consider a shift significant if the change is more than 0.2
    if (Math.abs(change) >= 0.2) {
      // Analyze the emotions on that day to determine the reason
      const dominantEmotions = Object.entries({
        Joy: curr.Joy,
        Anger: curr.Anger,
        Fear: curr.Fear,
        Sadness: curr.Sadness,
        Trust: curr.Trust
      })
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([emotion]) => emotion);

      // Generate reason based on sentiment change and emotions
      const reason = `${t('emotionalAnalysis.significantShift')} ${change > 0 ? t('emotionalAnalysis.positive') : t('emotionalAnalysis.negative')} ${t('emotionalAnalysis.shiftDetected')} ${t('emotionalAnalysis.dominantEmotions')}: ${dominantEmotions.map(emotion => t(`emotions.${emotion.toLowerCase()}`)).join(', ')}`;
      
      acc.push({
        date: curr.date,
        sentiment: curr.sentiment,
        change: change.toFixed(2),
        type: change > 0 ? 'positive' : 'negative',
        reason: reason
      });
    }
    
    return acc;
  }, []);

  const COLORS = {
    Joy: theme.palette.success.main,
    Anger: theme.palette.error.main,
    Fear: theme.palette.warning.main,
    Sadness: theme.palette.info.main,
    Trust: theme.palette.primary.main
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry) => (
            <Typography
              key={entry.name}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {`${entry.name === 'sentiment' ? t('emotionalAnalysis.sentiment') : t(`emotions.${entry.name.toLowerCase()}`)}: ${Number(entry.value).toFixed(2)}`}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h6" gutterBottom>
        {t('emotionalAnalysis.title')}
        <Tooltip title={t('charts.emotionalAnalysisTooltip')}>
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      <Grid container spacing={3}>
        {/* Emotion Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('emotionalAnalysis.emotionDistribution')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={emotionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      if (percent === 0) return null;
                      return `${t(`emotions.${name.toLowerCase()}`)} (${(percent * 100).toFixed(0)}%)`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    minAngle={15}
                    paddingAngle={2}
                  >
                    {emotionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="vertical" 
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => t(`emotions.${value.toLowerCase()}`)}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Emotional Tone Over Time */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('emotionalAnalysis.emotionalToneChanges')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={emotionTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => t(`emotions.${value.toLowerCase()}`)} />
                  {Object.keys(COLORS).map((emotion) => (
                    <Area
                      key={emotion}
                      type="monotone"
                      dataKey={emotion}
                      stackId="1"
                      stroke={COLORS[emotion]}
                      fill={COLORS[emotion]}
                      fillOpacity={0.3}
                      name={emotion}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Sentiment Shifts */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('emotionalAnalysis.significantSentimentShifts')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={emotionTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => value === 'sentiment' ? t('emotionalAnalysis.sentiment') : t(`emotions.${value.toLowerCase()}`)} />
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke={theme.palette.info.main}
                    strokeWidth={2}
                    name="sentiment"
                  />
                  {sentimentShifts.map((shift, index) => (
                    <ReferenceLine
                      key={index}
                      x={shift.date}
                      stroke={shift.type === 'positive' ? theme.palette.success.main : theme.palette.error.main}
                      strokeDasharray="3 3"
                    >
                      <Label
                        value={`${shift.change > 0 ? '+' : ''}${shift.change}`}
                        position="top"
                      />
                    </ReferenceLine>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('emotionalAnalysis.keyEventsShifts')}
              </Typography>
              <Grid container spacing={2}>
                {sentimentShifts.map((shift, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Tooltip 
                      title={shift.reason}
                      placement="top"
                      arrow
                      sx={{
                        backgroundColor: 'background.paper',
                        color: 'text.primary',
                        boxShadow: 1,
                        fontSize: '0.875rem'
                      }}
                    >
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <EventIcon 
                              sx={{ 
                                color: shift.type === 'positive' 
                                  ? theme.palette.success.main 
                                  : theme.palette.error.main 
                              }}
                            />
                            <Typography variant="subtitle2">
                              {shift.date}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {t('emotionalAnalysis.sentimentShift')}: {shift.change > 0 ? '+' : ''}{shift.change}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default EmotionalAnalysis; 