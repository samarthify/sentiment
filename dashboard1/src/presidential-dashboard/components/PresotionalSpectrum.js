import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  Divider,
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Psychology as PsychologyIcon,
  TextFields as TextFieldsIcon,
  Policy as PolicyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  LineChart,
  Line,
} from 'recharts';

const PresidentialEmotionalSpectrum = ({ data, userRole = 'president' }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [emotionData, setEmotionData] = useState({
    emotions: {},
    emotionFrequency: [],
    emotionIntensity: [],
    emotionTimeline: [],
    emotionalPlatforms: [],
    emotionalContent: [],
    policyEmotions: [],
    criticalAlerts: []
  });
  const [timeRange, setTimeRange] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [focusedEmotion, setFocusedEmotion] = useState(null);
  const [focusedPolicy, setFocusedPolicy] = useState(null);

  // Leader's Emotional Categories
  const presidentialEmotionalCategories = {
    // Positive Leader's Emotions
    confidence: ['confident', 'assured', 'determined', 'resolute', 'strong', 'capable', 'competent', 'effective', 'successful', 'achievement', 'progress', 'development', 'growth', 'improvement', 'advancement', 'leadership', 'vision', 'hope', 'optimistic', 'promising'],
    
    trust: ['trust', 'believe', 'confidence', 'faith', 'reliable', 'honest', 'authentic', 'genuine', 'loyal', 'secure', 'safe', 'sure', 'protect', 'support', 'assure', 'commitment', 'dedicated', 'devoted', 'responsible', 'accountable', 'ethical', 'integrity', 'respect', 'honor', 'credible'],
    
    satisfaction: ['satisfied', 'pleased', 'content', 'happy', 'delighted', 'grateful', 'appreciative', 'thankful', 'blessed', 'fortunate', 'lucky', 'success', 'victory', 'win', 'triumph', 'accomplishment', 'fulfillment', 'completion', 'realization', 'achievement'],
    
    // Negative Leader's Emotions
    concern: ['concerned', 'worried', 'anxious', 'nervous', 'uneasy', 'troubled', 'distressed', 'bothered', 'perturbed', 'alarmed', 'apprehensive', 'fearful', 'scared', 'afraid', 'panicked', 'terrified', 'horrified', 'shocked', 'stunned', 'dismayed'],
    
    frustration: ['frustrated', 'annoyed', 'irritated', 'agitated', 'exasperated', 'impatient', 'disappointed', 'dissatisfied', 'displeased', 'unhappy', 'upset', 'angry', 'mad', 'furious', 'outraged', 'enraged', 'infuriated', 'livid', 'incensed', 'irate'],
    
    disappointment: ['disappointed', 'let_down', 'disheartened', 'discouraged', 'demoralized', 'disillusioned', 'disenchanted', 'displeased', 'dissatisfied', 'unhappy', 'sad', 'unfortunate', 'regrettable', 'unfortunate', 'tragic', 'devastating', 'heartbreaking', 'crushing'],
    
    // Policy-Specific Emotions
    policy_optimism: ['optimistic', 'hopeful', 'promising', 'encouraging', 'positive', 'good', 'great', 'excellent', 'fantastic', 'wonderful', 'amazing', 'brilliant', 'outstanding', 'superb', 'exceptional', 'remarkable', 'extraordinary', 'incredible', 'unbelievable'],
    
    policy_skepticism: ['skeptical', 'doubtful', 'suspicious', 'uncertain', 'unconvinced', 'questionable', 'dubious', 'suspicious', 'distrustful', 'cynical', 'pessimistic', 'negative', 'bad', 'poor', 'terrible', 'awful', 'horrible', 'dreadful', 'atrocious', 'abysmal']
  };



  // Generate mock emotional data for demonstration
  const generateMockEmotionalData = () => {
    const mockData = [];
    const platforms = ['Twitter', 'News', 'Television', 'Radio'];
    const emotions = Object.keys(presidentialEmotionalCategories);
    
    for (let i = 0; i < 50; i++) {
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      const randomSentiment = (Math.random() - 0.5) * 2; // -1 to 1
      
      mockData.push({
        id: i,
        text: `Sample text with ${randomEmotion} emotion about policies and leadership actions. This demonstrates the emotional spectrum analysis capabilities.`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        platform: randomPlatform,
        source: randomPlatform,
        sentiment_score: randomSentiment,
        emotions: { [randomEmotion]: Math.random() * 5 + 1 }
      });
    }
    
    return mockData;
  };

  // Nigeria-specific policy keywords
  const policyKeywords = {
    'Fuel Subsidy Removal': ['fuel', 'subsidy', 'petrol', 'gasoline', 'price', 'increase', 'removal', 'elimination', 'deregulation', 'market', 'economy', 'inflation', 'cost', 'expense', 'budget', 'savings', 'revenue'],
    'Exchange Rate Policy': ['exchange', 'rate', 'naira', 'dollar', 'currency', 'forex', 'foreign', 'exchange', 'devaluation', 'appreciation', 'depreciation', 'floating', 'fixed', 'market', 'economy', 'trade', 'import', 'export'],
    'Security Measures': ['security', 'safety', 'protection', 'defense', 'military', 'police', 'law', 'enforcement', 'crime', 'terrorism', 'insurgency', 'banditry', 'kidnapping', 'violence', 'peace', 'stability', 'order'],
    'Economic Reforms': ['economic', 'reform', 'policy', 'development', 'growth', 'investment', 'business', 'industry', 'commerce', 'trade', 'finance', 'banking', 'tax', 'revenue', 'budget', 'fiscal', 'monetary'],
    'Infrastructure Development': ['infrastructure', 'road', 'bridge', 'railway', 'airport', 'port', 'power', 'electricity', 'water', 'hospital', 'school', 'university', 'building', 'construction', 'development', 'project', 'facility']
  };

      // Emotion colors for leadership context
  const emotionColors = {
    confidence: theme.palette.success.main,
    trust: theme.palette.primary.main,
    satisfaction: theme.palette.success.light,
    concern: theme.palette.warning.main,
    frustration: theme.palette.error.main,
    disappointment: theme.palette.info.main,
    policy_optimism: theme.palette.success.dark,
    policy_skepticism: theme.palette.error.dark
  };

    useEffect(() => {
    setLoading(true);
    
      // Process data to extract leader's emotional spectrum
  const analyzePresidentialEmotionalSpectrum = () => {
      // If no data is provided, use mock data
      const processedData = data || { rawData: generateMockEmotionalData() };
    const emotions = {};
    const emotionTimeline = {};
    const platformEmotions = {};
    const contentWithHighEmotions = [];
    const policyEmotions = {};
    const criticalAlerts = [];
    
    // Initialize emotion data structure
    Object.keys(presidentialEmotionalCategories).forEach(emotion => {
      emotions[emotion] = {
        count: 0,
        totalIntensity: 0,
        averageIntensity: 0
      };
    });

    // Initialize policy emotions
    Object.keys(policyKeywords).forEach(policy => {
      policyEmotions[policy] = {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0
      };
    });

    // Check if we have raw data, if not use mock data
    const rawData = processedData?.rawData || generateMockEmotionalData();
    
    // Process each document
    rawData.forEach(item => {
        if (!item.text) return;
        
        const text = item.text.toLowerCase();
        const date = new Date(item.date);
        const dateStr = date.toISOString().split('T')[0];
        const platform = item.platform || item.source || 'Unknown';
        const source = item.source || 'Unknown';
        const sentiment = parseFloat(item.sentiment_score) || 0;
        
        // Detect leader's emotions in text
        const documentEmotions = {};
        let totalEmotionScore = 0;
        
        Object.entries(presidentialEmotionalCategories).forEach(([emotion, keywords]) => {
          const emotionScore = keywords.reduce((score, keyword) => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
              return score + matches.length;
            }
            return score;
          }, 0);
          
          if (emotionScore > 0) {
            documentEmotions[emotion] = emotionScore;
            emotions[emotion].count += 1;
            emotions[emotion].totalIntensity += emotionScore;
            totalEmotionScore += emotionScore;
            
            // Track emotions over time
            if (!emotionTimeline[dateStr]) {
              emotionTimeline[dateStr] = {
                date: dateStr,
                dateObj: date
              };
              
              Object.keys(presidentialEmotionalCategories).forEach(emotionType => {
                emotionTimeline[dateStr][emotionType] = 0;
              });
            }
            
            emotionTimeline[dateStr][emotion] += emotionScore;
            
            // Track emotions by platform
            if (!platformEmotions[platform]) {
              platformEmotions[platform] = {
                platform,
                total: 0
              };
              
              Object.keys(presidentialEmotionalCategories).forEach(emotionType => {
                platformEmotions[platform][emotionType] = 0;
              });
            }
            
            platformEmotions[platform][emotion] += emotionScore;
            platformEmotions[platform].total += emotionScore;
          }
        });
        
        // Analyze policy-specific emotions
        Object.entries(policyKeywords).forEach(([policy, keywords]) => {
          const policyMentions = keywords.reduce((count, keyword) => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = text.match(regex);
            return count + (matches ? matches.length : 0);
          }, 0);
          
          if (policyMentions > 0) {
            policyEmotions[policy].total += policyMentions;
            
            if (sentiment > 0.3) {
              policyEmotions[policy].positive += policyMentions;
            } else if (sentiment < -0.3) {
              policyEmotions[policy].negative += policyMentions;
            } else {
              policyEmotions[policy].neutral += policyMentions;
            }
          }
        });
        
        // Store content with significant emotional content
        if (totalEmotionScore > 3) {
          const dominantEmotion = Object.entries(documentEmotions)
            .sort((a, b) => b[1] - a[1])[0];
          
          if (dominantEmotion) {
            contentWithHighEmotions.push({
              text: item.text,
              date: item.date,
              platform,
              source,
              dominantEmotion: dominantEmotion[0],
              emotionScore: dominantEmotion[1],
              sentiment: sentiment
            });
          }
        }
        
        // Generate critical alerts for negative emotions
        if (sentiment < -0.7 && (documentEmotions.frustration > 2 || documentEmotions.disappointment > 2)) {
          const dominantEmotionEntry = Object.entries(documentEmotions)
            .sort((a, b) => b[1] - a[1])[0];
          
          criticalAlerts.push({
            id: Date.now() + Math.random(),
            severity: 'critical',
            message: `High ${dominantEmotionEntry?.[0] || 'negative'} sentiment detected in ${platform}`,
            timestamp: item.date,
            emotion: dominantEmotionEntry?.[0] || 'negative',
            platform,
            sentiment
          });
        }
      });
      
      // Calculate average intensity for each emotion
      Object.keys(emotions).forEach(emotion => {
        emotions[emotion].averageIntensity = 
          emotions[emotion].count > 0 
            ? emotions[emotion].totalIntensity / emotions[emotion].count 
            : 0;
      });
      
      // Prepare emotion frequency data for charts
      const emotionFrequency = Object.entries(emotions).map(([emotion, data]) => ({
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        value: data.count,
        intensity: data.averageIntensity
      })).sort((a, b) => b.value - a.value);
      
      // Prepare emotion intensity data for radar chart
      const emotionIntensity = Object.entries(emotions).map(([emotion, data]) => ({
        emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        intensity: data.averageIntensity,
        frequency: data.count
      }));
      
      // Process timeline data
      const timelineData = Object.values(emotionTimeline)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Process platform data
      const platformData = Object.values(platformEmotions)
        .filter(platform => platform.total > 0)
        .sort((a, b) => b.total - a.total);
      
      // Sort content by emotion score
      const sortedContent = contentWithHighEmotions
        .sort((a, b) => b.emotionScore - a.emotionScore)
        .slice(0, 10); // Limit to top 10 emotional content for leader's view
      
      // Prepare policy emotion data
      const policyEmotionData = Object.entries(policyEmotions)
        .filter(([policy, data]) => data.total > 0)
        .map(([policy, data]) => ({
          policy,
          positive: data.positive,
          negative: data.negative,
          neutral: data.neutral,
          total: data.total,
          sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
        }))
        .sort((a, b) => Math.abs(b.sentiment_ratio) - Math.abs(a.sentiment_ratio));
      
      return {
        emotions,
        emotionFrequency,
        emotionIntensity,
        emotionTimeline: timelineData,
        emotionalPlatforms: platformData,
        emotionalContent: sortedContent,
        policyEmotions: policyEmotionData,
        criticalAlerts: criticalAlerts.slice(0, 5) // Top 5 critical alerts
      };
    };

    // Simulate processing time for better UX
    setTimeout(() => {
      const spectrum = analyzePresidentialEmotionalSpectrum();
      setEmotionData(spectrum);
      setLoading(false);
    }, 1000);
  }, [data]);

  // Filter data based on time range
  const filteredTimelineData = React.useMemo(() => {
    if (!emotionData.emotionTimeline || emotionData.emotionTimeline.length === 0) return [];
    
    if (timeRange === 'all') return emotionData.emotionTimeline;
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return emotionData.emotionTimeline;
    }
    
    return emotionData.emotionTimeline.filter(item => new Date(item.date) >= cutoffDate);
  }, [emotionData.emotionTimeline, timeRange]);

  // Filter platform data
  const filteredPlatformData = React.useMemo(() => {
    if (!emotionData.emotionalPlatforms || emotionData.emotionalPlatforms.length === 0) return [];
    
    if (platform === 'all') return emotionData.emotionalPlatforms;
    
    return emotionData.emotionalPlatforms.filter(item => item.platform === platform);
  }, [emotionData.emotionalPlatforms, platform]);

  // Get available platforms
  const availablePlatforms = React.useMemo(() => {
    if (!emotionData.emotionalPlatforms) return [];
    
    return emotionData.emotionalPlatforms.map(item => item.platform);
  }, [emotionData.emotionalPlatforms]);

  // Filter content by emotion
  const filteredContent = React.useMemo(() => {
    if (!emotionData.emotionalContent) return [];
    
    if (!focusedEmotion) return emotionData.emotionalContent.slice(0, 5);
    
    return emotionData.emotionalContent
      .filter(item => item.dominantEmotion === focusedEmotion)
      .slice(0, 5);
  }, [emotionData.emotionalContent, focusedEmotion]);

  // Create timeline data for specific emotion or all emotions
  const emotionTimelineData = React.useMemo(() => {
    if (filteredTimelineData.length === 0) return [];
    
    if (focusedEmotion) {
      return filteredTimelineData.map(day => ({
        date: day.date,
        [focusedEmotion]: day[focusedEmotion] || 0
      }));
    }
    
    return filteredTimelineData;
  }, [filteredTimelineData, focusedEmotion]);

  // Set focused emotion when clicking on a pie slice
  const handleEmotionClick = (data) => {
    if (data && data.name) {
      const emotion = data.name.toLowerCase();
      setFocusedEmotion(focusedEmotion === emotion ? null : emotion);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          Analyzing Leader's Emotional Spectrum...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Processing emotional responses to policies and decisions
        </Typography>
      </Box>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2">{label || payload[0].name}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Card>
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
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PsychologyIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
            <Typography variant="h6">
              Leader's Emotional Spectrum
                              <Tooltip title="Analysis of emotional responses to leadership policies and decisions">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Past Week</MenuItem>
                <MenuItem value="month">Past Month</MenuItem>
                <MenuItem value="quarter">Past Quarter</MenuItem>
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                label="Platform"
              >
                <MenuItem value="all">All Platforms</MenuItem>
                {availablePlatforms.map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Critical Alerts */}
        {emotionData.criticalAlerts && emotionData.criticalAlerts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: theme.palette.error.main }} />
              Critical Emotional Alerts
            </Typography>
            {emotionData.criticalAlerts.map((alert, index) => (
              <Alert 
                key={alert.id} 
                severity="error" 
                sx={{ mb: 1 }}
                action={
                  <Chip 
                    label={alert.emotion} 
                    size="small" 
                    sx={{ backgroundColor: emotionColors[alert.emotion] || theme.palette.error.main, color: '#fff' }}
                  />
                }
              >
                {alert.message} - {new Date(alert.timestamp).toLocaleDateString()}
              </Alert>
            ))}
          </Box>
        )}

        <Grid container spacing={3}>
          {/* Presidential Emotion Distribution */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Leader's Emotion Distribution
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emotionData.emotionFrequency}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    onClick={handleEmotionClick}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {emotionData.emotionFrequency.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={emotionColors[entry.name.toLowerCase()]} 
                        stroke={focusedEmotion === entry.name.toLowerCase() ? theme.palette.common.white : 'none'}
                        strokeWidth={focusedEmotion === entry.name.toLowerCase() ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Presidential Emotion Intensity */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Leader's Emotion Intensity
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={120} data={emotionData.emotionIntensity}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="emotion" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Intensity"
                    dataKey="intensity"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.main}
                    fillOpacity={0.5}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Policy Emotional Response */}
          {userRole !== 'president' && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PolicyIcon sx={{ mr: 1 }} />
                Policy Emotional Response
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={emotionData.policyEmotions}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="policy" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="positive" stackId="a" fill={theme.palette.success.main} name="Positive" />
                    <Bar dataKey="negative" stackId="a" fill={theme.palette.error.main} name="Negative" />
                    <Bar dataKey="neutral" stackId="a" fill={theme.palette.grey[400]} name="Neutral" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          )}

          {/* Presidential Emotion Timeline */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TimelineIcon sx={{ mr: 1 }} />
              Leader's Emotion Timeline
              {focusedEmotion && (
                <Chip 
                  label={focusedEmotion} 
                  size="small" 
                  sx={{ ml: 2, backgroundColor: emotionColors[focusedEmotion], color: '#fff' }}
                  onDelete={() => setFocusedEmotion(null)}
                />
              )}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={emotionTimelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  {focusedEmotion ? (
                    <Line
                      type="monotone"
                      dataKey={focusedEmotion}
                      stroke={emotionColors[focusedEmotion]}
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      name={focusedEmotion}
                    />
                  ) : (
                    Object.keys(presidentialEmotionalCategories).map((emotion) => (
                      <Line
                        key={emotion}
                        type="monotone"
                        dataKey={emotion}
                        stroke={emotionColors[emotion]}
                        strokeWidth={1.5}
                        name={emotion}
                      />
                    ))
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Presidential Emotional Content */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TextFieldsIcon sx={{ mr: 1 }} />
              {focusedEmotion ? `Top ${focusedEmotion} Content` : 'Top Leader\'s Emotional Content'}
            </Typography>
            <Box sx={{ height: 300, overflowY: 'auto' }}>
              {filteredContent.map((item, index) => (
                <Card key={index} sx={{ mb: 2, backgroundColor: alpha(emotionColors[item.dominantEmotion], 0.1) }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={item.dominantEmotion} 
                          size="small" 
                          sx={{ 
                            mr: 1, 
                            backgroundColor: emotionColors[item.dominantEmotion], 
                            color: '#fff',
                            fontWeight: 'bold'
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.platform} - {new Date(item.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`Score: ${item.emotionScore.toFixed(1)}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ bgcolor: 'background.paper' }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.text}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {filteredContent.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">
                    No significant emotional content found
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Presidential Emotion By Platform */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Leader's Emotion By Platform
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredPlatformData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="platform" type="category" width={80} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  {(focusedEmotion ? [focusedEmotion] : Object.keys(presidentialEmotionalCategories)).map((emotion) => (
                    <Bar 
                      key={emotion} 
                      dataKey={emotion} 
                      stackId="a" 
                      fill={emotionColors[emotion]} 
                      name={emotion}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default PresidentialEmotionalSpectrum; 