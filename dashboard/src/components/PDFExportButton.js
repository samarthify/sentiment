import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Button, 
  Tooltip, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import PdfExportService from '../services/PdfExportService';

/**
 * Button component that triggers PDF export of dashboard elements
 */
const PDFExportButton = ({ title = 'Dashboard Export' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    message: ''
  });

  // Handle the PDF export process
  const handleExport = async () => {
    setLoading(true);

    try {
      // Add exportable class to all dashboard elements temporarily
      const dashboardElements = document.querySelectorAll(
        // Select all chart containers and data tables, but exclude specific date cards
        '.MuiCard-root:not([aria-label*="Significant"]), .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDrawer-paper):not(.MuiDialog-paper):not(.MuiAlert-root):not([aria-label*="Significant"])'
      );

      if (!dashboardElements || dashboardElements.length === 0) {
        throw new Error(t('pdfExport.noElementsFound'));
      }

      // Initialize progress
      setProgress({
        current: 0,
        total: dashboardElements.length
      });

      // Add exportable class and data-title attributes
      const processedElements = new Map(); // Track elements by their content hash
      let processedCount = 0;
      
      dashboardElements.forEach(element => {
        // Skip if this is a date card from Significant Sentiment Shifts
        if (element.getAttribute('aria-label')?.includes('Significant')) {
          processedCount++;
          setProgress(prev => ({ ...prev, current: processedCount }));
          return;
        }

        // Skip if parent is a grid item containing sentiment shift cards
        const parentGrid = element.closest('.MuiGrid-item');
        if (parentGrid?.querySelector('[aria-label*="Significant"]')) {
          processedCount++;
          setProgress(prev => ({ ...prev, current: processedCount }));
          return;
        }

        // Try to find a title inside the element
        const titleElement = element.querySelector('h5, h6, .MuiTypography-h5, .MuiTypography-h6');
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Create a unique identifier for the element based on its content
        const contentHash = title + '-' + element.innerText.substring(0, 50);
        
        // Check if we've seen this content before
        if (!processedElements.has(contentHash)) {
          element.classList.add('exportable');
          if (title) {
            element.setAttribute('data-title', title);
          }
          processedElements.set(contentHash, element);
        }

        processedCount++;
        setProgress(prev => ({ ...prev, current: processedCount }));
      });

      // Export to PDF
      const result = await PdfExportService.exportToPdf(title);
      
      // Clean up - remove exportable class
      processedElements.forEach(element => {
        element.classList.remove('exportable');
        if (element.hasAttribute('data-title')) {
          element.removeAttribute('data-title');
        }
      });

      if (result) {
        setSnackbar({
          open: true,
          message: t('pdfExport.successMessage'),
          severity: 'success'
        });
      } else {
        throw new Error(t('pdfExport.exportFailed'));
      }
    } catch (error) {
      console.error('Export error:', error);
      
      // Show detailed error in dialog for more complex errors
      if (error.message.includes('HTML2CANVAS') || error.message.length > 60) {
        setErrorDialog({
          open: true,
          message: `${t('pdfExport.exportFailedPrefix')} ${error.message}`
        });
      } else {
        // Show simple error in snackbar
        setSnackbar({
          open: true,
          message: `${t('pdfExport.exportFailedPrefix')} ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
      // Reset progress
      setProgress({ current: 0, total: 0 });
    }
  };

  // Close the snackbar notification
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Close the error dialog
  const handleCloseErrorDialog = () => {
    setErrorDialog({...errorDialog, open: false});
  };

  return (
    <>
      <Tooltip title={t('general.exportPDF')}>
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
          onClick={handleExport}
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 2,
          }}
        >
          {loading ? t('pdfExport.exporting') : t('pdfExport.exportPDF')}
        </Button>
      </Tooltip>
      
      {/* Export Progress Dialog */}
      <Dialog
        open={loading}
        aria-labelledby="export-progress-dialog-title"
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        disableBackdropClick
      >
        <DialogTitle id="export-progress-dialog-title">
          {t('pdfExport.exportingToPDF')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <DialogContentText sx={{ mb: 2 }}>
              {t('pdfExport.processingElements', { current: progress.current, total: progress.total })}
            </DialogContentText>
            <LinearProgress 
              variant="determinate" 
              value={progress.total ? (progress.current / progress.total) * 100 : 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mt: 1, textAlign: 'center' }}
            >
              {t('pdfExport.pleaseWait')}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Success/Error notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Detailed error dialog */}
      <Dialog
        open={errorDialog.open}
        onClose={handleCloseErrorDialog}
        aria-labelledby="error-dialog-title"
      >
        <DialogTitle id="error-dialog-title">
          {t('pdfExport.exportFailedTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography variant="body2" component="p" sx={{ mb: 1 }}>
              {t('pdfExport.errorWhileGenerating')}
            </Typography>
            <Typography 
              variant="body2" 
              component="pre"
              sx={{ 
                p: 2, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 1,
                overflowX: 'auto'
              }}
            >
              {errorDialog.message}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorDialog} color="primary" autoFocus>
            {t('general.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PDFExportButton; 