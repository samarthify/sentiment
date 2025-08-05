import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Chip,
  Paper,
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
  
  useEffect(() => {
    // When the page loads with any filter, scroll to table section
    if (sentimentFilter || sourceFilter || dateFilter || countryFilter || textFilter) {
      const tableElement = document.getElementById('sentiment-data-table');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [sentimentFilter, sourceFilter, dateFilter, countryFilter, textFilter]);
  
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
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorative elements */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <Container maxWidth="xl" sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Section */}
        <Box sx={{ 
          py: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          backdropFilter: 'blur(15px)',
          borderBottom: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          borderRadius: '0 0 16px 16px',
          mb: 2
        }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {t('sentimentData.title')}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph
            sx={{ 
              fontWeight: 500,
              color: 'rgba(0,0,0,0.7)'
            }}
          >
            {t('sentimentData.description')}
          </Typography>
          
          {activeFilterText && (
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`${t('sentimentData.filteredBy')} ${activeFilterText}`}
                color={getFilterColor()}
                onDelete={() => window.location.href = '/sentiment-data'}
                sx={{ 
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                  }
                }}
              />
            </Box>
          )}
        </Box>
        
        {/* Table Section - Fill remaining space */}
        <Box 
          id="sentiment-data-table" 
          sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0 // Important for flex child
          }}
        >
          <Paper sx={{
            flex: 1,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <SentimentDataTable 
              data={data}
              initialSentimentFilter={sentimentFilter}
              initialSourceFilter={sourceFilter}
              initialDateFilter={dateFilter}
              initialCountryFilter={countryFilter}
              initialTextFilter={textFilter}
            />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default SentimentDataPage; 