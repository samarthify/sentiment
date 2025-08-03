import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  Map as MapIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  AttachMoney as MoneyIcon,
  School as EducationIcon,
  LocalHospital as HealthIcon,
  DirectionsCar as TransportIcon,
  Lightbulb as EnergyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
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
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Import data service
import DataService from '../../services/DataService';

const GeographicalDistribution = ({ data, userRole = 'president' }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState({
    regionalData: [],
    stateData: [],
    cityData: [],
    impactAnalysis: [],
    demographicData: [],
    infrastructureData: [],
    securityData: [],
    economicData: []
  });
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('sentiment');

  // Nigeria geographical data
  const nigeriaGeography = {
    'North West': {
      states: ['Kano', 'Kaduna', 'Katsina', 'Jigawa', 'Zamfara', 'Sokoto', 'Kebbi'],
      population: 45000000,
      majorCities: ['Kano', 'Kaduna', 'Katsina', 'Sokoto'],
      keySectors: ['Agriculture', 'Trade', 'Manufacturing'],
      challenges: ['Security', 'Education', 'Infrastructure'],
      opportunities: ['Agricultural Processing', 'Trade Hub', 'Manufacturing']
    },
    'North East': {
      states: ['Borno', 'Yobe', 'Adamawa', 'Bauchi', 'Gombe', 'Taraba'],
      population: 25000000,
      majorCities: ['Maiduguri', 'Yola', 'Bauchi', 'Gombe'],
      keySectors: ['Agriculture', 'Mining', 'Tourism'],
      challenges: ['Security', 'Infrastructure', 'Healthcare'],
      opportunities: ['Mining', 'Tourism', 'Agricultural Processing']
    },
    'North Central': {
      states: ['Plateau', 'Nasarawa', 'Benue', 'Kogi', 'Niger', 'Kwara', 'FCT'],
      population: 30000000,
      majorCities: ['Jos', 'Lafia', 'Makurdi', 'Lokoja', 'Minna', 'Ilorin', 'Abuja'],
      keySectors: ['Agriculture', 'Mining', 'Government'],
      challenges: ['Security', 'Infrastructure', 'Education'],
      opportunities: ['Mining', 'Government Services', 'Agricultural Processing']
    },
    'South West': {
      states: ['Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Ekiti'],
      population: 40000000,
      majorCities: ['Lagos', 'Ibadan', 'Abeokuta', 'Akure', 'Osogbo', 'Ado-Ekiti'],
      keySectors: ['Finance', 'Manufacturing', 'Technology'],
      challenges: ['Infrastructure', 'Housing', 'Transportation'],
      opportunities: ['Technology Hub', 'Manufacturing', 'Financial Services']
    },
    'South East': {
      states: ['Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi'],
      population: 20000000,
      majorCities: ['Awka', 'Enugu', 'Owerri', 'Umuahia', 'Abakaliki'],
      keySectors: ['Trade', 'Manufacturing', 'Agriculture'],
      challenges: ['Infrastructure', 'Security', 'Education'],
      opportunities: ['Manufacturing', 'Trade', 'Agricultural Processing']
    },
    'South South': {
      states: ['Rivers', 'Delta', 'Bayelsa', 'Cross River', 'Akwa Ibom', 'Edo'],
      population: 35000000,
      majorCities: ['Port Harcourt', 'Warri', 'Yenagoa', 'Calabar', 'Uyo', 'Benin City'],
      keySectors: ['Oil & Gas', 'Agriculture', 'Tourism'],
      challenges: ['Environmental', 'Infrastructure', 'Security'],
      opportunities: ['Oil & Gas Processing', 'Tourism', 'Agricultural Processing']
    }
  };

  // Generate mock geographical data
  const generateMockGeographicalData = () => {
    const mockData = [];
    const regions = Object.keys(nigeriaGeography);
    
    for (let i = 0; i < 200; i++) {
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];
      const regionData = nigeriaGeography[randomRegion];
      const randomState = regionData.states[Math.floor(Math.random() * regionData.states.length)];
      const randomCity = regionData.majorCities[Math.floor(Math.random() * regionData.majorCities.length)];
      const randomSentiment = (Math.random() - 0.5) * 2; // -1 to 1
      const randomVolume = Math.floor(Math.random() * 100) + 10;
      const randomImpact = Math.random() * 10; // 0 to 10
      
      mockData.push({
        id: i,
        region: randomRegion,
        state: randomState,
        city: randomCity,
        sentiment_score: randomSentiment,
        volume: randomVolume,
        impact_score: randomImpact,
        population: regionData.population,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        source: ['Twitter', 'News', 'Television', 'Radio'][Math.floor(Math.random() * 4)],
        policy_impact: ['Economic', 'Security', 'Infrastructure', 'Education', 'Healthcare'][Math.floor(Math.random() * 5)]
      });
    }
    
    return mockData;
  };

  // Process real geographical data from API
  const processRealGeographicalData = (realData) => {
    const regionalData = {};
    const stateData = {};
    const cityData = {};
    const impactAnalysis = {};
    const demographicData = [];
    const infrastructureData = [];
    const securityData = [];
    const economicData = [];

    // Initialize regional data structure
    Object.keys(nigeriaGeography).forEach(region => {
      regionalData[region] = {
        region,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        averageSentiment: 0,
        volume: 0,
        impact_score: 0,
        population: nigeriaGeography[region].population
      };
    });

    // Process real data
    realData.forEach(record => {
      const country = record.country || 'Nigeria';
      const sentimentScore = parseFloat(record.sentiment_score) || 0;
      const sentimentLabel = (record.sentiment_label || '').toLowerCase();
      
      // Determine region based on country or source
      let region = 'Unknown';
      if (country === 'Nigeria') {
        // Try to determine region from text content
        const text = (record.text || '').toLowerCase();
        const title = (record.title || '').toLowerCase();
        
        // Simple region detection based on keywords
        if (text.includes('lagos') || text.includes('ibadan') || text.includes('ogun') || 
            text.includes('ondo') || text.includes('osun') || text.includes('oyo') || text.includes('ekiti')) {
          region = 'South West';
        } else if (text.includes('kano') || text.includes('kaduna') || text.includes('katsina') || 
                   text.includes('jigawa') || text.includes('zamfara') || text.includes('sokoto') || text.includes('kebbi')) {
          region = 'North West';
        } else if (text.includes('borno') || text.includes('yobe') || text.includes('adamawa') || 
                   text.includes('bauchi') || text.includes('gombe') || text.includes('taraba')) {
          region = 'North East';
        } else if (text.includes('plateau') || text.includes('nasarawa') || text.includes('benue') || 
                   text.includes('kogi') || text.includes('niger') || text.includes('kwara') || text.includes('abuja')) {
          region = 'North Central';
        } else if (text.includes('anambra') || text.includes('enugu') || text.includes('imo') || 
                   text.includes('abia') || text.includes('ebonyi')) {
          region = 'South East';
        } else if (text.includes('rivers') || text.includes('delta') || text.includes('bayelsa') || 
                   text.includes('cross river') || text.includes('akwa ibom') || text.includes('edo')) {
          region = 'South South';
        } else {
          // Default to most populous region
          region = 'South West';
        }
      }

      // Update regional data
      if (regionalData[region]) {
        regionalData[region].total += 1;
        regionalData[region].volume += 1; // Use count as volume
        
        if (sentimentLabel.includes('positive') || sentimentScore > 0.2) {
          regionalData[region].positive += 1;
        } else if (sentimentLabel.includes('negative') || sentimentScore < -0.2) {
          regionalData[region].negative += 1;
        } else {
          regionalData[region].neutral += 1;
        }
        
        regionalData[region].averageSentiment += sentimentScore;
      }

      // Process state data (simplified)
      const state = 'Unknown'; // Could be extracted from text if needed
      if (!stateData[state]) {
        stateData[state] = {
          state,
          region,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          volume: 0,
          impact_score: 0
        };
      }
      stateData[state].total += 1;
      stateData[state].volume += 1;
      if (sentimentLabel.includes('positive') || sentimentScore > 0.2) {
        stateData[state].positive += 1;
      } else if (sentimentLabel.includes('negative') || sentimentScore < -0.2) {
        stateData[state].negative += 1;
      } else {
        stateData[state].neutral += 1;
      }
      stateData[state].averageSentiment += sentimentScore;

      // Process city data (simplified)
      const city = 'Unknown'; // Could be extracted from text if needed
      if (!cityData[city]) {
        cityData[city] = {
          city,
          state,
          region,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          volume: 0,
          impact_score: 0
        };
      }
      cityData[city].total += 1;
      cityData[city].volume += 1;
      if (sentimentLabel.includes('positive') || sentimentScore > 0.2) {
        cityData[city].positive += 1;
      } else if (sentimentLabel.includes('negative') || sentimentScore < -0.2) {
        cityData[city].negative += 1;
      } else {
        cityData[city].neutral += 1;
      }
      cityData[city].averageSentiment += sentimentScore;

      // Process impact analysis based on source
      const source = record.source_name || record.source || 'Unknown';
      if (!impactAnalysis[source]) {
        impactAnalysis[source] = {
          policy: source,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          impact_score: 0
        };
      }
      impactAnalysis[source].total += 1;
      impactAnalysis[source].impact_score += Math.abs(sentimentScore); // Use sentiment magnitude as impact
      if (sentimentLabel.includes('positive') || sentimentScore > 0.2) {
        impactAnalysis[source].positive += 1;
      } else if (sentimentLabel.includes('negative') || sentimentScore < -0.2) {
        impactAnalysis[source].negative += 1;
      } else {
        impactAnalysis[source].neutral += 1;
      }
      impactAnalysis[source].averageSentiment += sentimentScore;
    });

    // Calculate averages
    Object.keys(regionalData).forEach(region => {
      if (regionalData[region].total > 0) {
        regionalData[region].averageSentiment /= regionalData[region].total;
        regionalData[region].impact_score = regionalData[region].total; // Use total as impact score
      }
    });

    Object.keys(stateData).forEach(state => {
      if (stateData[state].total > 0) {
        stateData[state].averageSentiment /= stateData[state].total;
        stateData[state].impact_score = stateData[state].total;
      }
    });

    Object.keys(cityData).forEach(city => {
      if (cityData[city].total > 0) {
        cityData[city].averageSentiment /= cityData[city].total;
        cityData[city].impact_score = cityData[city].total;
      }
    });

    Object.keys(impactAnalysis).forEach(source => {
      if (impactAnalysis[source].total > 0) {
        impactAnalysis[source].averageSentiment /= impactAnalysis[source].total;
        impactAnalysis[source].impact_score /= impactAnalysis[source].total;
      }
    });

    // Generate demographic, infrastructure, security, and economic data
    Object.keys(regionalData).forEach(region => {
      const data = regionalData[region];
      demographicData.push({
        region: data.region,
        population: data.population,
        sentiment: data.averageSentiment,
        impact: data.impact_score,
        volume: data.volume
      });

      infrastructureData.push({
        region: data.region,
        infrastructure_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      });

      securityData.push({
        region: data.region,
        security_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      });

      economicData.push({
        region: data.region,
        economic_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      });
    });

    return {
      regionalData: Object.values(regionalData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      stateData: Object.values(stateData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      cityData: Object.values(cityData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      impactAnalysis: Object.values(impactAnalysis).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      demographicData,
      infrastructureData,
      securityData,
      economicData
    };
  };

  // Process geographical data
  const analyzeGeographicalData = () => {
    const mockData = generateMockGeographicalData();
    
    // Regional analysis
    const regionalData = {};
    const stateData = {};
    const cityData = {};
    const impactAnalysis = {};
    const demographicData = {};
    const infrastructureData = {};
    const securityData = {};
    const economicData = {};

    Object.keys(nigeriaGeography).forEach(region => {
      regionalData[region] = {
        region,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        averageSentiment: 0,
        volume: 0,
        impact_score: 0,
        population: nigeriaGeography[region].population
      };
    });

    mockData.forEach(item => {
      const sentiment = parseFloat(item.sentiment_score);
      const region = item.region;
      const state = item.state;
      const city = item.city;
      const impact = parseFloat(item.impact_score);
      const policy = item.policy_impact;

      // Regional processing
      if (regionalData[region]) {
        regionalData[region].total += 1;
        regionalData[region].volume += item.volume;
        regionalData[region].impact_score += impact;
        
        if (sentiment > 0.3) {
          regionalData[region].positive += 1;
        } else if (sentiment < -0.3) {
          regionalData[region].negative += 1;
        } else {
          regionalData[region].neutral += 1;
        }
      }

      // State processing
      if (!stateData[state]) {
        stateData[state] = {
          state,
          region,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          volume: 0,
          impact_score: 0
        };
      }
      stateData[state].total += 1;
      stateData[state].volume += item.volume;
      stateData[state].impact_score += impact;
      
      if (sentiment > 0.3) {
        stateData[state].positive += 1;
      } else if (sentiment < -0.3) {
        stateData[state].negative += 1;
      } else {
        stateData[state].neutral += 1;
      }

      // City processing
      if (!cityData[city]) {
        cityData[city] = {
          city,
          state,
          region,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          volume: 0,
          impact_score: 0
        };
      }
      cityData[city].total += 1;
      cityData[city].volume += item.volume;
      cityData[city].impact_score += impact;
      
      if (sentiment > 0.3) {
        cityData[city].positive += 1;
      } else if (sentiment < -0.3) {
        cityData[city].negative += 1;
      } else {
        cityData[city].neutral += 1;
      }

      // Impact analysis
      if (!impactAnalysis[policy]) {
        impactAnalysis[policy] = {
          policy,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          averageSentiment: 0,
          impact_score: 0
        };
      }
      impactAnalysis[policy].total += 1;
      impactAnalysis[policy].impact_score += impact;
      
      if (sentiment > 0.3) {
        impactAnalysis[policy].positive += 1;
      } else if (sentiment < -0.3) {
        impactAnalysis[policy].negative += 1;
      } else {
        impactAnalysis[policy].neutral += 1;
      }
    });

    // Calculate averages
    Object.keys(regionalData).forEach(region => {
      if (regionalData[region].total > 0) {
        regionalData[region].averageSentiment = 
          mockData.filter(item => item.region === region)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / regionalData[region].total;
        regionalData[region].impact_score /= regionalData[region].total;
      }
    });

    Object.keys(stateData).forEach(state => {
      if (stateData[state].total > 0) {
        stateData[state].averageSentiment = 
          mockData.filter(item => item.state === state)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / stateData[state].total;
        stateData[state].impact_score /= stateData[state].total;
      }
    });

    Object.keys(cityData).forEach(city => {
      if (cityData[city].total > 0) {
        cityData[city].averageSentiment = 
          mockData.filter(item => item.city === city)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / cityData[city].total;
        cityData[city].impact_score /= cityData[city].total;
      }
    });

    Object.keys(impactAnalysis).forEach(policy => {
      if (impactAnalysis[policy].total > 0) {
        impactAnalysis[policy].averageSentiment = 
          mockData.filter(item => item.policy_impact === policy)
            .reduce((sum, item) => sum + parseFloat(item.sentiment_score), 0) / impactAnalysis[policy].total;
        impactAnalysis[policy].impact_score /= impactAnalysis[policy].total;
      }
    });

    return {
      regionalData: Object.values(regionalData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      stateData: Object.values(stateData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      cityData: Object.values(cityData).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      impactAnalysis: Object.values(impactAnalysis).map(data => ({
        ...data,
        sentiment_ratio: data.total > 0 ? (data.positive - data.negative) / data.total : 0
      })),
      demographicData: Object.values(regionalData).map(data => ({
        region: data.region,
        population: data.population,
        sentiment: data.averageSentiment,
        impact: data.impact_score,
        volume: data.volume
      })),
      infrastructureData: Object.values(regionalData).map(data => ({
        region: data.region,
        infrastructure_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      })),
      securityData: Object.values(regionalData).map(data => ({
        region: data.region,
        security_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      })),
      economicData: Object.values(regionalData).map(data => ({
        region: data.region,
        economic_score: Math.random() * 10,
        sentiment: data.averageSentiment,
        impact: data.impact_score
      }))
    };
  };

  useEffect(() => {
    const loadGeographicalData = async () => {
      try {
        setLoading(true);
        
        // Load real geographical data from the data service
        const processedData = await DataService.loadData();
        const countryData = DataService.getMentionsByCountry(processedData.rawData);
        
        if (countryData && countryData.length > 0) {
          // Transform the real data into the expected format
          const processedGeoData = processRealGeographicalData(processedData.rawData);
          setGeoData(processedGeoData);
        } else {
          // Fallback to mock data if no real data available
          const geographicalData = analyzeGeographicalData();
          setGeoData(geographicalData);
        }
      } catch (error) {
        console.error('Error loading geographical data:', error);
        // Fallback to mock data on error
        const geographicalData = analyzeGeographicalData();
        setGeoData(geographicalData);
      } finally {
        setLoading(false);
      }
    };

    loadGeographicalData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          Analyzing Geographical Distribution...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Processing regional impact and distribution analysis
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

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.3) return theme.palette.success.main;
    if (sentiment < -0.3) return theme.palette.error.main;
    return theme.palette.warning.main;
  };

  const getImpactColor = (impact) => {
    if (impact > 7) return theme.palette.success.main;
    if (impact > 4) return theme.palette.warning.main;
    return theme.palette.error.main;
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
            <MapIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
            <Typography variant="h6">
              Geographical Distribution & Impact
              <Tooltip title="Analysis of sentiment distribution across Nigeria's regions and impact assessment">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                label="Region"
              >
                <MenuItem value="all">All Regions</MenuItem>
                {Object.keys(nigeriaGeography).map(region => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                label="Metric"
              >
                <MenuItem value="sentiment">Sentiment</MenuItem>
                <MenuItem value="impact">Impact</MenuItem>
                <MenuItem value="volume">Volume</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Regional Sentiment Distribution */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Regional Sentiment Distribution
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={geoData.regionalData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
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

          {/* Regional Impact Analysis */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Regional Impact Analysis
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sentiment_ratio" name="Sentiment Ratio" />
                  <YAxis dataKey="impact_score" name="Impact Score" />
                  <ZAxis dataKey="volume" range={[50, 400]} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Scatter data={geoData.regionalData} fill={theme.palette.primary.main} />
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Policy Impact by Region */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Policy Impact by Region
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={geoData.impactAnalysis}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="policy" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="impact_score" fill={theme.palette.primary.main} name="Impact Score" />
                  <Bar dataKey="averageSentiment" fill={theme.palette.secondary.main} name="Average Sentiment" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Top States by Sentiment */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Top States by Sentiment
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>State</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Sentiment</TableCell>
                    <TableCell>Impact</TableCell>
                    <TableCell>Volume</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {geoData.stateData
                    .sort((a, b) => Math.abs(b.sentiment_ratio) - Math.abs(a.sentiment_ratio))
                    .slice(0, 10)
                    .map((state, index) => (
                      <TableRow key={index}>
                        <TableCell>{state.state}</TableCell>
                        <TableCell>{state.region}</TableCell>
                        <TableCell>
                          <Chip
                            label={state.averageSentiment.toFixed(2)}
                            size="small"
                            sx={{ 
                              backgroundColor: getSentimentColor(state.averageSentiment),
                              color: '#fff'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={state.impact_score.toFixed(2)}
                            size="small"
                            sx={{ 
                              backgroundColor: getImpactColor(state.impact_score),
                              color: '#fff'
                            }}
                          />
                        </TableCell>
                        <TableCell>{state.volume}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Infrastructure & Security Scores */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Infrastructure & Security Scores
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={geoData.infrastructureData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="infrastructure_score" fill={theme.palette.info.main} name="Infrastructure" />
                  <Bar dataKey="security_score" fill={theme.palette.warning.main} name="Security" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Regional Challenges & Opportunities */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Regional Challenges & Opportunities
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(nigeriaGeography).map(([region, data]) => (
                <Grid item xs={12} md={6} lg={4} key={region}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {region}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Population: {data.population.toLocaleString()}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Major Cities: {data.majorCities.join(', ')}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Typography variant="subtitle2" gutterBottom>
                        Key Sectors:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {data.keySectors.map((sector, idx) => (
                          <Chip
                            key={idx}
                            label={sector}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>

                      <Typography variant="subtitle2" gutterBottom>
                        Challenges:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {data.challenges.map((challenge, idx) => (
                          <Chip
                            key={idx}
                            label={challenge}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>

                      <Typography variant="subtitle2" gutterBottom>
                        Opportunities:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {data.opportunities.map((opportunity, idx) => (
                          <Chip
                            key={idx}
                            label={opportunity}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default GeographicalDistribution; 