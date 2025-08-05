import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  useTheme,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Message as MessageIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Label,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const EventAnalysis = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Helper function to format sentiment change
  const formatSentimentChange = (change) => {
    const numChange = parseFloat(change);
    const isPositive = numChange > 0;
    return {
      text: `${Math.abs(numChange * 100).toFixed(1)}%`,
      direction: isPositive ? t('eventAnalysis.improved') : t('eventAnalysis.declined'),
      color: isPositive ? theme.palette.success.main : theme.palette.error.main,
      icon: isPositive ? '📈' : '📉'
    };
  };

  // Helper function to get sentiment description and color
  const getSentimentInfo = (value) => {
    if (value >= 0.7) return { text: t('sentiments.veryPositive'), color: theme.palette.success.dark };
    if (value >= 0.3) return { text: t('sentiments.positive'), color: theme.palette.success.main };
    if (value > -0.3) return { text: t('sentiments.neutral'), color: theme.palette.grey[600] };
    if (value > -0.7) return { text: t('sentiments.negative'), color: theme.palette.error.main };
    return { text: t('sentiments.veryNegative'), color: theme.palette.error.dark };
  };

  // Helper function to extract event-related information from text
  const extractEventInfo = (text) => {
    if (!text) return null;

    // Common event-related keywords
    const eventKeywords = [
      'announced', 'launched', 'unveiled', 'hosted', 'organized',
      'conference', 'summit', 'meeting', 'agreement', 'signed',
      'initiative', 'project', 'partnership', 'collaboration',
      'investment', 'development', 'inauguration', 'ceremony'
    ];

    // Event type patterns
    const eventTypes = {
      'Diplomatic': ['diplomatic', 'bilateral', 'multilateral', 'relations', 'cooperation', 'ambassador', 'embassy', 'foreign', 'minister', 'delegation'],
      'Economic': ['economic', 'business', 'trade', 'investment', 'financial', 'market', 'economy', 'commerce', 'industry'],
      'Sports': ['sports', 'tournament', 'championship', 'match', 'game', 'competition', 'athlete', 'team', 'stadium'],
      'Cultural': ['cultural', 'festival', 'exhibition', 'art', 'heritage', 'tradition', 'celebration', 'museum'],
      'Technology': ['technology', 'innovation', 'digital', 'tech', 'startup', 'AI', 'software', 'platform'],
      'Infrastructure': ['infrastructure', 'construction', 'development', 'project', 'facility', 'building'],
      'Education': ['education', 'academic', 'university', 'school', 'training', 'learning', 'students'],
      'Healthcare': ['health', 'medical', 'healthcare', 'hospital', 'clinic', 'treatment', 'patient']
    };

    // Check if text contains event-related keywords
    const hasEventKeyword = eventKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (!hasEventKeyword) return null;

    // Determine event type
    let eventType = t('eventAnalysis.eventTypes.general');
    let maxMatches = 0;

    Object.entries(eventTypes).forEach(([type, keywords]) => {
      const matches = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword)
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        eventType = type;
      }
    });

    // Extract location using common patterns
    const locationPattern = /(?:in|at|from)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
    const locationMatches = [...text.matchAll(locationPattern)];
    const location = locationMatches.length > 0 ? locationMatches[0][1] : null;

    return {
      type: eventType,
      location: location || t('eventAnalysis.multipleLocations'),
      hasEvent: true
    };
  };

  // Process real data to identify key events and their impact
  const processEventData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    // Group posts by date and analyze content for events
    const eventsByDate = rawData.reduce((acc, post) => {
      const date = post.date?.split('T')[0] || 'unknown';
      
      // Skip if no content or not from a news source
      if (!post.content || !post.source) return acc;

      // Extract event information from content
      const eventInfo = extractEventInfo(post.content);
      if (!eventInfo?.hasEvent) return acc;

      if (!acc[date]) {
        acc[date] = {
          posts: [],
          totalSentiment: 0,
          mentions: 0,
          topics: new Set(),
          sources: new Set(),
          events: new Map() // Track unique events by type
        };
      }

      acc[date].posts.push(post);
      acc[date].totalSentiment += post.sentiment || 0;
      acc[date].mentions++;
      acc[date].sources.add(post.source);

      // Track event by type
      const eventKey = `${eventInfo.type}-${eventInfo.location}`;
      if (!acc[date].events.has(eventKey)) {
        acc[date].events.set(eventKey, {
          type: eventInfo.type,
          location: eventInfo.location,
          content: post.content,
          mentions: 1,
          sentiment: post.sentiment || 0,
          sources: new Set([post.source])
        });
      } else {
        const event = acc[date].events.get(eventKey);
        event.mentions++;
        event.sentiment += post.sentiment || 0;
        event.sources.add(post.source);
      }

      return acc;
    }, {});

    // Convert events map to array and identify significant events
    const significantEvents = Object.entries(eventsByDate)
      .flatMap(([date, data]) => {
        return Array.from(data.events.values())
          .map(event => ({
            date,
            type: event.type,
            title: `${event.type} ${t('eventAnalysis.event')}`,
            description: event.content.slice(0, 150) + '...',
            location: event.location,
            avgSentiment: event.sentiment / event.mentions,
            mentions: event.mentions,
            sources: Array.from(event.sources)
          }));
      })
      .filter(event => event.mentions >= 3) // Events mentioned at least 3 times
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 3); // Get top 3 most significant events

    // Calculate sentiment changes and format event data
    return significantEvents.map(event => {
      // Get data from day before the event
      const eventDate = new Date(event.date);
      const beforeDate = new Date(eventDate);
      beforeDate.setDate(beforeDate.getDate() - 1);
      const beforeDateStr = beforeDate.toISOString().split('T')[0];

      // Calculate before sentiment
      const beforeData = eventsByDate[beforeDateStr];
      const beforeSentiment = beforeData ? 
        beforeData.totalSentiment / beforeData.mentions : 0;

      return {
        date: event.date,
        type: event.type,
        title: event.title,
        description: event.description,
        location: event.location,
        beforeSentiment: Math.max(0, Math.min(1, beforeSentiment + 0.5)), // Normalize to 0-1
        afterSentiment: Math.max(0, Math.min(1, event.avgSentiment + 0.5)), // Normalize to 0-1
        impact: event.avgSentiment > beforeSentiment ? 'positive' : 'negative',
        mentions: event.mentions
      };
    });
  };

  // Process crisis events from real data
  const processCrisisEvents = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    // Group posts by date
    const postsByDate = rawData.reduce((acc, post) => {
      const date = post.date?.split('T')[0] || 'unknown';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(post);
      return acc;
    }, {});

    // Identify crisis events (days with significantly negative sentiment)
    const crisisEvents = Object.entries(postsByDate)
      .map(([date, posts]) => {
        const avgSentiment = posts.reduce((sum, post) => sum + (post.sentiment || 0), 0) / posts.length;
        return {
          date,
          avgSentiment,
          posts: posts.length
        };
      })
      .filter(event => event.avgSentiment < -0.2 && event.posts >= 30) // Filter significant negative events
      .sort((a, b) => a.avgSentiment - b.avgSentiment)
      .slice(0, 2); // Get top 2 most negative events

    return crisisEvents.map(crisis => {
      const timeline = [];
      const crisisDate = new Date(crisis.date);
      
      // Generate 72-hour timeline
      for (let i = 0; i < 4; i++) {
        const timePoint = new Date(crisisDate);
        timePoint.setHours(timePoint.getHours() + (i * 24));
        const timeStr = timePoint.toISOString().split('T')[0];
        const dayPosts = postsByDate[timeStr] || [];
        const daySentiment = dayPosts.length > 0 ?
          dayPosts.reduce((sum, post) => sum + (post.sentiment || 0), 0) / dayPosts.length : 0;
        
        timeline.push({
          time: `${i * 24}h`,
          sentiment: Math.max(0, Math.min(1, daySentiment + 0.5)) // Normalize to 0-1
        });
      }

      return {
        date: crisis.date,
        title: t('eventAnalysis.sentimentCrisis'),
        initialSentiment: Math.max(0, Math.min(1, crisis.avgSentiment + 0.5)),
        responseEffectiveness: Math.max(0, Math.min(1, timeline[timeline.length - 1].sentiment)),
        recoveryTime: t('eventAnalysis.recoveryTime'),
        reputationImpact: Math.round(crisis.avgSentiment * 100),
        recoveryRate: Math.round(
          ((timeline[timeline.length - 1].sentiment - crisis.avgSentiment) / Math.abs(crisis.avgSentiment)) * 100
        ),
        timeline
      };
    });
  };

  // Process the real data
  const keyEvents = processEventData(data);
  const crisisEvents = processCrisisEvents(data);

  // Calculate event impacts
  const eventImpacts = keyEvents.map(event => {
    const change = event.afterSentiment - event.beforeSentiment;

    return {
      name: event.title,
      before: event.beforeSentiment * 100,
      after: event.afterSentiment * 100,
      change: parseFloat(((event.afterSentiment - event.beforeSentiment) * 100).toFixed(1)),
      impact: change > 0 ? t('eventAnalysis.positive') : t('eventAnalysis.negative')
    };
  });



  // Check if no events were found in the data
  const noEventsFound = keyEvents.length === 0 && crisisEvents.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('eventAnalysis.title')}
          <Tooltip title={t('charts.eventAnalysisTooltip')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      {noEventsFound ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('eventAnalysis.noEventsFound', 'No events found in the data')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('eventAnalysis.noEventsDescription', 'There are no significant events detected in the current data set. Try changing your filters or adding more data.')}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Key Events Impact */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('eventAnalysis.impactOfKeyEvents')}
              </Typography>
              <Grid container spacing={2}>
                {keyEvents.map((event, index) => {
                  const change = event.afterSentiment - event.beforeSentiment;
                  const impactInfo = formatSentimentChange(change);
                  const beforeInfo = getSentimentInfo(event.beforeSentiment);
                  const afterInfo = getSentimentInfo(event.afterSentiment);

                  return (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon color="primary" />
                              <Typography variant="subtitle2">
                                {event.title}
                              </Typography>
                            </Box>
                            <Chip 
                              label={event.type}
                              size="small"
                              color={
                                event.type === 'Diplomatic' ? 'primary' :
                                event.type === 'Sports' ? 'success' : 'info'
                              }
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {event.description}
                          </Typography>

                          {/* Impact Visualization */}
                          <Box sx={{ 
                            mt: 2,
                            p: 2,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider'
                          }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {t('eventAnalysis.sentimentImpact')} {impactInfo.icon}
                            </Typography>
                            
                            {/* Before State */}
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                {t('eventAnalysis.beforeEvent')}:
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                mt: 0.5,
                                p: 1,
                                bgcolor: 'background.paper',
                                borderRadius: 1
                              }}>
                                <Typography variant="body2" sx={{ color: beforeInfo.color, fontWeight: 'medium' }}>
                                  {beforeInfo.text}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(event.beforeSentiment * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            </Box>

                            {/* After State */}
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {t('eventAnalysis.afterEvent')}:
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                mt: 0.5,
                                p: 1,
                                bgcolor: 'background.paper',
                                borderRadius: 1
                              }}>
                                <Typography variant="body2" sx={{ color: afterInfo.color, fontWeight: 'medium' }}>
                                  {afterInfo.text}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(event.afterSentiment * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            </Box>

                            {/* Impact Summary */}
                            <Box sx={{ 
                              mt: 2,
                              p: 1,
                              bgcolor: alpha(impactInfo.color, 0.1),
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1
                            }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: impactInfo.color,
                                  fontWeight: 'bold'
                                }}
                              >
                                {t('eventAnalysis.sentiment')} {impactInfo.direction} {t('eventAnalysis.by')} {impactInfo.text}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MessageIcon sx={{ fontSize: 'small', color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {event.mentions.toLocaleString()} {t('eventAnalysis.mentions')}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          {/* Before vs After Comparison */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('eventAnalysis.beforeVsAfterEventImpact')}
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={eventImpacts}
                    layout="vertical"
                    margin={{ top: 20, right: 160, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      width={120}
                      tickFormatter={(value) => `${value} ${eventImpacts.find(e => e.name === value).change > 0 ? '📈' : '📉'}`}
                    />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const changeColor = data.change > 0 ? theme.palette.success.main : theme.palette.error.main;
                          return (
                            <Box
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                minWidth: 200
                              }}
                            >
                              <Typography variant="subtitle2" gutterBottom>
                                {data.name} {data.change > 0 ? '📈' : '📉'}
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {t('eventAnalysis.before')}: {data.before.toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {t('eventAnalysis.after')}: {data.after.toFixed(1)}%
                                </Typography>
                                <Box sx={{ 
                                  mt: 0.5,
                                  p: 0.5,
                                  bgcolor: alpha(changeColor, 0.1),
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: changeColor,
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {data.change > 0 ? t('eventAnalysis.improvedBy') : t('eventAnalysis.declinedBy') }
                                    {Math.abs(data.change)}%
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      wrapperStyle={{
                        paddingLeft: 20
                      }}
                    />
                    <Bar 
                      dataKey="before" 
                      name={t('eventAnalysis.beforeEvent')} 
                      fill={theme.palette.grey[400]}
                      radius={[4, 0, 0, 4]}
                    />
                    <Bar 
                      dataKey="after" 
                      name={t('eventAnalysis.afterEvent')} 
                      fill={theme.palette.primary.main}
                      radius={[0, 4, 4, 0]}
                    >
                      {eventImpacts.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.change > 0 ? theme.palette.success.main : theme.palette.error.main}
                        />
                      ))}
                      {/* Add labels showing the change percentage and direction */}
                      {eventImpacts.map((entry, index) => (
                        <Label
                          key={`label-${index}`}
                          position="right"
                          content={({ x, y, width, height }) => {
                            const isPositive = entry.change > 0;
                            const color = isPositive ? theme.palette.success.main : theme.palette.error.main;
                            return (
                              <g>
                                <rect
                                  x={x + width + 10}
                                  y={y + height/2 - 10}
                                  width={70}
                                  height={20}
                                  fill={alpha(color, 0.1)}
                                  rx={4}
                                />
                                <text
                                  x={x + width + 45}
                                  y={y + height/2}
                                  fill={color}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  style={{
                                    fontWeight: 'bold',
                                    fontSize: '12px'
                                  }}
                                >
                                  {isPositive ? '+' : ''}{entry.change}%
                                </text>
                              </g>
                            );
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {/* Legend for Impact Indicators */}
              <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 1,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                    📈 {t('eventAnalysis.positiveImpact')}
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 1,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
                    📉 {t('eventAnalysis.negativeImpact')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Crisis Response Analysis */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
                {t('eventAnalysis.crisisResponseAnalysis')}
              </Typography>
              {crisisEvents.map((crisis, index) => (
                <Card variant="outlined" key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ width: '100%' }}>
                        {/* Event Header */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 2 
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle2">
                              {crisis.title}
                            </Typography>
                            <Chip
                              icon={crisis.reputationImpact < 0 ? <TrendingDownIcon /> : <TrendingUpIcon />}
                              label={`${crisis.reputationImpact < 0 ? '' : '+'}${crisis.reputationImpact}% ${t('eventAnalysis.impact')}`}
                              color={crisis.reputationImpact < 0 ? 'error' : 'success'}
                              size="small"
                            />
                          </Box>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label={`${crisis.recoveryRate}% ${t('eventAnalysis.recovery')}`}
                            color={crisis.recoveryRate >= 80 ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>

                        {/* Impact Metrics */}
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 2,
                          p: 2,
                          bgcolor: alpha(theme.palette.background.default, 0.6),
                          borderRadius: 1,
                          mb: 2
                        }}>
                          <Box sx={{ 
                            flex: 1,
                            p: 1.5,
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            borderRadius: 1
                          }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('eventAnalysis.initialImpact')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WarningIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                              <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 'medium' }}>
                                {getSentimentInfo(crisis.initialSentiment).text}
                                <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                                  ({(crisis.initialSentiment * 100).toFixed(1)}%)
                                </Typography>
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ 
                            flex: 1,
                            p: 1.5,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            borderRadius: 1
                          }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('eventAnalysis.recoveryTarget')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                              <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 'medium' }}>
                                {getSentimentInfo(crisis.responseEffectiveness).text}
                                <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                                  ({(crisis.responseEffectiveness * 100).toFixed(1)}%)
                                </Typography>
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ 
                            flex: 1,
                            p: 1.5,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            borderRadius: 1
                          }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('eventAnalysis.recoveryTime')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TimelineIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                              <Typography variant="body2" sx={{ color: theme.palette.info.main, fontWeight: 'medium' }}>
                                {crisis.recoveryTime}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Recovery Timeline Chart */}
                        <Box sx={{ width: '100%', height: 150 }}>
                          <ResponsiveContainer>
                            <LineChart data={crisis.timeline}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis 
                                domain={[0, 1]} 
                                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                label={{ 
                                  value: t('eventAnalysis.sentimentScore'), 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  style: { textAnchor: 'middle' }
                                }}
                              />
                              <RechartsTooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const sentimentInfo = getSentimentInfo(data.sentiment);
                                    return (
                                      <Box sx={{ 
                                        bgcolor: 'background.paper', 
                                        p: 1.5, 
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1
                                      }}>
                                        <Typography variant="body2" gutterBottom>
                                          {t('eventAnalysis.time')}: {data.time}
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            color: sentimentInfo.color,
                                            fontWeight: 'medium'
                                          }}
                                        >
                                          {sentimentInfo.text} ({(data.sentiment * 100).toFixed(1)}%)
                                        </Typography>
                                      </Box>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="sentiment"
                                stroke={theme.palette.primary.main}
                                strokeWidth={2}
                                dot={{
                                  fill: theme.palette.background.paper,
                                  stroke: theme.palette.primary.main,
                                  strokeWidth: 2
                                }}
                              />
                              <ReferenceLine
                                y={crisis.initialSentiment}
                                stroke={theme.palette.error.main}
                                strokeDasharray="3 3"
                                label={{ 
                                  value: t('eventAnalysis.initialImpact'), 
                                  position: 'right',
                                  fill: theme.palette.error.main
                                }}
                              />
                              <ReferenceLine
                                y={crisis.responseEffectiveness}
                                stroke={theme.palette.success.main}
                                strokeDasharray="3 3"
                                label={{ 
                                  value: t('eventAnalysis.recoveryTarget'), 
                                  position: 'right',
                                  fill: theme.palette.success.main
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}
    </motion.div>
  );
};

export default EventAnalysis; 