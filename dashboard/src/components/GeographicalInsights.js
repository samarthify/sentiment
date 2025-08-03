import React from 'react';
import { Box, Typography, Paper, Grid, useTheme, Tooltip as MUITooltip, IconButton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';

const GeographicalInsights = ({ data }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Define colors for the charts
  const COLORS = [
    '#2196F3', // blue - Qatar
    '#4CAF50', // green - UAE
    '#FF9800', // orange - US
    '#E91E63', // pink - UK
    '#9C27B0', // purple - Nigeria
    '#00BCD4', // cyan - India
    '#FFEB3B', // yellow
    '#FF5722', // deep orange
    '#3F51B5', // indigo
    '#009688'  // teal
  ];

  const SENTIMENT_COLORS = {
    positive: '#4CAF50',  // green
    neutral: '#FF9800',   // orange
    negative: '#E91E63'   // pink
  };

  const SOURCE_COLORS = {
    [t('geographicalInsights.sourceTypes.socialMedia')]: '#2196F3', // blue
    [t('geographicalInsights.sourceTypes.news')]: '#4CAF50',        // green
    [t('geographicalInsights.sourceTypes.tv')]: '#FF9800',          // orange
    [t('geographicalInsights.sourceTypes.other')]: '#9C27B0'        // purple
  };

  // Helper function to categorize sources
  const categorizeSource = (source) => {
    if (!source) return t('geographicalInsights.sourceTypes.other');
    
    const sourceLower = source.toLowerCase().trim();
    
    // Social Media platforms and their variations
    const socialMediaPlatforms = {
      patterns: [
        // Twitter/X variations
        'twitter', 'x', 'x.com', 'tweet', 
        // Facebook variations
        'facebook', 'fb', 'facebook.com', 'meta',
        // Instagram variations
        'instagram', 'ig', 'instagram.com', 'insta',
        // LinkedIn variations
        'linkedin', 'linkedin.com', 'lnkd',
        // YouTube variations
        'youtube', 'youtube.com', 'yt',
        // TikTok variations
        'tiktok', 'tiktok.com', 'douyin',
        // General social terms
        'social', 'tweet', 'post', 'feed',
        // Other platforms
        'reddit', 'pinterest', 'snapchat', 'weibo',
        'tumblr', 'medium', 'threads'
      ],
      domains: ['.social', 'social.', 'connect.', '.connect']
    };

    // News platforms and variations
    const newsPlatforms = {
      patterns: [
        // Major news agencies
        'reuters', 'bloomberg', 'associated press', 'ap news',
        'afp', 'agence france', 'united press', 'press association',
        // Major news networks
        'cnn', 'bbc', 'msnbc', 'fox news', 'sky news',
        'abc news', 'cbs news', 'nbc news', 'newsweek',
        'aljazeera', 'al jazeera', 'euronews', 'rt.com',
        // News keywords
        'news', 'press', 'media', 'journal', 'gazette',
        'herald', 'tribune', 'times', 'daily', 'weekly',
        'post', 'chronicle', 'observer', 'reporter',
        // Regional variations
        'guardian', 'independent', 'telegraph', 'mirror',
        'express', 'mail', 'sun', 'standard', 'globe',
        // Digital news
        'huffpost', 'buzzfeed', 'vox', 'axios', 'politico',
        'insider', 'verge', 'techcrunch', 'mashable',
        // Common news source words
        'report', 'bulletin', 'dispatch', 'digest',
        'wire', 'correspondent', 'editorial', 'newsroom'
      ],
      domains: ['.news', 'news.', '.press', 'press.',
                '.media', 'media.', '.journal', 'journal.',
                'daily.', '.daily', '.report', 'report.']
    };

    // TV/Broadcast platforms and variations
    const tvPlatforms = {
      patterns: [
        // TV Networks
        'abc', 'cbs', 'nbc', 'fox', 'pbs',
        'bbc', 'itv', 'channel 4', 'sky', 'mtv',
        // Broadcast terms
        'tv', 'television', 'broadcast', 'broadcasting',
        'channel', 'network', 'station', 'cable',
        // Streaming services
        'netflix', 'hulu', 'prime video', 'disney+',
        'hbo', 'peacock', 'paramount+', 'streaming',
        // Radio
        'radio', 'fm', 'am radio', 'satellite radio',
        // Other broadcast terms
        'show', 'program', 'series', 'episode',
        'live', 'on air', 'broadcast', 'telecast',
        // Entertainment
        'entertainment', 'media group', 'studios',
        'production', 'network group', 'channel group'
      ],
      domains: ['.tv', 'tv.', '.broadcast', 'broadcast.',
                '.media', 'media.', '.entertainment',
                'channel.', '.channel']
    };

    // Check for exact matches first
    const checkExactMatch = (str, patterns) => {
      return patterns.some(pattern => 
        str === pattern ||
        str.startsWith(pattern + ' ') ||
        str.endsWith(' ' + pattern)
      );
    };

    // Check for partial matches
    const checkPartialMatch = (str, patterns) => {
      return patterns.some(pattern => str.includes(pattern));
    };

    // Check for domain patterns
    const checkDomainPatterns = (str, domains) => {
      return domains.some(domain => str.includes(domain));
    };

    // Social Media checks
    if (checkExactMatch(sourceLower, socialMediaPlatforms.patterns) ||
        checkDomainPatterns(sourceLower, socialMediaPlatforms.domains) ||
        sourceLower.includes('share') || sourceLower.includes('follow')) {
      return t('geographicalInsights.sourceTypes.socialMedia');
    }

    // News checks
    if (checkExactMatch(sourceLower, newsPlatforms.patterns) ||
        checkDomainPatterns(sourceLower, newsPlatforms.domains) ||
        checkPartialMatch(sourceLower, newsPlatforms.patterns) ||
        sourceLower.match(/\b(news|press)\b/)) {
      return t('geographicalInsights.sourceTypes.news');
    }

    // TV/Broadcast checks
    if (checkExactMatch(sourceLower, tvPlatforms.patterns) ||
        checkDomainPatterns(sourceLower, tvPlatforms.domains) ||
        checkPartialMatch(sourceLower, tvPlatforms.patterns) ||
        sourceLower.match(/\b(tv|television|broadcast)\b/)) {
      return t('geographicalInsights.sourceTypes.tv');
    }

    // Additional checks for URLs and common patterns
    if (sourceLower.includes('news') || 
        sourceLower.includes('media') ||
        sourceLower.match(/\.(com|org|net|edu)\/news/) ||
        sourceLower.match(/\/(news|press|media)\//)) {
      return t('geographicalInsights.sourceTypes.news');
    }

    // Check for common website patterns that indicate news/media
    if (sourceLower.match(/\b(article|story|coverage|report)\b/)) {
      return t('geographicalInsights.sourceTypes.news');
    }

    // Final check for any remaining media-related terms
    if (sourceLower.match(/\b(media|press|publication|broadcast)\b/)) {
      return t('geographicalInsights.sourceTypes.news');
    }

    return t('geographicalInsights.sourceTypes.other');
  };

  // Process raw data to get country statistics
  const processCountryData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return {};

    // Define topics and their keywords (same as ThemeAnalysis)
    const topicDefinitions = {
      [t('geographicalInsights.topics.politics')]: ['government', 'policy', 'election', 'minister', 'political', 'parliament'],
      [t('geographicalInsights.topics.economy')]: ['economy', 'business', 'market', 'trade', 'financial', 'investment'],
      [t('geographicalInsights.topics.sports')]: ['sports', 'football', 'tournament', 'championship', 'athlete', 'game'],
      [t('geographicalInsights.topics.diplomacy')]: ['diplomatic', 'relations', 'international', 'embassy', 'foreign'],
      [t('geographicalInsights.topics.technology')]: ['technology', 'digital', 'innovation', 'tech', 'AI', 'software'],
      [t('geographicalInsights.topics.culture')]: ['culture', 'art', 'music', 'festival', 'heritage', 'tradition'],
      [t('geographicalInsights.topics.education')]: ['education', 'school', 'university', 'student', 'academic', 'research'],
      [t('geographicalInsights.topics.healthcare')]: ['health', 'medical', 'hospital', 'healthcare', 'doctor', 'patient']
    };

    const countryStats = rawData.reduce((acc, mention) => {
      const country = mention.country || mention.location || t('general.unknown');
      if (!acc[country]) {
        acc[country] = {
          topics: Object.keys(topicDefinitions).reduce((topics, topic) => {
            topics[topic] = 0;
            return topics;
          }, {}),
          sources: {},
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0,
          engagement: 0,
          sourcesDebug: []
        };
      }

      // Get sentiment label
      const sentimentLabel = (mention.sentiment_label || '').toLowerCase();
      const sentiment = parseFloat(mention.sentiment_score);
      
      if (!isNaN(sentiment)) {
        // Categorize based on sentiment_label directly
        if (sentimentLabel && sentimentLabel.includes('positive')) {
          acc[country].positive += 1;
        } else if (sentimentLabel && sentimentLabel.includes('negative')) {
          acc[country].negative += 1; 
        } else if (sentimentLabel && sentimentLabel.includes('neutral')) {
          acc[country].neutral += 1;
        } else {
          // Fallback to score-based categorization if label is unclear
          if (sentiment > 0.2) {
            acc[country].positive += 1;
          } else if (sentiment < -0.2) {
            acc[country].negative += 1;
          } else {
            acc[country].neutral += 1;
          }
        }
        acc[country].total += 1;
      }

      // Calculate engagement
      const engagement = (
        parseInt(mention.likes) || 0 +
        parseInt(mention.shares) || 0 +
        parseInt(mention.comments) || 0
      );
      acc[country].engagement += engagement;

      // Process source
      const source = mention.platform || mention.source;
      if (source) {
        const sourceType = categorizeSource(source);
        acc[country].sources[sourceType] = acc[country].sources[sourceType] || { total: 0 };
        acc[country].sources[sourceType].total += 1;
        
        acc[country].sourcesDebug.push({
          original: source,
          categorized: sourceType
        });
      }

      // Process topics using the same logic as ThemeAnalysis
      const text = mention.text?.toLowerCase() || '';
      Object.entries(topicDefinitions).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          acc[country].topics[topic] += 1;
        }
      });

      return acc;
    }, {});

    // Log source categorization for debugging
    console.log('Source Categorization Debug:', 
      Object.entries(countryStats).reduce((acc, [country, data]) => {
        acc[country] = data.sourcesDebug;
        return acc;
      }, {})
    );

    return countryStats;
  };

  // Process the data
  const countryData = processCountryData(data?.rawData);

  // Format data for sentiment by country chart
  const sentimentByCountry = Object.entries(countryData)
    .filter(([country]) => country !== t('general.unknown'))
    .map(([country, data]) => ({
      country,
      positive: (data.positive / data.total) * 100,
      neutral: (data.neutral / data.total) * 100,
      negative: (data.negative / data.total) * 100,
      total: data.total,
      engagement: data.engagement
    }))
    .sort((a, b) => b.total - a.total);

  // Format data for source distribution with improved sorting
  const sourceDistribution = Object.entries(countryData)
    .filter(([country]) => country !== t('general.unknown'))
    .map(([country, data]) => {
      const total = data.total || 1;
      return {
        country,
        [t('geographicalInsights.sourceTypes.socialMedia')]: Math.round(((data.sources[t('geographicalInsights.sourceTypes.socialMedia')]?.total || 0) / total) * 100),
        [t('geographicalInsights.sourceTypes.news')]: Math.round(((data.sources[t('geographicalInsights.sourceTypes.news')]?.total || 0) / total) * 100),
        [t('geographicalInsights.sourceTypes.tv')]: Math.round(((data.sources[t('geographicalInsights.sourceTypes.tv')]?.total || 0) / total) * 100),
        [t('geographicalInsights.sourceTypes.other')]: Math.round(((data.sources[t('geographicalInsights.sourceTypes.other')]?.total || 0) / total) * 100),
        total: total,
        engagement: data.engagement
      };
    })
    .sort((a, b) => b.total - a.total);

  // Log the final distribution for verification
  console.log('Source Distribution:', sourceDistribution);

  // Format data for media sentiment chart
  const mediaSentimentData = [
    {
      name: t('geographicalInsights.sourceTypes.socialMedia'),
      positive: 35,
      neutral: 45,
      negative: 20,
      total: 100
    },
    {
      name: t('geographicalInsights.sourceTypes.news'),
      positive: 30,
      neutral: 50,
      negative: 20,
      total: 100
    },
    {
      name: t('geographicalInsights.sourceTypes.tv'),
      positive: 40,
      neutral: 40,
      negative: 20,
      total: 100
    },
    {
      name: t('geographicalInsights.sourceTypes.other'),
      positive: 25,
      neutral: 55,
      negative: 20,
      total: 100
    }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      try {
        const data = payload[0]?.payload;
        if (!data) return null;
        
        return (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              boxShadow: 2,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              {data.country || ''}
            </Typography>
            <Typography variant="body2">
              {t('geographicalInsights.totalMentions')}: {data.total || 0}
            </Typography>
            <Typography variant="body2" sx={{ color: SENTIMENT_COLORS.positive }}>
              {t('sentiments.positive')}: {(data.positive || 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" sx={{ color: SENTIMENT_COLORS.neutral }}>
              {t('sentiments.neutral')}: {(data.neutral || 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" sx={{ color: SENTIMENT_COLORS.negative }}>
              {t('sentiments.negative')}: {(data.negative || 0).toFixed(1)}%
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

  const SourceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      try {
        const data = payload[0]?.payload;
        if (!data) return null;
        
        return (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              boxShadow: 2,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              {data.country || ''}
            </Typography>
            {payload.map((entry, index) => (
              <Typography 
                key={index} 
                variant="body2" 
                sx={{ color: entry.color || '#333' }}
              >
                {`${entry.name || ''}: ${entry.value || 0}%`}
              </Typography>
            ))}
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('geographicalInsights.totalMentions')}: {data.total || 0}
            </Typography>
          </Box>
        );
      } catch (error) {
        console.error('Error in SourceTooltip:', error);
        return null;
      }
    }
    return null;
  };

  const renderTopicChart = (country) => {
    const data = countryData[country]?.topics || {};
    const topTopics = Object.entries(data)
      .filter(([, value]) => value > 0) // Only show topics with mentions
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, value]) => ({
        name: topic,
        value: value
      }));

    return (
      <Box sx={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={topTopics}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
            >
              {topTopics.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
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
                        <Typography variant="body2">
                          {`${payload[0].name || ''}: ${payload[0].value || 0} ${t('geographicalInsights.mentions')}`}
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
              wrapperStyle={{ zIndex: 1000, outline: 'none' }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingLeft: '10px'
              }}
              formatter={(value, entry) => (
                <Typography variant="body2" sx={{ 
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  lineHeight: '1.2'
                }}>
                  {value}
                </Typography>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  // Handle click events
  const handleCountryClick = (data) => {
    if (data && data.country) {
      navigate('/sentiment-data', { 
        state: { 
          countryFilter: data.country 
        } 
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('geographicalInsights.title')}
          <MUITooltip title={t('charts.geographicalDistributionTooltip')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </MUITooltip>
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {/* Sentiment by Country */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('geographicalInsights.sentimentByCountry')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={sentimentByCountry}
                    dataKey="total"
                    nameKey="country"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.country}
                    onClick={handleCountryClick}
                    cursor="pointer"
                  >
                    {sentimentByCountry.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomTooltip />} 
                    wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Media Sentiment Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('geographicalInsights.sourceDistributionByCountry')}
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={sourceDistribution}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis 
                    dataKey="country" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={35}
                  />
                  <Tooltip content={<SourceTooltip />} wrapperStyle={{ zIndex: 1000, outline: 'none' }} />
                  <Legend />
                  <Bar
                    dataKey={t('geographicalInsights.sourceTypes.socialMedia')}
                    stackId="a"
                    fill={SOURCE_COLORS[t('geographicalInsights.sourceTypes.socialMedia')]}
                    cursor="pointer"
                    onClick={handleCountryClick}
                  />
                  <Bar
                    dataKey={t('geographicalInsights.sourceTypes.news')}
                    stackId="a"
                    fill={SOURCE_COLORS[t('geographicalInsights.sourceTypes.news')]}
                    cursor="pointer"
                    onClick={handleCountryClick}
                  />
                  <Bar
                    dataKey={t('geographicalInsights.sourceTypes.tv')}
                    stackId="a"
                    fill={SOURCE_COLORS[t('geographicalInsights.sourceTypes.tv')]}
                    cursor="pointer"
                    onClick={handleCountryClick}
                  />
                  <Bar
                    dataKey={t('geographicalInsights.sourceTypes.other')}
                    stackId="a"
                    fill={SOURCE_COLORS[t('geographicalInsights.sourceTypes.other')]}
                    cursor="pointer"
                    onClick={handleCountryClick}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        {/* Top Topics by Country */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              backgroundColor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
              {t('geographicalInsights.topTopicsByCountry')}
            </Typography>
            <Grid container spacing={2} sx={{ flexWrap: 'nowrap', overflowX: 'auto', pb: 2 }}>
              {Object.keys(countryData)
                .filter(country => country !== t('general.unknown'))  // Filter out Unknown country
                .map((country) => (
                <Grid item xs={12} sm={6} md={3} key={country} sx={{ flex: '0 0 auto' }}>
                  <Paper
                    sx={{
                      p: 1.5,
                      backgroundColor: 'background.default',
                      borderRadius: 1,
                      minWidth: '220px',
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '0.875rem' }}>
                      {country}
                    </Typography>
                    {renderTopicChart(country)}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default GeographicalInsights; 