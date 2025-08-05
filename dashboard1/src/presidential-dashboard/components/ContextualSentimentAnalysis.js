import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,

  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,

  IconButton,
  Tooltip,
  useTheme,

} from '@mui/material';
import {
  Info as InfoIcon,
  Policy as PolicyIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  AttachMoney as MoneyIcon,
  School as EducationIcon,
  LocalHospital as HealthIcon,
  DirectionsCar as TransportIcon,
  Lightbulb as EnergyIcon,
  Water as WaterIcon,
  Home as HousingIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ContextualSentimentAnalysis = ({ data, userRole = 'president' }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [contextData, setContextData] = useState({
    policyContexts: [],
    regionalContexts: [],
    demographicContexts: [],
    temporalContexts: [],
    sourceContexts: [],
    keywordContexts: []
  });
  const [selectedContext, setSelectedContext] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  // Nigeria-specific policy contexts
  const policyContexts = {
    'Economic Policy': {
      keywords: ['economy', 'economic', 'growth', 'development', 'investment', 'business', 'trade', 'market', 'finance', 'banking', 'tax', 'revenue', 'budget', 'fiscal', 'monetary', 'inflation', 'unemployment', 'employment', 'job', 'industry', 'manufacturing', 'agriculture', 'oil', 'gas', 'mining', 'export', 'import'],
      icon: <MoneyIcon />,
      color: theme.palette.success.main
    },
    'Security & Defense': {
      keywords: ['security', 'defense', 'military', 'police', 'law', 'enforcement', 'crime', 'terrorism', 'insurgency', 'banditry', 'kidnapping', 'violence', 'peace', 'stability', 'order', 'protection', 'safety', 'border', 'intelligence', 'counterterrorism'],
      icon: <SecurityIcon />,
      color: theme.palette.error.main
    },
    'Infrastructure': {
      keywords: ['infrastructure', 'road', 'bridge', 'railway', 'airport', 'port', 'power', 'electricity', 'water', 'hospital', 'school', 'university', 'building', 'construction', 'development', 'project', 'facility', 'transport', 'communication', 'internet', 'broadband'],
      icon: <TransportIcon />,
      color: theme.palette.info.main
    },
    'Education': {
      keywords: ['education', 'school', 'university', 'college', 'student', 'teacher', 'learning', 'academic', 'curriculum', 'scholarship', 'literacy', 'skill', 'training', 'research', 'development', 'knowledge', 'excellence'],
      icon: <EducationIcon />,
      color: theme.palette.warning.main
    },
    'Healthcare': {
      keywords: ['health', 'healthcare', 'medical', 'hospital', 'doctor', 'nurse', 'patient', 'treatment', 'medicine', 'vaccine', 'disease', 'prevention', 'wellness', 'public health', 'maternal', 'child', 'elderly', 'disability'],
      icon: <HealthIcon />,
      color: theme.palette.secondary.main
    },
    'Energy': {
      keywords: ['energy', 'power', 'electricity', 'oil', 'gas', 'petroleum', 'renewable', 'solar', 'wind', 'hydro', 'nuclear', 'fuel', 'generation', 'distribution', 'consumption', 'efficiency', 'conservation'],
      icon: <EnergyIcon />,
      color: theme.palette.primary.main
    },
    'Agriculture': {
      keywords: ['agriculture', 'farming', 'farmer', 'crop', 'food', 'production', 'subsidy', 'fertilizer', 'irrigation', 'livestock', 'fishery', 'forestry', 'rural', 'development', 'land', 'soil', 'harvest'],
      icon: <BusinessIcon />,
      color: theme.palette.success.dark
    },
    'Social Welfare': {
      keywords: ['welfare', 'social', 'poverty', 'unemployment', 'benefit', 'assistance', 'support', 'vulnerable', 'disability', 'elderly', 'child', 'maternal', 'family', 'community', 'development', 'empowerment'],
      icon: <PeopleIcon />,
      color: theme.palette.info.dark
    }
  };

  // Nigeria regions
  const nigeriaRegions = {
    'North West': ['Kano', 'Kaduna', 'Katsina', 'Jigawa', 'Zamfara', 'Sokoto', 'Kebbi'],
    'North East': ['Borno', 'Yobe', 'Adamawa', 'Bauchi', 'Gombe', 'Taraba'],
    'North Central': ['Plateau', 'Nasarawa', 'Benue', 'Kogi', 'Niger', 'Kwara', 'FCT'],
    'South West': ['Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Ekiti'],
    'South East': ['Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi'],
    'South South': ['Rivers', 'Delta', 'Bayelsa', 'Cross River', 'Akwa Ibom', 'Edo']
  };

  // Generate mock contextual data
  const generateMockContextualData = () => {
    const mockData = [];
    const contexts = Object.keys(policyContexts);
    const regions = Object.keys(nigeriaRegions);
    
    for (let i = 0; i < 100; i++) {
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];
      const randomSentiment = (Math.random() - 0.5) * 2; // -1 to 1
      const randomVolume = Math.floor(Math.random() * 100) + 10;
      
      mockData.push({
        id: i,
        text: `Sample text about ${randomContext} in ${randomRegion} region. This demonstrates contextual sentiment analysis capabilities.`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        context: randomContext,
        region: randomRegion,
        sentiment_score: randomSentiment,
        volume: randomVolume,
        source: ['Twitter', 'News', 'Television', 'Radio'][Math.floor(Math.random() * 4)]
      });
    }
    
    return mockData;
  };

  // Process contextual sentiment data
  const analyzeContextualSentiment = () => {
    const mockData = generateMockContextualData();
    
    // Policy context analysis
    const policyContexts = {};
    Object.keys(policyContexts).forEach(context => {
      policyContexts[context] = {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        averageSentiment: 0,
        volume: 0
      };
    });

    // Regional analysis
    const regionalContexts = {};
    Object.keys(nigeriaRegions).forEach(region => {
      regionalContexts[region] = {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        averageSentiment: 0,
        volume: 0
      };
    });

    // Temporal analysis
    const temporalContexts = {};
    const sourceContexts = {};
    const keywordContexts = {};

    mockData.forEach(item => {
      const sentiment = parseFloat(item.sentiment_score);
      const context = item.context;
      const region = item.region;
      const source = item.source;
      const date = new Date(item.date);
      const dateStr = date.toISOString().split('T')[0];

      // Policy context processing
      if (policyContexts[context]) {
        policyContexts[context].total += 1;
        policyContexts[context].volume += item.volume;
        
        if (sentiment > 0.3) {
          policyContexts[context].positive += 1;
        } else if (sentiment < -0.3) {
          policyContexts[context].negative += 1;
        } else {
          policyContexts[context].neutral += 1;
        }
      }

      // Regional processing
      if (regionalContexts[region]) {
        regionalContexts[region].total += 1;
        regionalContexts[region].volume += item.volume;
        
        if (sentiment > 0.3) {
          regionalContexts[region].positive += 1;
        } else if (sentiment < -0.3) {
          regionalContexts[region].negative += 1;
        } else {
          regionalContexts[region].neutral += 1;
        }
      }

      // Temporal processing
      if (!temporalContexts[dateStr]) {
        temporalContexts[dateStr] = {
          date: dateStr,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0
        };
      }
      temporalContexts[dateStr].total += 1;
      temporalContexts[dateStr].averageSentiment += sentiment;
      
      if (sentiment > 0.3) {
        temporalContexts[dateStr].positive += 1;
      } else if (sentiment < -0.3) {
        temporalContexts[dateStr].negative += 1;
      } else {
        temporalContexts[dateStr].neutral += 1;
      }

      // Source processing
      if (!sourceContexts[source]) {
        sourceContexts[source] = {
          source,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0
        };
      }
      sourceContexts[source].total += 1;
      sourceContexts[source].averageSentiment += sentiment;
      
      if (sentiment > 0.3) {
        sourceContexts[source].positive += 1;
      } else if (sentiment < -0.3) {
        sourceContexts[source].negative += 1;
      } else {
        sourceContexts[source].neutral += 1;
      }
    });

    // Calculate averages
    Object.keys(policyContexts).forEach(context => {
      if (policyContexts[context].total > 0) {
        policyContexts[context].averageSentiment = 
          mockData.filter(item => item.context === context)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / policyContexts[context].total;
      }
    });

    Object.keys(regionalContexts).forEach(region => {
      if (regionalContexts[region].total > 0) {
        regionalContexts[region].averageSentiment = 
          mockData.filter(item => item.region === region)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / regionalContexts[region].total;
      }
    });

    Object.keys(temporalContexts).forEach(date => {
      if (temporalContexts[date].total > 0) {
        temporalContexts[date].averageSentiment /= temporalContexts[date].total;
      }
    });

    Object.keys(sourceContexts).forEach(source => {
      if (sourceContexts[source].total > 0) {
        sourceContexts[source].averageSentiment /= sourceContexts[source].total;
      }
    });

    return {
      policyContexts: Object.entries(policyContexts).map(([context, data]) => ({
        context,
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      regionalContexts: Object.entries(regionalContexts).map(([region, data]) => ({
        region,
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      temporalContexts: Object.values(temporalContexts).sort((a, b) => new Date(a.date) - new Date(b.date)),
      sourceContexts: Object.values(sourceContexts),
      keywordContexts: Object.entries(policyContexts).map(([context, config]) => ({
        context,
        keywords: config.keywords.slice(0, 5),
        color: config.color,
        icon: config.icon
      }))
    };
  };

  useEffect(() => {
    setLoading(true);
    
    setTimeout(() => {
      const contextualData = analyzeContextualSentiment();
      setContextData(contextualData);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          Analyzing Contextual Sentiment...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Processing context-based sentiment analysis
        </Typography>
      </Box>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2">{label}</Typography>
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
            <PolicyIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
            <Typography variant="h6">
              Contextual Sentiment Analysis
              <Tooltip title="Analysis of sentiment based on policy contexts and regional factors">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Context</InputLabel>
              <Select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                label="Context"
              >
                <MenuItem value="all">All Contexts</MenuItem>
                {Object.keys(policyContexts).map(context => (
                  <MenuItem key={context} value={context}>{context}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Policy Context Sentiment */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Policy Context Sentiment
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contextData.policyContexts}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="context" />
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

          {/* Regional Sentiment Distribution */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Regional Sentiment Distribution
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contextData.regionalContexts}
                    dataKey="total"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ region, total }) => `${region} (${total})`}
                  >
                    {contextData.regionalContexts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={theme.palette.primary[`${(index % 6) + 1}00`]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Temporal Context Analysis */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Temporal Context Analysis
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={contextData.temporalContexts}
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
                  <Line
                    type="monotone"
                    dataKey="averageSentiment"
                    stroke={theme.palette.primary.main}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                    name="Average Sentiment"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Source Context Analysis */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Source Context Analysis
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contextData.sourceContexts}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="source" type="category" width={80} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="positive" stackId="a" fill={theme.palette.success.main} name="Positive" />
                  <Bar dataKey="negative" stackId="a" fill={theme.palette.error.main} name="Negative" />
                  <Bar dataKey="neutral" stackId="a" fill={theme.palette.grey[400]} name="Neutral" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Keyword Context Overview */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Policy Keyword Contexts
            </Typography>
            <Box sx={{ height: 300, overflowY: 'auto' }}>
              <List>
                {contextData.keywordContexts.map((context, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon sx={{ color: context.color }}>
                        {context.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={context.context}
                        secondary={
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {context.keywords.map((keyword, idx) => (
                              <Chip
                                key={idx}
                                label={keyword}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < contextData.keywordContexts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default ContextualSentimentAnalysis; 