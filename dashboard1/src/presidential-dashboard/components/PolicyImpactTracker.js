import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  CompareArrows,
  CalendarToday,
  Assessment,
  Policy,
  Warning,
  CheckCircle,
  Info,
  ExpandMore,
  ExpandLess,
  Refresh,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';
import dataService from '../../services/DataService';

// Import useAuth hook
let useAuth = null;
try {
  const authModule = require('../../contexts/AuthContext.tsx');
  useAuth = authModule.useAuth;
} catch (error) {
  useAuth = () => ({ accessToken: null });
}

const PolicyImpactTracker = ({ data, loading }) => {
  const { t } = useTranslation();
  const authContext = useAuth();
  const accessToken = authContext?.accessToken || null;
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [mentionsDialogOpen, setMentionsDialogOpen] = useState(false);
  const [selectedPolicyMentions, setSelectedPolicyMentions] = useState([]);

  // Mock data as fallback
  const mockPolicies = [
    {
      id: 'fuel_subsidy',
      name: 'Fuel Subsidy Removal',
      announcement_date: '2023-05-29',
      status: 'active',
      current_sentiment: -0.65,
      pre_announcement: 0.2,
      post_announcement: -0.8,
      peak_negative: -0.85,
      recovery_rate: 0.15,
      media_coverage: 1250,
      public_reaction: 'high_negative'
    },
    {
      id: 'exchange_rate',
      name: 'Exchange Rate Policy',
      announcement_date: '2023-06-14',
      status: 'active',
      current_sentiment: -0.45,
      pre_announcement: 0.1,
      post_announcement: -0.7,
      peak_negative: -0.75,
      recovery_rate: 0.3,
      media_coverage: 890,
      public_reaction: 'moderate_negative'
    },
    {
      id: 'security_measures',
      name: 'Security Measures',
      announcement_date: '2023-07-01',
      status: 'active',
      current_sentiment: 0.35,
      pre_announcement: 0.3,
      post_announcement: 0.4,
      peak_positive: 0.45,
      recovery_rate: 0.1,
      media_coverage: 650,
      public_reaction: 'positive'
    },
    {
      id: 'economic_reforms',
      name: 'Economic Reforms',
      announcement_date: '2023-08-15',
      status: 'recent',
      current_sentiment: -0.25,
      pre_announcement: 0.0,
      post_announcement: -0.4,
      peak_negative: -0.5,
      recovery_rate: 0.25,
      media_coverage: 450,
      public_reaction: 'mixed'
    }
  ];



  useEffect(() => {
    loadPolicyData();
  }, [accessToken]);

  const loadPolicyData = async () => {
    setPolicyLoading(true);
    setError(null);
    
    try {
      const result = await dataService.getPolicyImpactData(accessToken);
      
      if (result.status === 'success' && result.data && result.data.length > 0) {
        console.log('Loaded real policy data:', result.data.length, 'policies');
        setPolicies(result.data);
      } else {
        console.log('No real policy data available, using mock data');
        setPolicies(mockPolicies);
      }
    } catch (error) {
      console.error('Error loading policy data:', error);
      setError('Failed to load policy data. Using sample data.');
      setPolicies(mockPolicies);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPolicyData();
  };

  const generatePolicyReport = async (policy) => {
    setReportGenerating(true);
    
    try {
      // Create comprehensive report data
      const reportData = {
        policyName: policy.name,
        announcementDate: policy.announcement_date,
        currentDate: new Date().toISOString().split('T')[0],
        metrics: {
          preAnnouncementSentiment: policy.pre_announcement,
          postAnnouncementSentiment: policy.post_announcement,
          currentSentiment: policy.current_sentiment,
          peakNegativeSentiment: policy.peak_negative,
          recoveryRate: policy.recovery_rate,
          mediaCoverage: policy.media_coverage,
          publicReaction: policy.public_reaction
        },
        timeline: generateTimelineData(policy),
        analysis: {
          sentimentChange: policy.post_announcement - policy.pre_announcement,
          recoveryProgress: calculateRecoveryProgress(policy),
          impactLevel: getImpactLevel(policy),
          recommendations: generateRecommendations(policy)
        }
      };

      // Generate PDF report
      const reportBlob = await generatePDFReport(reportData);
      
      // Download the report
      const url = window.URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Policy_Impact_Report_${policy.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  };

  const getImpactLevel = (policy) => {
    const sentimentChange = Math.abs(policy.post_announcement - policy.pre_announcement);
    if (sentimentChange > 0.5) return 'High Impact';
    if (sentimentChange > 0.3) return 'Medium Impact';
    return 'Low Impact';
  };

  const generateRecommendations = (policy) => {
    const recommendations = [];
    
    if (policy.current_sentiment < -0.3) {
      recommendations.push('Consider communication strategy to address negative sentiment');
      recommendations.push('Monitor media coverage for potential crisis management');
    }
    
    if (policy.recovery_rate < 0.3) {
      recommendations.push('Implement recovery measures to improve public perception');
      recommendations.push('Review policy implementation approach');
    }
    
    if (policy.media_coverage > 1000) {
      recommendations.push('High media attention - ensure consistent messaging');
      recommendations.push('Consider proactive media engagement strategy');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring public sentiment');
      recommendations.push('Maintain current communication strategy');
    }
    
    return recommendations;
  };

  const generatePDFReport = async (reportData) => {
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Set up PDF styling
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Policy Impact Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Policy Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Policy Details', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Policy Name: ${reportData.policyName}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Announcement Date: ${new Date(reportData.announcementDate).toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Report Generated: ${new Date(reportData.currentDate).toLocaleDateString()}`, margin, yPosition);
      yPosition += 15;
      
      // Key Metrics
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Metrics', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Pre-Announcement Sentiment: ${reportData.metrics.preAnnouncementSentiment.toFixed(3)}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Post-Announcement Sentiment: ${reportData.metrics.postAnnouncementSentiment.toFixed(3)}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Current Sentiment: ${reportData.metrics.currentSentiment.toFixed(3)}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Peak Negative Sentiment: ${reportData.metrics.peakNegativeSentiment?.toFixed(3) || 'N/A'}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Recovery Rate: ${(reportData.metrics.recoveryRate * 100).toFixed(1)}%`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Media Coverage: ${reportData.metrics.mediaCoverage} mentions`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Public Reaction: ${reportData.metrics.publicReaction.replace('_', ' ').toUpperCase()}`, margin, yPosition);
      yPosition += 15;
      
      // Analysis
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Impact Analysis', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Impact Level: ${reportData.analysis.impactLevel}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Sentiment Change: ${reportData.analysis.sentimentChange.toFixed(3)}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Recovery Progress: ${reportData.analysis.recoveryProgress.toFixed(1)}%`, margin, yPosition);
      yPosition += 15;
      
      // Recommendations
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recommendations', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      reportData.analysis.recommendations.forEach((rec, index) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${index + 1}. ${rec}`, margin, yPosition);
        yPosition += 8;
      });
      
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report. Please try again.');
    }
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment >= 0.5) return 'success';
    if (sentiment >= 0.1) return 'info';
    if (sentiment >= -0.1) return 'default';
    if (sentiment >= -0.5) return 'warning';
    return 'error';
  };

  const getSentimentLabel = (sentiment) => {
    if (sentiment >= 0.5) return 'Very Positive';
    if (sentiment >= 0.1) return 'Positive';
    if (sentiment >= -0.1) return 'Neutral';
    if (sentiment >= -0.5) return 'Negative';
    return 'Very Negative';
  };

  const getReactionIcon = (reaction) => {
    switch (reaction) {
      case 'positive': return <CheckCircle color="success" />;
      case 'high_negative': return <Warning color="error" />;
      case 'moderate_negative': return <Warning color="warning" />;
      case 'mixed': return <Info color="info" />;
      default: return <Info color="info" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateRecoveryProgress = (policy) => {
    const totalChange = Math.abs(policy.post_announcement - policy.pre_announcement);
    const recovered = Math.abs(policy.current_sentiment - policy.post_announcement);
    return Math.min((recovered / totalChange) * 100, 100);
  };

  const generateTimelineData = (policy) => {
    const announcementDate = new Date(policy.announcement_date);
    const data = [];
    
    // Pre-announcement data
    for (let i = 7; i >= 1; i--) {
      const date = new Date(announcementDate);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        sentiment: policy.pre_announcement + (Math.random() - 0.5) * 0.2,
        phase: 'pre'
      });
    }
    
    // Announcement day
    data.push({
      date: policy.announcement_date,
      sentiment: policy.post_announcement,
      phase: 'announcement'
    });
    
    // Post-announcement data
    for (let i = 1; i <= 14; i++) {
      const date = new Date(announcementDate);
      date.setDate(date.getDate() + i);
      const progress = i / 14;
      const currentSentiment = policy.post_announcement + (policy.current_sentiment - policy.post_announcement) * progress;
      data.push({
        date: date.toISOString().split('T')[0],
        sentiment: currentSentiment + (Math.random() - 0.5) * 0.1,
        phase: 'post'
      });
    }
    
    return data;
  };

  const handlePolicyClick = (policy) => {
    setSelectedPolicy(policy);
    setShowDetails(true);
  };

  const handleMentionsClick = (policy) => {
    setSelectedPolicyMentions(policy.mentions || []);
    setMentionsDialogOpen(true);
  };

  if (policyLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Policy Impact Tracker
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={handleRefresh}
          variant="outlined"
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {policies.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No policy data available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Run sentiment analysis to see policy impact data
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {policies.map((policy, index) => (
            <Grid item xs={12} md={6} key={policy.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  elevation={3} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { elevation: 6 }
                  }}
                  onClick={() => handlePolicyClick(policy)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {policy.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Announced: {formatDate(policy.announcement_date)}
                        </Typography>
                      </Box>
                      <Chip
                        label={policy.status}
                        color={policy.status === 'active' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Current Sentiment</Typography>
                        <Chip
                          label={getSentimentLabel(policy.current_sentiment)}
                          color={getSentimentColor(policy.current_sentiment)}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.abs(policy.current_sentiment) * 100}
                        color={getSentimentColor(policy.current_sentiment)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Pre-Announcement
                        </Typography>
                        <Typography variant="h6" color={getSentimentColor(policy.pre_announcement)}>
                          {policy.pre_announcement.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Post-Announcement
                        </Typography>
                        <Typography variant="h6" color={getSentimentColor(policy.post_announcement)}>
                          {policy.post_announcement.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        {getReactionIcon(policy.public_reaction)}
                        <Typography 
                          variant="body2" 
                          ml={1}
                          sx={{ 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            color: 'primary.main',
                            '&:hover': {
                              color: 'primary.dark',
                              textDecoration: 'underline'
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMentionsClick(policy);
                          }}
                        >
                          {policy.media_coverage} mentions
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        endIcon={expandedPolicy === policy.id ? <ExpandLess /> : <ExpandMore />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id);
                        }}
                      >
                        Details
                      </Button>
                    </Box>

                    {expandedPolicy === policy.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            Recovery Progress
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={calculateRecoveryProgress(policy)}
                            color="success"
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {calculateRecoveryProgress(policy).toFixed(1)}% recovered
                          </Typography>
                        </Box>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Policy Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedPolicy && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Policy color="primary" sx={{ mr: 1 }} />
                {selectedPolicy.name} - Impact Analysis
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" mb={2}>
                    Sentiment Timeline
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={generateTimelineData(selectedPolicy)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis domain={[-1, 1]} />
                      <RechartsTooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [value.toFixed(3), 'Sentiment']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Key Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Peak Negative Sentiment"
                        secondary={`${selectedPolicy.peak_negative?.toFixed(3) || 'N/A'}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Recovery Rate"
                        secondary={`${(selectedPolicy.recovery_rate * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Assessment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Media Coverage"
                        secondary={`${selectedPolicy.media_coverage} mentions`}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>
                    Public Reaction Analysis
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      {getReactionIcon(selectedPolicy.public_reaction)}
                      <Typography variant="body1" ml={1}>
                        {selectedPolicy.public_reaction.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Based on {selectedPolicy.media_coverage} media mentions and social media analysis
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetails(false)}>Close</Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => generatePolicyReport(selectedPolicy)}
                disabled={reportGenerating}
                startIcon={reportGenerating ? <CircularProgress size={16} /> : null}
              >
                {reportGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Mentions Dialog */}
      <Dialog
        open={mentionsDialogOpen}
        onClose={() => setMentionsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <Typography variant="h6" sx={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600
          }}>
            Policy Mentions & Feeds
          </Typography>
          <IconButton onClick={() => setMentionsDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedPolicyMentions.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Showing {selectedPolicyMentions.length} mentions related to this policy
              </Typography>
              <Grid container spacing={2}>
                {selectedPolicyMentions.map((mention, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper sx={{ 
                      p: 2, 
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                        transform: 'translateY(-1px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {mention.source} - {mention.platform}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(mention.date)}
                          </Typography>
                        </Box>
                        <Chip
                          label={mention.sentiment_label}
                          size="small"
                          color={mention.sentiment_label === 'positive' ? 'success' : 
                                 mention.sentiment_label === 'negative' ? 'error' : 'primary'}
                          sx={{ 
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ 
                        mt: 1,
                        lineHeight: 1.5,
                        color: 'rgba(0,0,0,0.8)'
                      }}>
                        {mention.text}
                      </Typography>
                      {mention.sentiment_score !== undefined && (
                        <Box display="flex" alignItems="center" mt={1}>
                          <Typography variant="caption" color="text.secondary" mr={1}>
                            Sentiment Score:
                          </Typography>
                          <Typography variant="caption" fontWeight={600}>
                            {mention.sentiment_score.toFixed(3)}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.3) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <Typography variant="h6" sx={{ 
                color: 'rgba(0,0,0,0.6)',
                fontWeight: 600
              }}>
                No mentions available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No detailed mention data is available for this policy
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          py: 2, 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <Button 
            onClick={() => setMentionsDialogOpen(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(168, 85, 247, 1) 100%)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicyImpactTracker; 