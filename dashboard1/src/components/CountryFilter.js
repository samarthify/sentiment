import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Box,
} from '@mui/material';
import DataService from '../services/DataService';

const CountryFilter = ({ selectedCountry, onCountryChange, data }) => {
  const { t } = useTranslation();
  const countries = useMemo(() => {
    // Get available countries from DataService
    const availableCountries = DataService.getAvailableCountries();
    return ['all', ...availableCountries];
  }, []);

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth>
        <InputLabel id="country-filter-label">{t('filters.filterByCountry')}</InputLabel>
        <Select
          labelId="country-filter-label"
          id="country-filter"
          value={selectedCountry.toLowerCase()}
          label={t('filters.filterByCountry')}
          onChange={(e) => onCountryChange(e.target.value)}
        >
          <MenuItem value="all">{t('filters.allCountries')}</MenuItem>
          {countries.filter(country => country !== 'all').map((country) => (
            <MenuItem key={country} value={country.toLowerCase()}>
              {country}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CountryFilter;