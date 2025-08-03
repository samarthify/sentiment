import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  styled,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: '900px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  },
}));

const DialogHeader = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(2),
  '& .MuiIconButton-root': {
    marginRight: -theme.spacing(1),
  },
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '600px',
  display: 'flex',
  flexDirection: 'column',
  '& .recharts-responsive-container': {
    flex: 1,
  },
}));

const ChartModal = ({ open, onClose, title, children }) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogHeader>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </DialogHeader>
      <DialogContent>
        <ChartContainer>
          {children}
        </ChartContainer>
      </DialogContent>
    </StyledDialog>
  );
};

export default ChartModal; 