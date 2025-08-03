import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Slider,
  Tooltip,
  alpha,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import { scaleLinear } from 'd3-scale';
import { useTranslation } from 'react-i18next';

const EntityRelationshipGraph = ({ data }) => {
  const theme = useTheme();
  const graphRef = useRef();
  const { t } = useTranslation();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [threshold, setThreshold] = useState(3); // Increased default threshold
  const [entityFilter, setEntityFilter] = useState('all');
  const [showLabels, setShowLabels] = useState(false);
  const [limitConnections, setLimitConnections] = useState(true);

  useEffect(() => {
    if (!data?.rawData) return;
    setLoading(true);

    // Process data to extract entities and their relationships
    const extractEntities = () => {
      const entities = {};
      const relationships = {};
      
      // Predefined entity types to look for
      const entityTypes = {
        person: ['person', 'individual', 'president', 'minister', 'official', 'leader', 'ceo', 'executive', 'doctor', 'professor'],
        organization: ['company', 'organization', 'government', 'ministry', 'agency', 'institution', 'corporation', 'university', 'committee'],
        location: ['country', 'city', 'place', 'region', 'area', 'district', 'zone', 'location'],
        event: ['event', 'conference', 'meeting', 'summit', 'announcement', 'launch', 'ceremony', 'celebration']
      };
      
      // Common named entities (simplified for demo)
      const namedEntities = {
        person: ['john', 'james', 'mary', 'david', 'sarah', 'michael', 'robert', 'william', 'richard', 'joseph', 'thomas', 'elizabeth', 'jennifer', 'emily', 'mohammed', 'ali', 'fatima', 'abbas', 'sheikh', 'emir', 'sheikh tamim', 'tamim al thani', 'biden', 'trump', 'putin'],
        organization: ['qatar', 'ministry', 'government', 'university', 'foundation', 'company', 'corporation', 'institute', 'agency', 'school', 'hospital', 'bank', 'fifa', 'world cup', 'committee', 'united nations', 'un', 'eu', 'nato', 'opec', 'gcc'],
        location: ['doha', 'lusail', 'al khor', 'al wakrah', 'al rayyan', 'dubai', 'abu dhabi', 'london', 'new york', 'washington', 'paris', 'berlin', 'tokyo', 'beijing', 'moscow'],
        event: ['world cup', 'conference', 'summit', 'meeting', 'forum', 'exhibition', 'expo', 'championship', 'tournament', 'election', 'vote', 'agreement', 'deal', 'contract', 'announcement']
      };

      // Function to find entities in text
      const findEntitiesInText = (text) => {
        const foundEntities = new Set();
        const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ');
        
        // Check for multi-word entities first
        for (const type in namedEntities) {
          for (const entity of namedEntities[type]) {
            if (entity.includes(' ')) {
              if (text.toLowerCase().includes(entity)) {
                foundEntities.add({ name: entity, type });
              }
            }
          }
        }
        
        // Then check single words
        for (const word of words) {
          if (word.length < 3) continue; // Skip very short words
          
          for (const type in namedEntities) {
            for (const entity of namedEntities[type]) {
              if (!entity.includes(' ') && word === entity) {
                foundEntities.add({ name: entity, type });
              }
            }
          }
        }
        
        return Array.from(foundEntities);
      };

      // Process each document to find entities and their co-occurrences
      data.rawData.forEach(item => {
        if (!item.text) return;
        
        const foundEntities = findEntitiesInText(item.text);
        
        // Add entities to our registry
        foundEntities.forEach(entity => {
          if (!entities[entity.name]) {
            entities[entity.name] = {
              name: entity.name,
              type: entity.type,
              count: 0,
              sentiment: 0,
              sentimentCount: 0
            };
          }
          
          entities[entity.name].count += 1;
          
          // Add sentiment if available
          if (item.sentiment_score !== undefined) {
            entities[entity.name].sentiment += parseFloat(item.sentiment_score);
            entities[entity.name].sentimentCount += 1;
          }
        });
        
        // Create relationships between co-occurring entities
        for (let i = 0; i < foundEntities.length; i++) {
          for (let j = i + 1; j < foundEntities.length; j++) {
            const entity1 = foundEntities[i].name;
            const entity2 = foundEntities[j].name;
            
            // Create unique relationship ID
            const relId = [entity1, entity2].sort().join('_');
            
            if (!relationships[relId]) {
              relationships[relId] = {
                source: entity1,
                target: entity2,
                value: 0,
                documents: new Set(),
                sentiment: 0
              };
            }
            
            relationships[relId].value += 1;
            relationships[relId].documents.add(item.id || Math.random().toString());
            
            // Add sentiment data to relationship
            if (item.sentiment_score !== undefined) {
              relationships[relId].sentiment += parseFloat(item.sentiment_score);
            }
          }
        }
      });
      
      // Filter entities by occurrence threshold
      const filteredEntities = Object.values(entities).filter(e => e.count >= threshold);
      
      // Calculate average sentiment for each entity
      filteredEntities.forEach(entity => {
        if (entity.sentimentCount > 0) {
          entity.sentiment = entity.sentiment / entity.sentimentCount;
        }
      });
      
      // Filter relationships to only include entities that passed the threshold
      const entitySet = new Set(filteredEntities.map(e => e.name));
      let filteredRelationships = Object.values(relationships)
        .filter(rel => entitySet.has(rel.source) && entitySet.has(rel.target))
        .map(rel => ({
          ...rel,
          sentiment: rel.sentiment / rel.value, // Average sentiment per relationship
          documents: Array.from(rel.documents).length
        }));
      
      // Limit connections to reduce visual clutter if enabled
      if (limitConnections) {
        // Sort relationships by value (strongest connections first)
        filteredRelationships = filteredRelationships
          .sort((a, b) => b.value - a.value)
          .slice(0, 100); // Only keep top 100 connections
      }

      // Create graph data
      return {
        nodes: filteredEntities.map(entity => ({
          id: entity.name,
          name: entity.name.charAt(0).toUpperCase() + entity.name.slice(1),
          type: entity.type,
          val: entity.count,
          sentiment: entity.sentiment
        })),
        links: filteredRelationships.map(rel => ({
          source: rel.source,
          target: rel.target,
          value: rel.value,
          sentiment: rel.sentiment
        }))
      };
    };

    // Create graph data with entities and relationships
    const graphData = extractEntities();
    setGraphData(graphData);
    setLoading(false);
  }, [data, threshold, limitConnections]);

  // Filter graph data based on entity type
  const filteredGraphData = React.useMemo(() => {
    if (entityFilter === 'all') return graphData;
    
    const filteredNodes = graphData.nodes.filter(node => node.type === entityFilter);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    const filteredLinks = graphData.links.filter(
      link => nodeIds.has(link.source.id || link.source) && nodeIds.has(link.target.id || link.target)
    );
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, entityFilter]);

  const handleNodeClick = node => {
    setSelectedNode(node);
    
    // Highlight connected nodes
    const connectedNodeIds = new Set();
    graphData.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      
      if (sourceId === node.id) connectedNodeIds.add(targetId);
      if (targetId === node.id) connectedNodeIds.add(sourceId);
    });
    
    setHighlightNodes(connectedNodeIds);
    
    // Highlight connected links
    const connectedLinks = new Set();
    graphData.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      
      if (sourceId === node.id || targetId === node.id) {
        connectedLinks.add(link);
      }
    });
    
    setHighlightLinks(connectedLinks);
  };

  const resetHighlight = () => {
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    setSelectedNode(null);
    if (graphRef.current) {
      graphRef.current.zoomToFit(300, 50);
      setZoomLevel(1);
    }
  };

  const handleZoomIn = () => {
    if (graphRef.current) {
      const newZoom = zoomLevel * 1.2;
      setZoomLevel(newZoom);
      graphRef.current.zoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const newZoom = zoomLevel * 0.8;
      setZoomLevel(newZoom);
      graphRef.current.zoom(newZoom);
    }
  };

  const handleThresholdChange = (event, newValue) => {
    setThreshold(newValue);
  };

  // Get color by entity type
  const getEntityColor = (type) => {
    switch (type) {
      case 'person':
        return '#4CAF50'; // Green
      case 'organization':
        return '#2196F3'; // Blue
      case 'location':
        return '#FFC107'; // Amber
      case 'event':
        return '#9C27B0'; // Purple
      default:
        return '#757575'; // Grey
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" gutterBottom>
            {t('entityRelationship.title')}
            <Tooltip title={t('charts.entityRelationshipTooltip')}>
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('entityRelationship.entityType')}</InputLabel>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                label={t('entityRelationship.entityType')}
              >
                <MenuItem value="all">{t('entityRelationship.allTypes')}</MenuItem>
                <MenuItem value="person">{t('entityRelationship.people')}</MenuItem>
                <MenuItem value="organization">{t('entityRelationship.organizations')}</MenuItem>
                <MenuItem value="location">{t('entityRelationship.locations')}</MenuItem>
                <MenuItem value="event">{t('entityRelationship.events')}</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ width: 120, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {t('entityRelationship.min')}:
              </Typography>
              <Slider
                value={threshold}
                min={1}
                max={10}
                step={1}
                onChange={handleThresholdChange}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={limitConnections}
                  onChange={(e) => setLimitConnections(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="caption">{t('entityRelationship.limitLinks')}</Typography>}
              sx={{ mx: 0, my: 0 }}
            />
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={resetHighlight} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ height: 350, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
          {filteredGraphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={filteredGraphData}
              nodeLabel={node => `${node.name} (${node.val} ${t('entityRelationship.mentions')})`}
              nodeColor={node => {
                // Use color by entity type instead of sentiment for better visual distinction
                const baseColor = getEntityColor(node.type);
                
                if (highlightNodes.size > 0) {
                  return selectedNode && node.id === selectedNode.id 
                    ? '#FF5722' // Highlight selected node in orange
                    : highlightNodes.has(node.id) 
                      ? baseColor 
                      : alpha(theme.palette.grey[300], 0.3);
                }
                return baseColor;
              }}
              nodeVal={node => Math.min(Math.sqrt(node.val) * 0.8, 15)} // Cap maximum node size
              nodeRelSize={3} // Smaller base node size
              linkWidth={link => {
                if (highlightLinks.size > 0) {
                  return highlightLinks.has(link) ? 1.5 : 0.2;
                }
                return 0.5; // Thinner links overall
              }}
              linkColor={link => {
                if (highlightLinks.size > 0) {
                  return highlightLinks.has(link) ? alpha('#666666', 0.8) : alpha(theme.palette.grey[300], 0.2);
                }
                return alpha('#666666', 0.3); // More transparent links
              }}
              nodeCanvasObject={(node, ctx, globalScale) => {
                // Draw the node circle
                const size = Math.max(2, Math.sqrt(node.val) * 0.8);
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                
                // Use entity type color
                const color = node.id === selectedNode?.id 
                  ? '#FF5722' 
                  : highlightNodes.size > 0 && !highlightNodes.has(node.id) && node.id !== selectedNode?.id
                    ? alpha(theme.palette.grey[300], 0.3)
                    : getEntityColor(node.type);
                
                ctx.fillStyle = color;
                ctx.fill();
                
                // Always draw labels for selected or highlighted nodes
                if (node.id === selectedNode?.id || highlightNodes.has(node.id)) {
                  const label = node.name;
                  const fontSize = node.id === selectedNode?.id ? 5 : 3;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = node.id === selectedNode?.id ? '#000' : '#333';
                  
                  // Add a background rectangle for better readability
                  const textWidth = ctx.measureText(label).width;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.fillRect(
                    node.x - textWidth / 2 - 2,
                    node.y + size + 2,
                    textWidth + 4,
                    fontSize + 4
                  );
                  
                  // Draw the text
                  ctx.fillStyle = node.id === selectedNode?.id ? '#000' : '#333';
                  ctx.fillText(label, node.x, node.y + size + fontSize);
                }
              }}
              onNodeClick={handleNodeClick}
              cooldownTicks={50}
              onEngineStop={() => graphRef.current.zoomToFit(300, 50)}
              linkDirectionalParticles={0}
              width={undefined}
              height={350}
              d3AlphaDecay={0.01} // Slower layout stabilization
              d3VelocityDecay={0.4} // More node separation
              d3Force={('charge', null)} // Customize force
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                {t('entityRelationship.noEntitiesFound')}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            size="small" 
            icon={<CategoryIcon sx={{ fontSize: '0.875rem !important' }} />} 
            label={t('entityRelationship.people')}
            sx={{ backgroundColor: getEntityColor('person'), color: 'white', fontSize: '0.7rem' }} 
          />
          <Chip 
            size="small" 
            icon={<CategoryIcon sx={{ fontSize: '0.875rem !important' }} />} 
            label={t('entityRelationship.organizations')}
            sx={{ backgroundColor: getEntityColor('organization'), color: 'white', fontSize: '0.7rem' }} 
          />
          <Chip 
            size="small" 
            icon={<CategoryIcon sx={{ fontSize: '0.875rem !important' }} />} 
            label={t('entityRelationship.locations')}
            sx={{ backgroundColor: getEntityColor('location'), color: 'white', fontSize: '0.7rem' }} 
          />
          <Chip 
            size="small" 
            icon={<CategoryIcon sx={{ fontSize: '0.875rem !important' }} />} 
            label={t('entityRelationship.events')}
            sx={{ backgroundColor: getEntityColor('event'), color: 'white', fontSize: '0.7rem' }} 
          />
        </Box>

        {selectedNode && (
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="subtitle1">{selectedNode.name}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('entityRelationship.type')}: {t(`entityRelationship.entityTypes.${selectedNode.type}`)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('entityRelationship.mentions')}: {selectedNode.val}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('entityRelationship.connectedTo')}: {highlightNodes.size} {t('entityRelationship.entities')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" mr={1}>{t('entityRelationship.sentiment')}:</Typography>
                  <Box
                    sx={{
                      width: 60,
                      height: 8,
                      borderRadius: 1,
                      background: `linear-gradient(to right, ${theme.palette.error.main}, ${theme.palette.grey[400]}, ${theme.palette.success.main})`,
                      position: 'relative',
                      mr: 1
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -3,
                        width: 2,
                        height: 14,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'text.secondary',
                        left: `${((selectedNode.sentiment + 1) / 2) * 100}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {selectedNode.sentiment.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>
    </motion.div>
  );
};

export default EntityRelationshipGraph; 