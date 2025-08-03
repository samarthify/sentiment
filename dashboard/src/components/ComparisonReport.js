import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  TrendingFlat,
  CompareArrows,
  FileDownload,
  Refresh,
  Info as InfoIcon
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import ComparisonService from '../services/ComparisonService';
import { useAuth } from '../contexts/AuthContext.tsx';

function ComparisonReport() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  useEffect(() => {
    if (session) {
      loadComparisonData();
    }
  }, [session]);

  const loadComparisonData = async () => {
    if (!session?.access_token) {
      setError(t('comparisonReport.errorAuth'));
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const report = await ComparisonService.compareDatasets(session.access_token);
      setComparison(report);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError(err.message || t('comparisonReport.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Helper function to format percentages with + sign for positive values
  const formatPercentChange = (value) => {
    if (value === 'N/A') return value;
    const numValue = parseFloat(value);
    return numValue > 0 ? `+${value}%` : `${value}%`;
  };

  // Helper to determine trend color
  const getTrendColor = (value) => {
    if (value === 'N/A' || value === 0) return 'grey';
    return parseFloat(value) > 0 ? '#4caf50' : '#f44336';
  };

  // Helper to get trend icon
  const getTrendIcon = (value) => {
    if (value === 'N/A' || value === 0) return <TrendingFlat />;
    return parseFloat(value) > 0 ? <TrendingUp /> : <TrendingDown />;
  };

  // Data preparation for the sentiment distribution chart
  const prepareSentimentDistributionData = () => {
    if (!comparison) return [];
    
    return [
      {
        name: t('sentiments.positive'),
        old: parseFloat(comparison.sentimentDistribution.old.positive.percentage),
        new: parseFloat(comparison.sentimentDistribution.new.positive.percentage),
      },
      {
        name: t('sentiments.neutral'),
        old: parseFloat(comparison.sentimentDistribution.old.neutral.percentage),
        new: parseFloat(comparison.sentimentDistribution.new.neutral.percentage),
      },
      {
        name: t('sentiments.negative'),
        old: parseFloat(comparison.sentimentDistribution.old.negative.percentage),
        new: parseFloat(comparison.sentimentDistribution.new.negative.percentage),
      }
    ];
  };

  // Prepare platform comparison chart data with filtering
  const preparePlatformComparisonData = () => {
    if (!comparison) return [];
    
    // Filter out any platform entries that look like country codes
    let filteredData = comparison.platformComparison
      .filter(item => item.oldCount > 0 || item.newCount > 0)
      .filter(item => {
        const platform = item.platform.toLowerCase();
        // Exclude country codes and names from platforms
        return !['qa', 'qatar', 'gb', 'uk', 'us', 'uae', 'united kingdom', 'united states', 'ae'].includes(platform);
      });
    
    // Apply additional platform filter if selected
    if (platformFilter !== 'all') {
      const filterLower = platformFilter.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.platform.toLowerCase().includes(filterLower)
      );
    }
    
    return filteredData
      .slice(0, 10) // Top 10 platforms
      .map(item => ({
        name: item.platform,
        old: item.oldCount,
        new: item.newCount,
        percentChange: item.percentChange === 'N/A' ? 0 : parseFloat(item.percentChange)
      }));
  };

  // Prepare country comparison chart data with filtering
  const prepareCountryComparisonData = () => {
    if (!comparison) return [];
    
    let filteredData = comparison.countryComparison
      .filter(item => item.oldCount > 0 || item.newCount > 0)
      // Filter out unknown countries
      .filter(item => item.country.toLowerCase() !== 'unknown');
    
    // Apply country filter
    if (countryFilter !== 'all') {
      const filterLower = countryFilter.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.country.toLowerCase().includes(filterLower)
      );
    }
    
    return filteredData
      .slice(0, 10) // Top 10 countries
      .map(item => ({
        name: item.country,
        old: item.oldCount,
        new: item.newCount,
        percentChange: item.percentChange === 'N/A' ? 0 : parseFloat(item.percentChange)
      }));
  };

  // Handle platform filter change
  const handlePlatformFilterChange = (event) => {
    setPlatformFilter(event.target.value);
  };

  // Handle country filter change
  const handleCountryFilterChange = (event) => {
    setCountryFilter(event.target.value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t('comparisonReport.loading')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, mx: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={loadComparisonData}
            startIcon={<Refresh />}
          >
            {t('general.retry')}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!comparison) {
    return (
      <Box sx={{ mt: 4, mx: 2 }}>
        <Alert severity="warning">{t('comparisonReport.noDataAvailable')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {t('comparisonReport.title')}
          <Tooltip title={t('charts.comparisonReportTooltip')}>
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={loadComparisonData}
          >
            {t('comparisonReport.refreshData')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Alert severity="info">
          {t('comparisonReport.comparingDatasets', { 
            previous: t('comparisonReport.previousDataset'), 
            new: t('comparisonReport.newDataset')
          })}
        </Alert>
      </Box>

      <Box id="comparison-report">
        {/* Dataset Overview */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {t('comparisonReport.datasetOverview')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.oldDatasetEntries')}
                  </Typography>
                  <Typography variant="h4">
                    {comparison.datasetInfo.oldDatasetCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.newDatasetEntries')}
                  </Typography>
                  <Typography variant="h4">
                    {comparison.datasetInfo.newDatasetCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.entryDifference')}
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: getTrendColor(comparison.datasetInfo.countDifference),
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {comparison.datasetInfo.countDifference > 0 ? '+' : ''}
                    {comparison.datasetInfo.countDifference.toLocaleString()}
                    {getTrendIcon(comparison.datasetInfo.countDifference)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.percentageChange')}
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: getTrendColor(comparison.datasetInfo.percentChange),
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {formatPercentChange(comparison.datasetInfo.percentChange)}
                    {getTrendIcon(comparison.datasetInfo.percentChange)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Sentiment Comparison */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {t('comparisonReport.sentimentAnalysis')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.oldDatasetAverageSentiment')}
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: parseFloat(comparison.sentimentComparison.oldAverageSentiment) > 0 
                        ? '#4caf50' 
                        : parseFloat(comparison.sentimentComparison.oldAverageSentiment) < 0
                          ? '#f44336'
                          : 'text.primary'
                    }}
                  >
                    {comparison.sentimentComparison.oldAverageSentiment}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.newDatasetAverageSentiment')}
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: parseFloat(comparison.sentimentComparison.newAverageSentiment) > 0 
                        ? '#4caf50' 
                        : parseFloat(comparison.sentimentComparison.newAverageSentiment) < 0
                          ? '#f44336'
                          : 'text.primary'
                    }}
                  >
                    {comparison.sentimentComparison.newAverageSentiment}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('comparisonReport.sentimentTrend')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        color: getTrendColor(comparison.sentimentComparison.difference),
                        mr: 1
                      }}
                    >
                      {comparison.sentimentComparison.difference > 0 ? '+' : ''}
                      {comparison.sentimentComparison.difference}
                    </Typography>
                    {getTrendIcon(comparison.sentimentComparison.difference)}
                    <Chip 
                      label={t(`comparisonReport.trend.${comparison.sentimentComparison.trend.toLowerCase()}`)} 
                      color={
                        comparison.sentimentComparison.trend === 'Improved' 
                          ? 'success' 
                          : comparison.sentimentComparison.trend === 'Declined'
                            ? 'error'
                            : 'default'
                      }
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              {t('comparisonReport.sentimentLabelDistribution')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('comparisonReport.basedOnSentimentLabels')}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareSentimentDistributionData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <RechartsTooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Bar dataKey="old" name={t('comparisonReport.oldDataset')} fill="#8884d8" />
                <Bar dataKey="new" name={t('comparisonReport.newDataset')} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Tabs for Platform and Country Analysis */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label={t('comparisonReport.tabs.platformAnalysis')} />
            <Tab label={t('comparisonReport.tabs.countryAnalysis')} />
            <Tab label={t('comparisonReport.tabs.newEntries')} />
          </Tabs>

          {/* Platform Analysis Tab */}
          {tabIndex === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  {t('comparisonReport.platformDistributionChanges')}
                </Typography>
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel id="platform-filter-label">{t('comparisonReport.filterPlatform')}</InputLabel>
                  <Select
                    labelId="platform-filter-label"
                    id="platform-filter"
                    value={platformFilter}
                    label={t('comparisonReport.filterPlatform')}
                    onChange={handlePlatformFilterChange}
                  >
                    <MenuItem value="all">{t('filters.allPlatforms')}</MenuItem>
                    <MenuItem value="twitter">Twitter</MenuItem>
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="linkedin">LinkedIn</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="news">{t('platforms.news')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ height: 400, mt: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={preparePlatformComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <RechartsTooltip 
                      formatter={(value, name) => [value, name === 'percentChange' ? t('comparisonReport.percentChange') : name === 'old' ? t('comparisonReport.oldDataset') : t('comparisonReport.newDataset')]}
                      labelFormatter={(label) => `${t('filters.platform')}: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="old" name={t('comparisonReport.oldDataset')} fill="#8884d8" />
                    <Bar dataKey="new" name={t('comparisonReport.newDataset')} fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <TableContainer component={Paper} sx={{ mt: 4 }}>
                <Table aria-label="platform comparison table">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('filters.platform')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.oldCount')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.newCount')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.difference')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.change')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparison.platformComparison
                      .filter(row => row.platform && (row.oldCount > 0 || row.newCount > 0))
                      .filter(row => {
                        const platform = row.platform.toLowerCase();
                        // Exclude country codes and names from platforms
                        return !['qa', 'qatar', 'gb', 'uk', 'us', 'uae', 'united kingdom', 'united states'].includes(platform);
                      })
                      .filter(row => platformFilter === 'all' || row.platform.toLowerCase().includes(platformFilter.toLowerCase()))
                      .map((row) => (
                        <TableRow key={row.platform}>
                          <TableCell component="th" scope="row">
                            {row.platform}
                          </TableCell>
                          <TableCell align="right">{row.oldCount}</TableCell>
                          <TableCell align="right">{row.newCount}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: getTrendColor(row.difference)
                            }}
                          >
                            {row.difference > 0 ? '+' : ''}{row.difference}
                          </TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: getTrendColor(row.percentChange)
                            }}
                          >
                            {formatPercentChange(row.percentChange)}
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Country Analysis Tab */}
          {tabIndex === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  {t('comparisonReport.countryDistributionChanges')}
                </Typography>
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel id="country-filter-label">{t('comparisonReport.filterCountry')}</InputLabel>
                  <Select
                    labelId="country-filter-label"
                    id="country-filter"
                    value={countryFilter}
                    label={t('comparisonReport.filterCountry')}
                    onChange={handleCountryFilterChange}
                  >
                    <MenuItem value="all">{t('filters.allCountries')}</MenuItem>
                    <MenuItem value="qatar">Qatar</MenuItem>
                    <MenuItem value="gb">{t('comparisonReport.countries.gb')}</MenuItem>
                    <MenuItem value="uk">{t('comparisonReport.countries.uk')}</MenuItem>
                    <MenuItem value="us">{t('comparisonReport.countries.us')}</MenuItem>
                    <MenuItem value="uae">UAE</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ height: 400, mt: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareCountryComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <RechartsTooltip 
                      formatter={(value, name) => [value, name === 'percentChange' ? t('comparisonReport.percentChange') : name === 'old' ? t('comparisonReport.oldDataset') : t('comparisonReport.newDataset')]}
                      labelFormatter={(label) => `${t('filters.country')}: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="old" name={t('comparisonReport.oldDataset')} fill="#8884d8" />
                    <Bar dataKey="new" name={t('comparisonReport.newDataset')} fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <TableContainer component={Paper} sx={{ mt: 4 }}>
                <Table aria-label="country comparison table">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('filters.country')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.oldCount')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.newCount')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.difference')}</TableCell>
                      <TableCell align="right">{t('comparisonReport.change')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparison.countryComparison
                      .filter(row => row.country.toLowerCase() !== 'unknown')
                      .filter(row => countryFilter === 'all' || row.country.toLowerCase().includes(countryFilter.toLowerCase()))
                      .map((row) => (
                        <TableRow key={row.country}>
                          <TableCell component="th" scope="row">
                            {row.country}
                          </TableCell>
                          <TableCell align="right">{row.oldCount}</TableCell>
                          <TableCell align="right">{row.newCount}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: getTrendColor(row.difference)
                            }}
                          >
                            {row.difference > 0 ? '+' : ''}{row.difference}
                          </TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: getTrendColor(row.percentChange)
                            }}
                          >
                            {formatPercentChange(row.percentChange)}
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* New Entries Tab */}
          {tabIndex === 2 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                {t('comparisonReport.newEntriesAnalysis')}
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('comparisonReport.showingNewEntries', { 
                    count: comparison.newEntries.length,
                    limited: comparison.newEntries.length === 100 ? t('comparisonReport.limitedTo100') : ''
                  })}
                </Typography>
                <Tooltip title={t('comparisonReport.newEntriesInfo')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {comparison.newEntries.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table aria-label="new entries table" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>{t('sentimentTable.content')}</TableCell>
                        <TableCell>{t('table.date')}</TableCell>
                        <TableCell>{t('sentimentTable.source')}</TableCell>
                        <TableCell>{t('filters.platform')}</TableCell>
                        <TableCell align="right">{t('filters.sentiment')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparison.newEntries.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.text}
                          </TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.source}</TableCell>
                          <TableCell>{row.platform}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: row.sentiment_label?.toLowerCase().includes('positive') 
                                ? '#4caf50' 
                                : row.sentiment_label?.toLowerCase().includes('negative')
                                  ? '#f44336'
                                  : 'text.primary'
                            }}
                          >
                            {row.sentiment_label || (parseFloat(row.sentiment_score || 0).toFixed(2))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">{t('comparisonReport.noNewEntries')}</Alert>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default ComparisonReport; 