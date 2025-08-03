import React from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent, 
  Card, 
  CardContent,
  Typography
} from '@mui/material';
import { Public as PublicIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface CountryFilterProps {
  countries: string[];
  selectedCountry: string;
  onCountryChange: (country: string) => void;
}

const CountryFilter: React.FC<CountryFilterProps> = ({ 
  countries, 
  selectedCountry, 
  onCountryChange 
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onCountryChange(event.target.value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        sx={{
          boxShadow: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%)',
          transition: 'all 0.3s ease',
          mb: 3
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={1}>
            <PublicIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="div">
              Filter by Country
            </Typography>
          </Box>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="country-filter-label">Country</InputLabel>
            <Select
              labelId="country-filter-label"
              id="country-filter"
              value={selectedCountry}
              onChange={handleChange}
              label="Country"
            >
              <MenuItem value="All Countries">All Countries</MenuItem>
              {countries.map((country) => (
                <MenuItem key={country} value={country}>
                  {country === 'Unknown' ? 'Unknown Country' : country}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CountryFilter;