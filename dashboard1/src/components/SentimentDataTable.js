import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Divider,
  Avatar,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Source as SourceIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  LocationOn as LocationIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import Papa from 'papaparse';

const SentimentDataTable = ({ data: rawData, initialSentimentFilter = null, initialSourceFilter = null, initialDateFilter = null, initialCountryFilter = null, initialTextFilter = null, initialSearchTerm = null }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState(initialSentimentFilter);
  const [sourceFilter, setSourceFilter] = useState(initialSourceFilter);
  const [dateFilter, setDateFilter] = useState(initialDateFilter);
  const [countryFilter, setCountryFilter] = useState(initialCountryFilter);
  const [textFilter, setTextFilter] = useState(initialTextFilter);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return t('general.unknown');
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const processedData = React.useMemo(() => {
    if (!rawData) return [];
    console.log('Processing rawData prop, records:', rawData.length);
    return rawData
      .filter(row => row && row.text && row.text.trim() !== '') // Ensure basic validity
      .map(row => {
        // Date formatting - reuse existing logic if needed, or simplify
        let formattedDate = 'Unknown';
        try {
            const dateObj = new Date(row.date || row.published_date || row.published_at);
            if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toLocaleDateString();
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }

        // Use data directly from the rawData object
        return {
          date: formattedDate,
          source: row.source_name || row.source || 'Unknown',
          platform: row.platform || 'Unknown',
          sentiment: row.sentiment_label || 'Unknown',
          content: row.content || row.text || row.description || '',
          author: row.user_name || row.user_handle || 'Unknown',
          sentimentScore: parseFloat(row.sentiment_score) || 0,
          location: row.country || 'Unknown', // Use country from data
          country: row.country || 'Unknown',
          url: row.url || '#', // Add URL if available
          sentiment_justification: row.sentiment_justification || null,
          sentiment_label: row.sentiment_label || null,
          sentiment_score: row.sentiment_score || null,
          // Store original data for detailed view
          originalData: { ...row }
        };
      });
  }, [rawData, t]);

  useEffect(() => {
    if (searchTerm || sentimentFilter || sourceFilter || dateFilter || countryFilter || textFilter) {
      const filtered = processedData.filter(item => {
        // Apply sentiment filter if it exists
        if (sentimentFilter && item.sentiment && 
            item.sentiment.toLowerCase() !== sentimentFilter.toLowerCase()) {
          return false;
        }
        
        // Apply source/platform filter if it exists
        if (sourceFilter && 
            !(item.source?.toLowerCase().includes(sourceFilter.toLowerCase()) || 
              item.platform?.toLowerCase().includes(sourceFilter.toLowerCase()) ||
              item.author?.toLowerCase().includes(sourceFilter.toLowerCase()))) {
          return false;
        }
        
        // Apply date filter if it exists
        if (dateFilter && item.date) {
          // If dateFilter is a range, check if the item date is within the range
          if (dateFilter.start && dateFilter.end) {
            const itemDate = new Date(item.date);
            const startDate = new Date(dateFilter.start);
            const endDate = new Date(dateFilter.end);
            if (itemDate < startDate || itemDate > endDate) {
              return false;
            }
          } else if (typeof dateFilter === 'string') {
            // If dateFilter is a string, check if it's equal to the item date
            if (!item.date.includes(dateFilter)) {
              return false;
            }
          }
        }
        
        // Apply country filter if it exists
        if (countryFilter && item.country && 
            item.country.toLowerCase() !== countryFilter.toLowerCase()) {
          return false;
        }
        
        // Apply text filter if it exists
        if (textFilter && item.content) {
          if (!item.content.toLowerCase().includes(textFilter.toLowerCase())) {
            return false;
          }
        }
        
        // Then apply search term if it exists
        if (searchTerm) {
          return (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.platform && item.platform.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        return true;
      });
      setFilteredData(filtered);
      setPage(0);
    } else {
      setFilteredData(processedData);
    }
  }, [searchTerm, processedData, sentimentFilter, sourceFilter, dateFilter, countryFilter, textFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return { bg: '#f5f5f5', color: '#757575' };
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return { bg: '#e6f7e9', color: '#2e7d32' };
      case 'negative':
        return { bg: '#fdecea', color: '#d32f2f' };
      case 'neutral':
        return { bg: '#e3f2fd', color: '#1976d2' };
      default:
        return { bg: '#f5f5f5', color: '#757575' };
    }
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const clearFilters = () => {
    setSentimentFilter(null);
    setSourceFilter(null);
    setDateFilter(null);
    setCountryFilter(null);
    setTextFilter(null);
  };

  const clearSentimentFilter = () => {
    setSentimentFilter(null);
  };

  const clearSourceFilter = () => {
    setSourceFilter(null);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
  };

  const clearCountryFilter = () => {
    setCountryFilter(null);
  };

  const clearTextFilter = () => {
    setTextFilter(null);
  };

  const handleFilterButtonClick = () => {
    setFilterDialogOpen(true);
  };

  const handleFilterDialogClose = () => {
    setFilterDialogOpen(false);
  };

  const handleApplyFilters = () => {
    setFilterDialogOpen(false);
  };

  if (!processedData.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      px: 0
    }}>
      <Box sx={{ 
        py: 3, 
        pb: 2,
        px: 0,
        background: 'transparent'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 2 
        }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {t('sentimentTable.title')} {filteredData.length > 0 && `(${filteredData.length} ${t('sentimentTable.records')})`}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {(sentimentFilter || sourceFilter || dateFilter || countryFilter || textFilter) && (
              <Chip 
                label={t('sentimentTable.clearAllFilters')}
                color="default"
                onDelete={clearFilters}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            {sentimentFilter && (
              <Chip 
                label={`${t(`sentiments.${sentimentFilter}`)}`}
                color={sentimentFilter === 'positive' ? 'success' : sentimentFilter === 'negative' ? 'error' : 'primary'}
                onDelete={clearSentimentFilter}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            {sourceFilter && (
              <Chip 
                label={`${t('sentimentTable.source')}: ${sourceFilter}`}
                color="info"
                onDelete={clearSourceFilter}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            {dateFilter && (
              <Chip 
                label={typeof dateFilter === 'string' 
                  ? `${t('sentimentTable.date')}: ${dateFilter}` 
                  : `${t('sentimentTable.dateRange')}: ${dateFilter.start} - ${dateFilter.end}`}
                color="warning"
                onDelete={clearDateFilter}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            {countryFilter && (
              <Chip 
                label={`${t('sentimentTable.country')}: ${countryFilter}`}
                color="success"
                onDelete={clearCountryFilter}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            {textFilter && (
              <Chip 
                label={`${t('sentimentTable.contains')}: ${textFilter}`}
                color="default"
                onDelete={clearTextFilter}
                size="small"
                sx={{ 
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              />
            )}
            
            <TextField
              size="small"
              placeholder={t('sentimentTable.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small"
                      onClick={handleFilterButtonClick}
                      sx={{ 
                        color: (sentimentFilter || sourceFilter || dateFilter || countryFilter || textFilter) 
                          ? 'primary.main' 
                          : 'text.secondary'
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ 
                width: '300px',
                '& .MuiOutlinedInput-root': {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  '&:hover': {
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  },
                  '&.Mui-focused': {
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                  }
                }
              }}
            />
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        px: 0
      }}>
        <TableContainer sx={{ 
          flex: 1,
          maxHeight: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <Table stickyHeader aria-label="sentiment data table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.date')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.source')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.platform')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.sentiment')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.content')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.author')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1'
                }}>{t('sentimentTable.location')}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#6366f1',
                  textAlign: 'center' 
                }}>{t('sentimentTable.aiEnhanced')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => {
                    const sentimentStyle = getSentimentColor(row.sentiment);
                    return (
                      <TableRow 
                        hover 
                        key={index} 
                        onClick={() => handleRowClick(row)}
                        sx={{ 
                          cursor: 'pointer',
                          background: index % 2 === 0 
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                          backdropFilter: 'blur(5px)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                            backdropFilter: 'blur(10px)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                      >
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 500
                        }}>{row.date}</TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 500
                        }}>{row.source}</TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 500
                        }}>{row.platform}</TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          <Chip 
                            label={row.sentiment} 
                            size="small"
                            sx={{ 
                              backgroundColor: sentimentStyle.bg, 
                              color: sentimentStyle.color,
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              maxWidth: '400px',
                              fontWeight: 500
                            }}
                          >
                            {row.content}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 500
                        }}>{row.author}</TableCell>
                        <TableCell sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 500
                        }}>{row.location || t('sentimentTable.unknownLocation')}</TableCell>
                        <TableCell sx={{ 
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          {row.sentiment_label && row.sentiment_score !== undefined && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <CheckCircleOutlineIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: 'success.main',
                                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                }} 
                                titleAccess={`AI Enhanced: ${row.sentiment_label} (${row.sentiment_score?.toFixed(2)})`} 
                              />
                              {row.sentiment_justification && (
                                <Typography variant="caption" sx={{ 
                                  fontSize: '0.6rem', 
                                  color: 'primary.main',
                                  fontWeight: 600
                                }}>
                                  AI Justification
                                </Typography>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ 
                    py: 6,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.3) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: 'rgba(0,0,0,0.6)',
                      fontWeight: 600
                    }}>
                      {t('sentimentTable.noDataFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ 
          py: 2,
          px: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.2)'
        }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage={t('sentimentTable.rowsPerPage')}
            sx={{
              '& .MuiTablePagination-select': {
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px'
              },
              '& .MuiTablePagination-actions button': {
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                }
              }
            }}
          />
        </Box>
      </Box>

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedRow && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid #e0e0e0',
              pb: 2
            }}>
              <Typography variant="h6">{t('sentimentTable.detailsTitle')}</Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                {/* Header Information */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: getSentimentColor(selectedRow.sentiment).bg,
                        color: getSentimentColor(selectedRow.sentiment).color,
                        width: 56,
                        height: 56,
                        mr: 2
                      }}
                    >
                      {selectedRow.sentiment.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {selectedRow.author}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label={selectedRow.sentiment} 
                          size="small"
                          sx={{ 
                            backgroundColor: getSentimentColor(selectedRow.sentiment).bg, 
                            color: getSentimentColor(selectedRow.sentiment).color,
                            fontWeight: 500
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {t('sentimentTable.sentimentScore')}: {selectedRow.sentimentScore.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Content */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="body1">
                      {selectedRow.content}
                    </Typography>
                  </Paper>
                </Grid>

                {/* AI Enhanced Analysis */}
                {selectedRow.sentiment_label && selectedRow.sentiment_score !== undefined && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#e3f2fd' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1}}>
                        <CheckCircleOutlineIcon sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          AI Enhanced Analysis
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Chip 
                          label={selectedRow.sentiment_label} 
                          size="small"
                          sx={{ 
                            backgroundColor: getSentimentColor(selectedRow.sentiment_label).bg, 
                            color: getSentimentColor(selectedRow.sentiment_label).color,
                            fontWeight: 500
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          Confidence Score: {selectedRow.sentiment_score?.toFixed(2) || 'N/A'}
                        </Typography>
                      </Box>
                      {selectedRow.sentiment_justification && (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                          <strong>AI Justification:</strong>
                          <Box sx={{ mt: 1, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                            {selectedRow.sentiment_justification}
                          </Box>
                        </Typography>
                      )}
                      {!selectedRow.sentiment_justification && (
                        <Typography variant="body2" color="text.secondary">
                          This content has been analyzed using AI sentiment analysis. The sentiment classification and confidence score are provided above.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}

                {/* Metadata */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>{t('sentimentTable.date')}:</strong> {selectedRow.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SourceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>{t('sentimentTable.source')}:</strong> {selectedRow.source}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LanguageIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>{t('sentimentTable.platform')}:</strong> {selectedRow.platform}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>{t('sentimentTable.author')}:</strong> {selectedRow.author}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>{t('sentimentTable.location')}:</strong> {selectedRow.location}
                    </Typography>
                  </Box>
                </Grid>

                {/* Additional Data */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    {t('sentimentTable.additionalInfo')}
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(selectedRow.originalData)
                      .filter(([key, value]) => 
                        value && 
                        typeof value === 'string' && 
                        !['content', 'text', 'description', 'published_date', 'date', 'source', 'platform', 'sentiment_label', 'user_name', 'user_handle'].includes(key)
                      )
                      .slice(0, 8) // Limit to 8 additional fields
                      .map(([key, value]) => (
                        <Grid item xs={12} sm={6} md={3} key={key}>
                          <Typography variant="caption" color="text.secondary" component="div">
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {value}
                          </Typography>
                        </Grid>
                      ))
                    }
                  </Grid>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
              {selectedRow.originalData.url && (
                <Button 
                  href={selectedRow.originalData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary"
                >
                  {t('sentimentTable.viewOriginalSource')}
                </Button>
              )}
              <Button onClick={handleCloseDialog} color="primary" variant="contained">
                {t('general.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={handleFilterDialogClose}
        maxWidth="sm"
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
            Advanced Filters
          </Typography>
          <IconButton onClick={handleFilterDialogClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Sentiment Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Sentiment
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['positive', 'negative', 'neutral'].map((sentiment) => (
                  <Chip
                    key={sentiment}
                    label={t(`sentiments.${sentiment}`)}
                    onClick={() => setSentimentFilter(sentimentFilter === sentiment ? null : sentiment)}
                    color={sentimentFilter === sentiment ? 'primary' : 'default'}
                    variant={sentimentFilter === sentiment ? 'filled' : 'outlined'}
                    sx={{ 
                      background: sentimentFilter === sentiment 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Source Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Source/Platform
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter source or platform name"
                value={sourceFilter || ''}
                onChange={(e) => setSourceFilter(e.target.value || null)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    '&:hover': {
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    },
                    '&.Mui-focused': {
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                    }
                  }
                }}
              />
            </Grid>

            {/* Date Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Date Range
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Start Date"
                    value={dateFilter?.start || ''}
                    onChange={(e) => setDateFilter({
                      ...dateFilter,
                      start: e.target.value || null
                    })}
                    InputProps={{
                      inputProps: {
                        placeholder: ''
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                        '&.Mui-focused': {
                          border: '1px solid rgba(99, 102, 241, 0.5)',
                          boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                        }
                      },
                      '& input[type="date"]::-webkit-datetime-edit-fields-wrapper': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-text': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-month-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-day-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-year-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-fields-wrapper': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-text': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-month-field': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-day-field': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-year-field': {
                        color: 'inherit'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="End Date"
                    value={dateFilter?.end || ''}
                    onChange={(e) => setDateFilter({
                      ...dateFilter,
                      end: e.target.value || null
                    })}
                    InputProps={{
                      inputProps: {
                        placeholder: ''
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                        '&.Mui-focused': {
                          border: '1px solid rgba(99, 102, 241, 0.5)',
                          boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                        }
                      },
                      '& input[type="date"]::-webkit-datetime-edit-fields-wrapper': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-text': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-month-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-day-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]::-webkit-datetime-edit-year-field': {
                        color: 'transparent'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-fields-wrapper': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-text': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-month-field': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-day-field': {
                        color: 'inherit'
                      },
                      '& input[type="date"]:focus::-webkit-datetime-edit-year-field': {
                        color: 'inherit'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Country Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Country/Location
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter country or location"
                value={countryFilter || ''}
                onChange={(e) => setCountryFilter(e.target.value || null)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    '&:hover': {
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    },
                    '&.Mui-focused': {
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                    }
                  }
                }}
              />
            </Grid>

            {/* Text Content Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Text Content
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search in content text"
                value={textFilter || ''}
                onChange={(e) => setTextFilter(e.target.value || null)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    '&:hover': {
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    },
                    '&.Mui-focused': {
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          py: 2, 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <Button 
            onClick={clearFilters}
            color="secondary"
            sx={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
              }
            }}
          >
            Clear All
          </Button>
          <Button 
            onClick={handleApplyFilters}
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
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SentimentDataTable; 