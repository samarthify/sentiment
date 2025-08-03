import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';

const SentimentData = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${apiUrl}/latest-data`);
      if (response.data.status === 'success') {
        setData(response.data.data);
        setLastUpdate(response.data.timestamp);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Fetch new data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{t('sentimentDataDisplay.error')}: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{t('sentimentDataDisplay.title')}</Typography>
        {lastUpdate && (
          <Typography variant="body2" color="textSecondary">
            {t('sentimentDataDisplay.lastUpdated')}: {new Date(lastUpdate).toLocaleString()}
          </Typography>
        )}
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('sentimentDataDisplay.source')}</TableCell>
              <TableCell>{t('sentimentDataDisplay.platform')}</TableCell>
              <TableCell>{t('sentimentDataDisplay.date')}</TableCell>
              <TableCell>{t('sentimentDataDisplay.text')}</TableCell>
              <TableCell>{t('sentimentDataDisplay.sentiment')}</TableCell>
              <TableCell>{t('sentimentDataDisplay.score')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.platform}</TableCell>
                <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                <TableCell>{row.text.substring(0, 100)}...</TableCell>
                <TableCell>{row.sentiment_label}</TableCell>
                <TableCell>{row.sentiment_score?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SentimentData; 