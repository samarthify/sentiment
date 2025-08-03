import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
  Card,
  CardContent,
  Divider,
  Chip,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  InsertChart as InsertChartIcon,
  Lightbulb as LightbulbIcon,
  ErrorOutline as ErrorOutlineIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Timeline as TimelineIcon,
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Fallback colors in case theme is not available
const fallbackColors = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
  },
  grey: {
    200: '#eeeeee',
    500: '#9e9e9e',
  },
};

const AutoSummary = ({ data }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    overallSummary: '',
    keyTrends: [],
    topPositiveThemes: [],
    topNegativeThemes: [],
    insightsAndRecommendations: [],
    recentChanges: []
  });
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to safely get a color from theme or fallback
  const getColor = (path) => {
    try {
      // Split path like 'success.main' into parts
      const parts = path.split('.');
      let result = theme && theme.palette;
      
      // Navigate through the path
      for (const part of parts) {
        if (!result || !result[part]) {
          throw new Error('Path not found in theme');
        }
        result = result[part];
      }
      
      return result;
    } catch (error) {
      // If any part of the path doesn't exist, use fallback
      const parts = path.split('.');
      let fallback = fallbackColors;
      
      for (const part of parts) {
        fallback = fallback[part];
      }
      
      return fallback;
    }
  };

  useEffect(() => {
    if (!data) return;
    setLoading(true);

    // Generate AI-like summaries from the data
    const generateSummaries = () => {
      const summaries = {
        overallSummary: '',
        keyTrends: [],
        topPositiveThemes: [],
        topNegativeThemes: [],
        insightsAndRecommendations: [],
        recentChanges: []
      };

      // Process data to extract insights
      if (data.rawData && data.rawData.length > 0) {
        // Use metrics from the filteredData if available, otherwise calculate them
        const positivePercentage = data.metrics?.positivePercentage || 
          (data.rawData.filter(item => parseFloat(item.sentiment_score || item.sentiment || 0) > 0.2).length / data.rawData.length * 100).toFixed(1);
        
        const negativePercentage = data.metrics?.negativePercentage || 
          (data.rawData.filter(item => parseFloat(item.sentiment_score || item.sentiment || 0) < -0.2).length / data.rawData.length * 100).toFixed(1);
        
        const neutralPercentage = data.metrics?.neutralPercentage || 
          (100 - parseFloat(positivePercentage) - parseFloat(negativePercentage)).toFixed(1);
        
        // Average sentiment
        const averageSentiment = data.metrics?.averageSentiment || 
          data.rawData.reduce((sum, item) => sum + parseFloat(item.sentiment_score || item.sentiment || 0), 0) / data.rawData.length;
        
        // Generate overall summary
        let sentimentTrend;
        if (averageSentiment > 0.1) {
          sentimentTrend = t('analysis.positive');
        } else if (averageSentiment < -0.1) {
          sentimentTrend = t('analysis.negative');
        } else {
          sentimentTrend = t('analysis.mixed');
        }
        
        summaries.overallSummary = t('autoSummary.overallSummary', {
          count: data.rawData.length,
          trend: sentimentTrend,
          score: averageSentiment.toFixed(2),
          positive: positivePercentage,
          neutral: neutralPercentage,
          negative: negativePercentage
        });
        
        // Extract common themes and topics using word frequency
        const wordFrequency = {};
        const excludedWords = new Set(['and', 'the', 'to', 'a', 'of', 'in', 'for', 'on', 'with', 'at', 'from', 'by', 'about', 'as', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'that', 'this', 'these', 'those', 'it', 'they', 'them', 'their', 'not', 'but', 'or', 'if', 'because', 'while', 'when', 'where', 'who', 'what', 'why', 'how']);
        
        data.rawData.forEach(item => {
          if (!item.text) return;
          
          const words = item.text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ');
          const sentiment = parseFloat(item.sentiment_score || item.sentiment || 0);
          
          words.forEach(word => {
            if (word.length < 3 || excludedWords.has(word)) return;
            
            if (!wordFrequency[word]) {
              wordFrequency[word] = {
                count: 0,
                positiveCount: 0,
                negativeCount: 0,
                neutralCount: 0,
                totalSentiment: 0
              };
            }
            
            wordFrequency[word].count += 1;
            wordFrequency[word].totalSentiment += sentiment;
            
            // Get sentiment label
            const sentimentLabel = (item.sentiment_label || '').toLowerCase();
            
            // Categorize based on sentiment_label
            if (sentimentLabel && sentimentLabel.includes('positive')) {
              wordFrequency[word].positiveCount += 1;
            } else if (sentimentLabel && sentimentLabel.includes('negative')) {
              wordFrequency[word].negativeCount += 1;
            } else if (sentimentLabel && sentimentLabel.includes('neutral')) {
              wordFrequency[word].neutralCount += 1;
            } else {
              // Fallback to score-based categorization if label is unclear
              if (sentiment > 0.2) {
                wordFrequency[word].positiveCount += 1;
              } else if (sentiment < -0.2) {
                wordFrequency[word].negativeCount += 1;
              } else {
                wordFrequency[word].neutralCount += 1;
              }
            }
          });
        });
        
        // Calculate average sentiment for each word
        Object.keys(wordFrequency).forEach(word => {
          wordFrequency[word].averageSentiment = wordFrequency[word].totalSentiment / wordFrequency[word].count;
        });
        
        // Extract top themes by word frequency
        const topWords = Object.entries(wordFrequency)
          .filter(([_, stats]) => stats.count >= 5) // Only words that appear at least 5 times
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 30);
        
        // Extract positive themes
        const positiveThemes = Object.entries(wordFrequency)
          .filter(([_, stats]) => stats.count >= 3 && stats.averageSentiment > 0.3)
          .sort((a, b) => b[1].averageSentiment - a[1].averageSentiment)
          .slice(0, 10);
        
        // Extract negative themes
        const negativeThemes = Object.entries(wordFrequency)
          .filter(([_, stats]) => stats.count >= 3 && stats.averageSentiment < -0.3)
          .sort((a, b) => a[1].averageSentiment - b[1].averageSentiment)
          .slice(0, 10);
        
        // Group by date to analyze trends
        const dateGroups = {};
        data.rawData.forEach(item => {
          if (!item.date) return;
          
          const dateString = typeof item.date === 'string' 
            ? item.date.split(' ')[0] // Extract date part if it includes time
            : new Date(item.date).toISOString().split('T')[0];
          
          if (!dateGroups[dateString]) {
            dateGroups[dateString] = {
              count: 0,
              sentimentSum: 0,
              items: []
            };
          }
          
          dateGroups[dateString].count += 1;
          dateGroups[dateString].sentimentSum += parseFloat(item.sentiment_score || item.sentiment || 0);
          dateGroups[dateString].items.push(item);
        });
        
        // Calculate average sentiment per day
        const dailySentiment = Object.entries(dateGroups).map(([date, stats]) => ({
          date,
          count: stats.count,
          averageSentiment: stats.sentimentSum / stats.count,
          items: stats.items
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Detect recent sentiment changes
        if (dailySentiment.length >= 2) {
          const lastIndex = dailySentiment.length - 1;
          const lastDay = dailySentiment[lastIndex];
          const previousDay = dailySentiment[lastIndex - 1];
          
          if (lastDay && previousDay) {
            const sentimentChange = lastDay.averageSentiment - previousDay.averageSentiment;
            
            let changeDescription;
            if (Math.abs(sentimentChange) < 0.1) {
              changeDescription = t('autoSummary.trends.stable');
            } else if (sentimentChange > 0) {
              changeDescription = t('autoSummary.trends.improved');
            } else {
              changeDescription = t('autoSummary.trends.declined');
            }
            
            const changeCapitalized = changeDescription.charAt(0).toUpperCase() + changeDescription.slice(1);
            
            summaries.recentChanges.push({
              title: t('autoSummary.recentChanges.title', { change: changeCapitalized }),
              description: t('autoSummary.recentChanges.description', {
                change: changeDescription,
                points: Math.abs(sentimentChange).toFixed(2)
              }),
              trend: sentimentChange > 0.1 ? "up" : sentimentChange < -0.1 ? "down" : "flat"
            });
          }
        }
        
        // Identify sentiment by platform
        const platformSentiment = {};
        data.rawData.forEach(item => {
          if (!item.platform) return;
          
          if (!platformSentiment[item.platform]) {
            platformSentiment[item.platform] = {
              count: 0,
              sentimentSum: 0
            };
          }
          
          platformSentiment[item.platform].count += 1;
          platformSentiment[item.platform].sentimentSum += parseFloat(item.sentiment_score || item.sentiment || 0);
        });
        
        // Calculate average sentiment per platform
        Object.keys(platformSentiment).forEach(platform => {
          platformSentiment[platform].averageSentiment = 
            platformSentiment[platform].sentimentSum / platformSentiment[platform].count;
        });
        
        // Find platform with highest and lowest sentiment
        const platforms = Object.entries(platformSentiment)
          .filter(([_, stats]) => stats.count >= 3)
          .map(([platform, stats]) => ({
            platform,
            averageSentiment: stats.averageSentiment,
            count: stats.count
          }));
        
        if (platforms.length > 0) {
          const bestPlatform = platforms.reduce((best, current) => 
            current.averageSentiment > best.averageSentiment ? current : best, platforms[0]);
          
          const worstPlatform = platforms.reduce((worst, current) => 
            current.averageSentiment < worst.averageSentiment ? current : worst, platforms[0]);
          
          if (bestPlatform.averageSentiment > 0.1) {
            summaries.keyTrends.push({
              title: t('autoSummary.platforms.mostPositive', { platform: bestPlatform.platform }),
              description: t('autoSummary.platforms.positiveDescription', {
                platform: bestPlatform.platform,
                score: bestPlatform.averageSentiment.toFixed(2)
              }),
              trend: "up"
            });
          }
          
          if (worstPlatform.averageSentiment < -0.1) {
            summaries.keyTrends.push({
              title: t('autoSummary.platforms.mostNegative', { platform: worstPlatform.platform }),
              description: t('autoSummary.platforms.negativeDescription', {
                platform: worstPlatform.platform,
                score: worstPlatform.averageSentiment.toFixed(2)
              }),
              trend: "down"
            });
          }
        }
        
        // Generate key trends from top themes
        topWords.slice(0, 5).forEach(([word, stats]) => {
          let sentimentDescription;
          if (stats.averageSentiment > 0.2) {
            sentimentDescription = t('analysis.positive');
          } else if (stats.averageSentiment < -0.2) {
            sentimentDescription = t('analysis.negative');
          } else {
            sentimentDescription = t('analysis.neutral');
          }
          
          const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
          
          summaries.keyTrends.push({
            title: t('autoSummary.keyTrends.highFrequency', { word: capitalizedWord }),
            description: t('autoSummary.keyTrends.frequencyDescription', {
              word,
              count: stats.count,
              sentiment: sentimentDescription,
              score: stats.averageSentiment.toFixed(2)
            }),
            trend: stats.averageSentiment > 0.2 
              ? "up" 
              : stats.averageSentiment < -0.2 
                ? "down" 
                : "flat"
          });
        });
        
        // Generate positive themes
        positiveThemes.forEach(([word, stats]) => {
          summaries.topPositiveThemes.push({
            term: word,
            sentimentScore: stats.averageSentiment.toFixed(2),
            frequency: stats.count,
            description: t('autoSummary.themes.positiveAssociation', {
              word,
              positive: stats.positiveCount,
              total: stats.count
            })
          });
        });
        
        // Generate negative themes
        negativeThemes.forEach(([word, stats]) => {
          summaries.topNegativeThemes.push({
            term: word,
            sentimentScore: stats.averageSentiment.toFixed(2),
            frequency: stats.count,
            description: t('autoSummary.themes.negativeAssociation', {
              word,
              negative: stats.negativeCount,
              total: stats.count
            })
          });
        });
        
        // Generate insights and recommendations
        const generateInsight = (type, title, description) => ({
          type,
          title,
          description
        });
        
        // Add general insights based on the data
        if (positivePercentage > 60) {
          summaries.insightsAndRecommendations.push(
            generateInsight(
              "strength",
              t('autoSummary.insights.strongPositive'),
              t('autoSummary.insights.strongPositiveDesc', { percentage: positivePercentage })
            )
          );
        } else if (negativePercentage > 40) {
          summaries.insightsAndRecommendations.push(
            generateInsight(
              "concern",
              t('autoSummary.insights.significantNegative'),
              t('autoSummary.insights.significantNegativeDesc', { percentage: negativePercentage })
            )
          );
        }
        
        // Add platform-specific insights
        if (platforms.length > 1) {
          const platformDifference = platforms.reduce((max, current) => {
            const diffScore = platforms.reduce((diff, other) => {
              if (current.platform === other.platform) return diff;
              return Math.max(diff, Math.abs(current.averageSentiment - other.averageSentiment));
            }, 0);
            
            return diffScore > max.diffScore ? { platform: current.platform, diffScore } : max;
          }, { platform: null, diffScore: 0 });
          
          if (platformDifference.diffScore > 0.3) {
            summaries.insightsAndRecommendations.push(
              generateInsight(
                "opportunity",
                t('autoSummary.insights.platformDiscrepancy'),
                t('autoSummary.insights.platformDiscrepancyDesc', { platform: platformDifference.platform })
              )
            );
          }
        }
        
        // Add top positive/negative theme insights
        if (positiveThemes.length > 0) {
          const topPositive = positiveThemes[0];
          summaries.insightsAndRecommendations.push(
            generateInsight(
              "strength",
              t('autoSummary.insights.strongTermAssociation', { term: topPositive[0] }),
              t('autoSummary.insights.strongTermDesc', { 
                term: topPositive[0], 
                score: topPositive[1].averageSentiment.toFixed(2) 
              })
            )
          );
        }
        
        if (negativeThemes.length > 0) {
          const topNegative = negativeThemes[0];
          summaries.insightsAndRecommendations.push(
            generateInsight(
              "concern",
              t('autoSummary.insights.negativeTermAssociation', { term: topNegative[0] }),
              t('autoSummary.insights.negativeTermDesc', { 
                term: topNegative[0], 
                score: topNegative[1].averageSentiment.toFixed(2) 
              })
            )
          );
        }
        
        // Add time-based insights
        if (dailySentiment.length > 3) {
          const recentDays = dailySentiment.slice(-3);
          const recentTrend = recentDays[recentDays.length - 1].averageSentiment - recentDays[0].averageSentiment;
          
          if (Math.abs(recentTrend) > 0.15) {
            const trendType = recentTrend > 0 ? "opportunity" : "concern";
            const trendDirection = recentTrend > 0 
              ? t('autoSummary.trends.improving') 
              : t('autoSummary.trends.declining');
            
            const actionDescription = recentTrend > 0 
              ? t('autoSummary.trends.positiveAction')
              : t('autoSummary.trends.negativeAction');
            
            summaries.insightsAndRecommendations.push(
              generateInsight(
                trendType,
                t('autoSummary.insights.sentimentTrend', { direction: trendDirection }),
                t('autoSummary.insights.sentimentTrendDesc', { 
                  direction: recentTrend > 0 ? t('sentiments.positive') : t('sentiments.negative'),
                  action: actionDescription
                })
              )
            );
          } else {
            summaries.insightsAndRecommendations.push(
              generateInsight(
                "insight",
                t('autoSummary.insights.stableTrend'),
                t('autoSummary.insights.stableTrendDesc')
              )
            );
          }
        }
      }
      
      return summaries;
    };

    // Simulate AI processing time
    setTimeout(() => {
      const summaries = generateSummaries();
      setSummaryData(summaries);
      setLoading(false);
    }, 1000);
  }, [data, t]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderTrendIcon = (trend) => {
    if (trend === "up") {
      return <TrendingUpIcon sx={{ color: getColor('success.main') }} />;
    } else if (trend === "down") {
      return <TrendingDownIcon sx={{ color: getColor('error.main') }} />;
    } else {
      return <TrendingFlatIcon sx={{ color: getColor('grey.500') }} />;
    }
  };

  const renderInsightIcon = (type) => {
    switch (type) {
      case "strength":
        return <ThumbUpIcon sx={{ color: getColor('success.main') }} />;
      case "concern":
        return <ThumbDownIcon sx={{ color: getColor('error.main') }} />;
      case "opportunity":
        return <LightbulbIcon sx={{ color: getColor('warning.main') }} />;
      case "insight":
        return <InsertChartIcon sx={{ color: getColor('info.main') }} />;
      default:
        return <ErrorOutlineIcon sx={{ color: getColor('grey.500') }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{t('autoSummary.generating')}</Typography>
        <Box sx={{ width: '100%', mt: 4 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('autoSummary.analyzing', { count: data?.rawData?.length || 0 })}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Helper function for alpha color with fallback
  const getAlphaColor = (colorPath, alphaValue) => {
    const color = getColor(colorPath);
    // If alpha function is available and theme exists, use it, otherwise do simple opacity
    if (theme && theme.palette && alpha) {
      return alpha(color, alphaValue);
    }
    return color;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesomeIcon sx={{ mr: 1, color: getColor('primary.main') }} />
            <Typography variant="h6">
              {t('autoSummary.title')}
              <Tooltip title={t('charts.autoSummaryTooltip')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          <IconButton onClick={handleRefresh} size="small" disabled={refreshing}>
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Overall Summary */}
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: getAlphaColor('primary.light', 0.05) }}>
              <CardContent>
                <Typography variant="body1" paragraph>
                  {summaryData.overallSummary}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Key Trends */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              {t('autoSummary.sections.keyTrends')}
            </Typography>
            <List>
              {summaryData.keyTrends.map((trend, index) => (
                <ListItem 
                  key={index}
                  sx={{ 
                    mb: 1,
                    backgroundColor: getAlphaColor(
                      trend.trend === 'up' 
                        ? 'success.light' 
                        : trend.trend === 'down' 
                          ? 'error.light' 
                          : 'grey.200',
                      0.1
                    ),
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    {renderTrendIcon(trend.trend)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={trend.title}
                    secondary={trend.description}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Insights and Recommendations */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              <LightbulbIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              {t('autoSummary.sections.insightsRecommendations')}
            </Typography>
            <List>
              {summaryData.insightsAndRecommendations.map((insight, index) => (
                <ListItem 
                  key={index}
                  sx={{ 
                    mb: 1,
                    backgroundColor: getAlphaColor(
                      insight.type === 'strength' 
                        ? 'success.light' 
                        : insight.type === 'concern' 
                          ? 'error.light' 
                          : insight.type === 'opportunity'
                            ? 'warning.light'
                            : 'info.light',
                      0.1
                    ),
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    {renderInsightIcon(insight.type)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={insight.title}
                    secondary={insight.description}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Positive Themes */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ThumbUpIcon sx={{ mr: 1, color: getColor('success.main') }} />
              {t('autoSummary.sections.positiveThemes')}
            </Typography>
            <Grid container spacing={1}>
              {summaryData.topPositiveThemes.slice(0, 6).map((theme, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card sx={{ backgroundColor: getAlphaColor('success.light', 0.05 + (0.1 * (1 - index/6))) }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {theme.term}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={theme.sentimentScore} 
                          sx={{ 
                            backgroundColor: getColor('success.main'),
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {theme.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Negative Themes */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ThumbDownIcon sx={{ mr: 1, color: getColor('error.main') }} />
              {t('autoSummary.sections.negativeThemes')}
            </Typography>
            <Grid container spacing={1}>
              {summaryData.topNegativeThemes.slice(0, 6).map((theme, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card sx={{ backgroundColor: getAlphaColor('error.light', 0.05 + (0.1 * (1 - index/6))) }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {theme.term}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={theme.sentimentScore} 
                          sx={{ 
                            backgroundColor: getColor('error.main'),
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {theme.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Recent Changes */}
          {summaryData.recentChanges.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                {t('autoSummary.sections.recentChanges')}
              </Typography>
              <Grid container spacing={2}>
                {summaryData.recentChanges.map((change, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Alert 
                      severity={
                        change.trend === 'up' ? 'success' : 
                        change.trend === 'down' ? 'error' : 
                        'info'
                      }
                      icon={renderTrendIcon(change.trend)}
                      sx={{ '& .MuiAlert-message': { width: '100%' } }}
                    >
                      <Typography variant="subtitle2">{change.title}</Typography>
                      <Typography variant="body2">{change.description}</Typography>
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default AutoSummary; 