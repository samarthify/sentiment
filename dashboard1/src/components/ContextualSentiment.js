import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha,
  CardHeader,
  Divider
} from '@mui/material';
import {
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Line,
  Cell,
  Scatter,
  ReferenceLine,
  HeatMapSeries,
  HeatMapCell,
  HeatMapAxis,
  HeatMap,
  BarChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { scaleLinear } from 'd3-scale';
import { useTranslation } from 'react-i18next';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveRadar } from '@nivo/radar';

const ContextualSentiment = ({ data }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [primaryEntity, setPrimaryEntity] = useState('all');
  const [secondaryEntity, setSecondaryEntity] = useState(null);
  const [topEntities, setTopEntities] = useState([]);
  const [contextualData, setContextualData] = useState({
    matrix: [],
    topAssociations: []
  });
  const [processedData, setProcessedData] = useState({
    entityComparisons: [],
    entityImpact: [],
    positiveShifts: [],
    negativeShifts: []
  });

  useEffect(() => {
    if (!data?.rawData) return;
    setLoading(true);

    // Extract entities and their contextual sentiment
    const processContextualSentiment = () => {
      // Common named entities by category
      const entityCategories = {
        'People': [
          'biden', 'trump', 'putin', 'sheikh', 'emir', 'tamim', 'president', 'minister', 'official', 
          'ceo', 'executive', 'professor', 'doctor', 'director', 'manager', 'leader', 'chairman',
          'ambassador', 'secretary', 'adviser', 'consultant', 'analyst', 'expert', 'specialist'
        ],
        'Organizations': [
          'qatar', 'ministry', 'government', 'university', 'foundation', 'company', 'corporation', 
          'institute', 'agency', 'bank', 'fifa', 'united nations', 'un', 'eu', 'nato', 'opec', 'gcc',
          'committee', 'council', 'association', 'federation', 'organization', 'department', 'authority',
          'commission', 'group', 'firm', 'enterprise', 'institution'
        ],
        'Locations': [
          'doha', 'lusail', 'al khor', 'al wakrah', 'al rayyan', 'dubai', 'abu dhabi', 'london', 
          'washington', 'paris', 'berlin', 'middle east', 'gulf', 'asia', 'europe', 'america',
          'qatar', 'uae', 'saudi', 'kuwait', 'bahrain', 'oman', 'region', 'city', 'country'
        ],
        'Events': [
          'world cup', 'conference', 'summit', 'meeting', 'forum', 'exhibition', 'expo', 
          'championship', 'tournament', 'election', 'ceremony', 'festival', 'celebration',
          'launch', 'opening', 'inauguration', 'announcement', 'presentation', 'symposium'
        ],
        'Topics': [
          'economy', 'business', 'finance', 'investment', 'development', 'technology', 'education',
          'health', 'sports', 'culture', 'environment', 'energy', 'sustainability', 'innovation',
          'security', 'tourism', 'trade', 'infrastructure', 'transportation', 'communication',
          'research', 'policy', 'regulation', 'strategy', 'growth', 'partnership', 'cooperation'
        ]
      };

      // Flatten the entity categories for easy lookup
      const allEntities = {};
      Object.entries(entityCategories).forEach(([category, entities]) => {
        entities.forEach(entity => {
          allEntities[entity] = category;
        });
      });

      // Process data to extract entities and their contextual sentiment
      const entityMentions = {};
      const coOccurrences = {};
      const windowSize = 50; // Words to consider for context window

      // Process each document
      data.rawData.forEach(item => {
        if (!item.text || item.sentiment_score === undefined) return;
        
        const text = item.text.toLowerCase();
        const words = text.split(/\s+/);
        const itemSentiment = parseFloat(item.sentiment_score);
        
        // Find all entity mentions with their positions
        const entityPositions = [];
        Object.keys(allEntities).forEach(entity => {
          let pos = -1;
          const entityWords = entity.split(' ');
          
          while ((pos = text.indexOf(entity, pos + 1)) !== -1) {
            // Ensure we match whole words
            const beforeChar = pos === 0 ? ' ' : text[pos - 1];
            const afterChar = pos + entity.length >= text.length ? ' ' : text[pos + entity.length];
            
            if (/[\s.,!?]/.test(beforeChar) && /[\s.,!?]/.test(afterChar)) {
              entityPositions.push({
                entity,
                position: pos,
                length: entity.length
              });
              
              // Initialize entity if not existing
              if (!entityMentions[entity]) {
                entityMentions[entity] = {
                  name: entity,
                  category: allEntities[entity],
                  count: 0,
                  sentimentSum: 0,
                  sentimentAvg: 0,
                  contextualSentiments: [] // Track individual context sentiments
                };
              }
              
              // Update entity counts
              entityMentions[entity].count += 1;
            }
          }
        });
        
        // Sort entity positions
        entityPositions.sort((a, b) => a.position - b.position);
        
        // Process each entity mention with its context
        entityPositions.forEach((mention, idx) => {
          // Calculate local context sentiment
          const contextStart = Math.max(0, mention.position - windowSize);
          const contextEnd = Math.min(text.length, mention.position + mention.length + windowSize);
          const context = text.substring(contextStart, contextEnd);
          
          // Add sentiment to entity
          entityMentions[mention.entity].sentimentSum += itemSentiment;
          entityMentions[mention.entity].contextualSentiments.push(itemSentiment);
          
          // Process co-occurrences within context window
          entityPositions.forEach((otherMention, otherIdx) => {
            if (idx !== otherIdx && 
                Math.abs(mention.position - otherMention.position) <= windowSize) {
              const [entity1, entity2] = [mention.entity, otherMention.entity].sort();
              const pairKey = `${entity1}|${entity2}`;
              
              if (!coOccurrences[pairKey]) {
                coOccurrences[pairKey] = {
                  pair: [entity1, entity2],
                  count: 0,
                  sentimentSum: 0,
                  sentimentAvg: 0,
                  contexts: [] // Track individual context sentiments
                };
              }
              
              coOccurrences[pairKey].count += 1;
              coOccurrences[pairKey].sentimentSum += itemSentiment;
              coOccurrences[pairKey].contexts.push(itemSentiment);
            }
          });
        });
      });

      // Calculate average sentiment and variance for entities
      Object.values(entityMentions).forEach(entity => {
        if (entity.count > 0) {
          entity.sentimentAvg = entity.sentimentSum / entity.count;
          
          // Calculate sentiment variance
          const mean = entity.sentimentAvg;
          const variance = entity.contextualSentiments.reduce((sum, val) => 
            sum + Math.pow(val - mean, 2), 0) / entity.count;
          entity.sentimentVariance = variance;
        }
      });
      
      // Calculate average sentiment and impact for co-occurrences
      Object.values(coOccurrences).forEach(pair => {
        if (pair.count > 0) {
          pair.sentimentAvg = pair.sentimentSum / pair.count;
          
          // Calculate sentiment variance for the pair
          const mean = pair.sentimentAvg;
          const variance = pair.contexts.reduce((sum, val) => 
            sum + Math.pow(val - mean, 2), 0) / pair.count;
          pair.sentimentVariance = variance;
        }
      });

      // Sort entities by frequency and significance
      const sortedEntities = Object.values(entityMentions)
        .filter(e => e.count >= 3) // Minimum mentions threshold
        .sort((a, b) => {
          // Score based on frequency and sentiment impact
          const scoreA = a.count * Math.abs(a.sentimentAvg);
          const scoreB = b.count * Math.abs(b.sentimentAvg);
          return scoreB - scoreA;
        })
        .slice(0, 20); // Get top 20 entities
      
      // Calculate sentiment shifts for co-occurrences
      const associationImpact = Object.values(coOccurrences)
        .filter(pair => pair.count >= 2) // Minimum co-occurrence threshold
        .map(pair => {
          const [entity1, entity2] = pair.pair;
          const entity1Data = entityMentions[entity1];
          const entity2Data = entityMentions[entity2];
          
          if (!entity1Data || !entity2Data) return null;
          
          const entity1Sentiment = entity1Data.sentimentAvg;
          const entity2Sentiment = entity2Data.sentimentAvg;
          const pairSentiment = pair.sentimentAvg;
          
          // Calculate weighted sentiment shift
          const baseSentiment = (entity1Sentiment + entity2Sentiment) / 2;
          const sentimentShift = pairSentiment - baseSentiment;
          
          // Calculate significance score based on frequency and shift magnitude
          const significanceScore = pair.count * Math.abs(sentimentShift) * 
            (1 + Math.min(entity1Data.count, entity2Data.count) / 10);
          
          return {
            entity1,
            entity2,
            entity1Sentiment,
            entity2Sentiment,
            pairSentiment,
            sentimentShift,
            count: pair.count,
            significance: significanceScore
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.significance - a.significance);
      
      // Separate positive and negative shifts
      const positiveShifts = associationImpact
        .filter(pair => pair.sentimentShift > 0)
        .slice(0, 10);
      
      const negativeShifts = associationImpact
        .filter(pair => pair.sentimentShift < 0)
        .slice(0, 10);
      
      // Create sentiment matrix for visualization
      const topEntityNames = sortedEntities.map(e => e.name);
      const matrix = [];
      
      for (const entity1 of topEntityNames) {
        const row = { entity: entity1 };
        
        for (const entity2 of topEntityNames) {
          if (entity1 === entity2) {
            row[entity2] = entityMentions[entity1].sentimentAvg;
          } else {
            const pairKey1 = `${entity1}|${entity2}`;
            const pairKey2 = `${entity2}|${entity1}`;
            const pairData = coOccurrences[pairKey1] || coOccurrences[pairKey2];
            
            row[entity2] = pairData ? pairData.sentimentAvg : null;
          }
        }
        
        matrix.push(row);
      }

      return {
        entities: sortedEntities,
        topAssociations: [...positiveShifts, ...negativeShifts],
        matrix: matrix
      };
    };

    const contextualData = processContextualSentiment();
    setTopEntities(contextualData.entities);
    setContextualData({
      matrix: contextualData.matrix,
      topAssociations: contextualData.topAssociations
    });
    
    // Set default primary entity from top entities
    if (contextualData.entities.length > 0) {
      // Find the most significant entity
      const mostSignificantEntity = contextualData.entities
        .sort((a, b) => (b.count * Math.abs(b.sentimentAvg)) - (a.count * Math.abs(a.sentimentAvg)))[0];
      
      setPrimaryEntity(mostSignificantEntity.name);
    }
    
    setLoading(false);
  }, [data]);

  // Filter associations for selected entity
  const filteredAssociations = React.useMemo(() => {
    if (primaryEntity === 'all') return contextualData.topAssociations;
    
    return contextualData.topAssociations.filter(
      item => item.entity1 === primaryEntity || item.entity2 === primaryEntity
    );
  }, [contextualData.topAssociations, primaryEntity]);

  // Get contextual sentiment data for radar chart
  const radarData = React.useMemo(() => {
    if (!primaryEntity || primaryEntity === 'all') return [];
    
    const entityPairs = contextualData.topAssociations.filter(
      item => item.entity1 === primaryEntity || item.entity2 === primaryEntity
    );
    
    return entityPairs.map(pair => {
      const otherEntity = pair.entity1 === primaryEntity ? pair.entity2 : pair.entity1;
      
      return {
        subject: otherEntity,
        primaryAlone: (pair.entity1 === primaryEntity ? pair.entity1Sentiment : pair.entity2Sentiment).toFixed(2),
        together: pair.pairSentiment.toFixed(2),
        otherAlone: (pair.entity1 === primaryEntity ? pair.entity2Sentiment : pair.entity1Sentiment).toFixed(2),
      };
    }).slice(0, 8); // Limit to top 8 for readability
  }, [primaryEntity, contextualData.topAssociations]);

  // Prepare bar chart data
  const associationBarData = React.useMemo(() => {
    return filteredAssociations.map(assoc => ({
      name: `${assoc.entity1} + ${assoc.entity2}`,
      entity1Name: assoc.entity1,
      entity2Name: assoc.entity2, 
      entity1Alone: assoc.entity1Sentiment,
      entity2Alone: assoc.entity2Sentiment,
      together: assoc.pairSentiment,
      shift: assoc.sentimentShift,
      count: assoc.count
    })).slice(0, 10); // Limit to top 10 for readability
  }, [filteredAssociations]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Define sentiment color scale
  const sentimentColorScale = scaleLinear()
    .domain([-1, 0, 1])
    .range([theme.palette.error.main, theme.palette.grey[400], theme.palette.success.main]);

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Card sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, maxWidth: 300 }}>
          <Typography variant="subtitle2">
            {data.entity1Name} + {data.entity2Name}
          </Typography>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="body2">
              <strong>{data.entity1Name}</strong> {t('contextualSentiment.alone')}: {data.entity1Alone.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              <strong>{data.entity2Name}</strong> {t('contextualSentiment.alone')}: {data.entity2Alone.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              {t('contextualSentiment.together')}: {data.together.toFixed(2)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ 
            color: data.shift > 0 ? theme.palette.success.main : theme.palette.error.main,
            fontWeight: 'bold'
          }}>
            {t('contextualSentiment.sentimentShift')}: {data.shift > 0 ? '+' : ''}{data.shift.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('contextualSentiment.basedOn')} {data.count} {t('contextualSentiment.mentions')}
          </Typography>
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
            <Typography variant="h6" gutterBottom>
              {t('contextualSentiment.title')}
              <Tooltip title={t('charts.contextualSentimentTooltip')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('contextualSentiment.focusEntity')}</InputLabel>
            <Select
              value={primaryEntity}
              onChange={(e) => setPrimaryEntity(e.target.value)}
              label={t('contextualSentiment.focusEntity')}
            >
              <MenuItem value="all">{t('contextualSentiment.allEntities')}</MenuItem>
              {topEntities.map((entity) => (
                <MenuItem key={entity.name} value={entity.name}>
                  {entity.name.charAt(0).toUpperCase() + entity.name.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* Contextual Sentiment Shift - Bar Chart */}
          <Grid item xs={12} md={primaryEntity !== 'all' ? 7 : 12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('contextualSentiment.sentimentShiftWhenEntitiesAreMentionedTogether')}
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={associationBarData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={[-1, 1]} 
                    tickFormatter={(value) => value.toFixed(1)} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tickLine={false}
                    tickFormatter={(value) => {
                      return value.length > 15 ? `${value.substring(0, 15)}...` : value;
                    }}
                  />
                  <RechartsTooltip content={customTooltip} />
                  <ReferenceLine x={0} stroke={theme.palette.divider} />
                  <Bar dataKey="entity1Alone" stackId="a" fill={alpha(theme.palette.primary.main, 0.3)} name={t('contextualSentiment.entity1Alone')} />
                  <Bar dataKey="entity2Alone" stackId="b" fill={alpha(theme.palette.secondary.main, 0.3)} name={t('contextualSentiment.entity2Alone')} />
                  <Bar dataKey="together" name={t('contextualSentiment.together')} radius={[0, 4, 4, 0]}>
                    {associationBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={sentimentColorScale(entry.together)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Radar Chart showing relationship impact (only visible when entity is selected) */}
          {primaryEntity !== 'all' && (
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" gutterBottom>
                {t('contextualSentiment.impactOf')} {primaryEntity.charAt(0).toUpperCase() + primaryEntity.slice(1)} {t('contextualSentiment.withOtherEntities')}
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={150} data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[-1, 1]} />
                    <Radar
                      name={`${primaryEntity} ${t('contextualSentiment.alone')}`}
                      dataKey="primaryAlone"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={t('contextualSentiment.together')}
                      dataKey="together"
                      stroke={theme.palette.secondary.main}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.5}
                    />
                    <Legend />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          )}

          {/* Top Positive and Negative Shifts */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('contextualSentiment.significantContextualShifts')}
            </Typography>
            <Grid container spacing={2}>
              {/* Positive Shifts */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', backgroundColor: alpha(theme.palette.success.light, 0.1) }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ArrowUpwardIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                      <Typography variant="h6">{t('contextualSentiment.mostPositiveShifts')}</Typography>
                    </Box>
                    
                    {contextualData.topAssociations
                      .filter(item => item.sentimentShift > 0)
                      .sort((a, b) => b.sentimentShift - a.sentimentShift)
                      .slice(0, 5)
                      .map((item, index) => (
                        <Box key={index} sx={{ mb: 1, p: 1, borderRadius: 1, backgroundColor: alpha(theme.palette.success.light, 0.1 * (6 - index) / 5) }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.entity1} + {item.entity2}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              {t('contextualSentiment.base')}: {((item.entity1Sentiment + item.entity2Sentiment) / 2).toFixed(2)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`+${item.sentimentShift.toFixed(2)}`} 
                              sx={{ 
                                backgroundColor: sentimentColorScale(item.sentimentShift),
                                color: '#fff',
                                fontWeight: 'bold' 
                              }}
                            />
                          </Box>
                        </Box>
                      ))
                    }
                  </CardContent>
                </Card>
              </Grid>

              {/* Negative Shifts */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', backgroundColor: alpha(theme.palette.error.light, 0.1) }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ArrowDownwardIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                      <Typography variant="h6">{t('contextualSentiment.mostNegativeShifts')}</Typography>
                    </Box>

                    {contextualData.topAssociations
                      .filter(item => item.sentimentShift < 0)
                      .sort((a, b) => a.sentimentShift - b.sentimentShift)
                      .slice(0, 5)
                      .map((item, index) => (
                        <Box key={index} sx={{ mb: 1, p: 1, borderRadius: 1, backgroundColor: alpha(theme.palette.error.light, 0.1 * (6 - index) / 5) }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.entity1} + {item.entity2}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              {t('contextualSentiment.base')}: {((item.entity1Sentiment + item.entity2Sentiment) / 2).toFixed(2)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={item.sentimentShift.toFixed(2)} 
                              sx={{ 
                                backgroundColor: sentimentColorScale(item.sentimentShift),
                                color: '#fff',
                                fontWeight: 'bold' 
                              }}
                            />
                          </Box>
                        </Box>
                      ))
                    }
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default ContextualSentiment; 