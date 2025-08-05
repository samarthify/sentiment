import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import SentimentDataTable from './SentimentDataTable';

const SentimentDataPage = ({ data }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const sentimentFilter = location.state?.sentimentFilter || null;
  const sourceFilter = location.state?.sourceFilter || null;
  const dateFilter = location.state?.dateFilter || null;
  const countryFilter = location.state?.countryFilter || null;
  const textFilter = location.state?.textFilter || null;
  const searchTerm = location.state?.searchTerm || null;
  
  useEffect(() => {
    // When the page loads with any filter, scroll to table section
    if (sentimentFilter || sourceFilter || dateFilter || countryFilter || textFilter || searchTerm) {
      const tableElement = document.getElementById('sentiment-data-table');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [sentimentFilter, sourceFilter, dateFilter, countryFilter, textFilter, searchTerm]);
  
  // Determine the active filter for header display
  const getActiveFilterText = () => {
    if (sentimentFilter) return `${t(`sentiments.${sentimentFilter}`).toLowerCase()} ${t('sentimentData.sentiment')}`;
    if (sourceFilter) return `${t('sentimentData.source')}: ${sourceFilter}`;
    if (dateFilter) {
      if (typeof dateFilter === 'string') return `${t('sentimentData.date')}: ${dateFilter}`;
      return `${t('sentimentData.dateRange')}: ${dateFilter.start} - ${dateFilter.end}`;
    }
    if (countryFilter) return `${t('sentimentData.country')}: ${countryFilter}`;
    if (textFilter) return `${t('sentimentData.containing')}: ${textFilter}`;
    if (searchTerm) return `${t('sentimentData.searchingFor')}: ${searchTerm}`;
    return null;
  };
  
  const getFilterColor = () => {
    if (sentimentFilter === 'positive') return 'success';
    if (sentimentFilter === 'negative') return 'error';
    if (sentimentFilter === 'neutral') return 'primary';
    if (sourceFilter) return 'info';
    if (dateFilter) return 'warning';
    if (countryFilter) return 'success';
    if (textFilter) return 'default';
    return 'primary';
  };
  
  const activeFilterText = getActiveFilterText();
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        {t('sentimentData.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('sentimentData.description')}
      </Typography>
      
      {activeFilterText && (
        <Box sx={{ mb: 3 }}>
          <Chip 
            label={`${t('sentimentData.filteredBy')} ${activeFilterText}`}
            color={getFilterColor()}
            onDelete={() => window.location.href = '/sentiment-data'}
            sx={{ fontWeight: 500 }}
          />
        </Box>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {t('sentimentData.dataOverviewTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('sentimentData.dataOverviewText')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {t('sentimentData.usageGuideTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('sentimentData.usageGuideText')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {t('sentimentData.dataSourceTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('sentimentData.dataSourceText')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box id="sentiment-data-table" sx={{ mb: 4 }}>
        <SentimentDataTable 
          data={data}
          initialSentimentFilter={sentimentFilter}
          initialSourceFilter={sourceFilter}
          initialDateFilter={dateFilter}
          initialCountryFilter={countryFilter}
          initialTextFilter={textFilter}
          initialSearchTerm={searchTerm}
        />
      </Box>
    </Container>
  );
};

export default SentimentDataPage; 