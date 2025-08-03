import React from 'react';
import {
  Box,
  Typography,
  Grid,
  useTheme,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  Tv as TvIcon,
  Article as NewsIcon,
  Instagram as InstagramIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';
import {
  Tooltip as RechartsTooltip,
} from 'recharts';

const PlatformSentiment = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getPlatformIcon = (platform) => {
    const platformLower = platform.toLowerCase();
    switch (platformLower) {
      case 'twitter':
      case 'x':
        return <TwitterIcon />;
      case 'facebook':
        return <FacebookIcon />;
      case 'linkedin':
        return <LinkedInIcon />;
      case 'instagram':
        return <InstagramIcon />;
      default:
        return platformLower.includes('tv') ? <TvIcon /> : <NewsIcon />;
    }
  };

  // Process raw data to get platform statistics
  const processPlatformStats = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    // Add debugging logs
    console.log('Processing platform stats, raw data length:', rawData.length);
    // Log sample records with sentiment values for debugging
    console.log('Sample records with sentiment values:');
    rawData.slice(0, 3).forEach((item, index) => {
      console.log(`Record ${index + 1}:`, {
        platform: item.platform || item.source,
        sentiment: item.sentiment,
        sentiment_score: item.sentiment_score,
        score: item.score,
        sentiment_label: item.sentiment_label
      });
    });

    // List of sources to exclude
    const excludedSources = new Set([
      'us', 'US', 'usa', 'USA',
      'uk', 'UK',
      'qa', 'QA',
      'ae', 'AE',
      'gb', 'GB',
      'fr', 'FR',
      'de', 'DE',
      'it', 'IT',
      'es', 'ES'
    ]);

    // Helper function to validate platform name
    const isValidPlatform = (platform) => {
      if (!platform) return false;
      
      const platformLower = platform.toLowerCase().trim();
      
      if (excludedSources.has(platformLower)) return false;
      if (platformLower.length <= 3 && !/^(bbc|cnn|sky|itv)$/i.test(platformLower)) return false;
      
      return true;
    };

    // Group mentions by platform
    const platformMap = rawData.reduce((acc, mention) => {
      const platform = mention.platform || mention.source;
      
      if (!isValidPlatform(platform)) return acc;

      if (!acc[platform]) {
        acc[platform] = {
          platform,
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0,
          engagement: 0,
          sentiments: []
        };
      }

      // Get sentiment value for average calculation
      let sentimentScore = null;
      if (typeof mention.sentiment_score === 'number') {
        sentimentScore = mention.sentiment_score;
      } else if (typeof mention.sentiment === 'number') {
        sentimentScore = mention.sentiment;
      } else if (typeof mention.score === 'number') {
        sentimentScore = mention.score;
      } else {
        // Try parsing string values
        const sentimentStr = mention.sentiment_score || mention.sentiment || mention.score;
        if (sentimentStr) {
          sentimentScore = parseFloat(sentimentStr);
        }
      }
      
      // Get sentiment label
      const sentimentLabel = (mention.sentiment_label || '').toLowerCase();
      
      // Process if we have valid sentiment data
      if (sentimentLabel && (sentimentScore !== null && !isNaN(sentimentScore))) {
        // Store sentiment score for average calculation
        acc[platform].sentiments.push(sentimentScore);
        
        // Categorize based on sentiment_label directly
        if (sentimentLabel.includes('positive')) {
          acc[platform].positive += 1;
        } else if (sentimentLabel.includes('negative')) {
          acc[platform].negative += 1;
        } else if (sentimentLabel.includes('neutral')) {
          acc[platform].neutral += 1;
        } else {
          // Fallback to score-based categorization if label is unclear
          if (sentimentScore > 0.2) {
            acc[platform].positive += 1;
          } else if (sentimentScore < -0.2) {
            acc[platform].negative += 1;
          } else {
            acc[platform].neutral += 1;
          }
        }
        
        acc[platform].total += 1;
      }
      
      const likes = parseInt(mention.likes) || 0;
      const shares = parseInt(mention.shares) || 0;
      const comments = parseInt(mention.comments) || 0;
      acc[platform].engagement += likes + shares + comments;

      return acc;
    }, {});

    // Process platforms and combine single-mention sources
    const processedPlatforms = Object.values(platformMap)
      .filter(platform => platform.total > 0)
      .reduce((acc, platform) => {
        if (platform.total === 1) {
          // Add to "Other Sources"
          if (!acc.other) {
            acc.other = {
              platform: t('platformSentiment.otherSources'),
              positive: 0,
              neutral: 0,
              negative: 0,
              total: 0,
              engagement: 0,
              sentiments: [],
              sources: [] // Keep track of individual sources
            };
          }
          acc.other.positive += platform.positive;
          acc.other.neutral += platform.neutral;
          acc.other.negative += platform.negative;
          acc.other.total += platform.total;
          acc.other.engagement += platform.engagement;
          acc.other.sentiments.push(...platform.sentiments);
          acc.other.sources.push(platform.platform);
        } else {
          // Keep platforms with more than one mention
          acc[platform.platform] = platform;
        }
        return acc;
      }, {});

    // Add counters for sentiment categories
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;
    
    // Convert to array and calculate percentages
    const result = Object.values(processedPlatforms)
      .map(platform => {
        const total = platform.total || 1;
        
        // Update counters
        totalPositive += platform.positive;
        totalNeutral += platform.neutral;
        totalNegative += platform.negative;
        
        return {
          ...platform,
          positivePercent: (platform.positive / total) * 100,
          neutralPercent: (platform.neutral / total) * 100,
          negativePercent: (platform.negative / total) * 100,
          averageSentiment: platform.sentiments.reduce((sum, score) => sum + score, 0) / platform.sentiments.length
        };
      })
      .sort((a, b) => b.total - a.total);
    
    // Log platform distributions
    result.forEach(platform => {
      console.log(`Platform "${platform.platform}": Positive: ${platform.positive}/${platform.total} (${platform.positivePercent.toFixed(1)}%), Neutral: ${platform.neutral}/${platform.total} (${platform.neutralPercent.toFixed(1)}%), Negative: ${platform.negative}/${platform.total} (${platform.negativePercent.toFixed(1)}%)`);
    });
    
    // Log total counts
    console.log(`TOTAL SENTIMENT DISTRIBUTION - Positive: ${totalPositive}, Neutral: ${totalNeutral}, Negative: ${totalNegative}, Total: ${totalPositive + totalNeutral + totalNegative}`);
    
    return result;
  };

  const platformStats = processPlatformStats(data?.rawData);

  // Log for debugging
  console.log('Platform Stats:', platformStats);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {t('platformSentiment.title')}
          <Tooltip title={t('charts.platformDistributionTooltip')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {platformStats.map((platform) => (
          <Grid item xs={12} sm={6} md={4} key={platform.platform}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  {getPlatformIcon(platform.platform)}
                  <Tooltip title={platform.sources ? `${t('platformSentiment.including')}: ${platform.sources.join(', ')}` : ''}>
                    <Typography variant="h6" component="div">
                      {platform.platform}
                      {platform.sources && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({platform.sources.length} {t('platformSentiment.sources')})
                        </Typography>
                      )}
                    </Typography>
                  </Tooltip>
                </Box>

                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('sentiments.positive')} ({Math.round(platform.positivePercent)}%)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={platform.positivePercent}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: theme.palette.success.main,
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('sentiments.neutral')} ({Math.round(platform.neutralPercent)}%)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={platform.neutralPercent}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.grey[500], 0.1),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: theme.palette.grey[500],
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('sentiments.negative')} ({Math.round(platform.negativePercent)}%)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={platform.negativePercent}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: theme.palette.error.main,
                        },
                      }}
                    />
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('platformSentiment.total')}: {platform.total}
                  </Typography>
                  {platform.engagement > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('platformSentiment.engagement')}: {platform.engagement.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
};

export default PlatformSentiment; 