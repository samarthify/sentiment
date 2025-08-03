import React, { useState } from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemText, 
  ListItemIcon,
  Typography,
  Tooltip,
  Box
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useLanguage, LANGUAGES } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (code) => {
    changeLanguage(code);
    handleClose();
  };

  // Find current language object
  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  // Header variant shows current language code
  const isHeader = variant === 'header';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {isHeader && (
        <Typography 
          variant="body2" 
          component="span" 
          sx={{ 
            mr: 0.5, 
            fontWeight: 600,
            fontSize: '2rem',
            opacity: 0.8
          }}
        >
          {currentLang.flag}
        </Typography>
      )}
      <Tooltip title={t('general.language')}>
        <IconButton
          onClick={handleClick}
          color="inherit"
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          size="medium"
        >
          <LanguageIcon fontSize="medium" />
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
      >
        {LANGUAGES.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={currentLanguage === language.code}
          >
            <ListItemIcon style={{ minWidth: '30px' }}>
              <Typography>{language.flag}</Typography>
            </ListItemIcon>
            <ListItemText>{language.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher; 