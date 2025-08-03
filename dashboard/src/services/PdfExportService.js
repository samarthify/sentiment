import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Configuration options for PDF export
const pdfExportConfig = {
  quality: 2, // Higher for better quality
  scale: 2, // Scale factor for better resolution
  useCORS: true, // Enable CORS for any external images
  logging: false, // Disable logging
  backgroundColor: '#ffffff', // Force white background
};

/**
 * Export dashboard elements to PDF
 * @param {string} title - PDF document title
 */
const exportToPdf = async (title = 'Dashboard Export') => {
  try {
    // Add exporting class to body for visual feedback
    document.body.classList.add('exporting');
    
    // Create a new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // margins in mm
    
    // Find all elements with the exportable class
    const elements = document.querySelectorAll('.exportable');
    if (!elements || elements.length === 0) {
      console.error('No exportable elements found');
      return false;
    }
    
    // Add title to the PDF
    pdf.setFontSize(18);
    pdf.text(title, margin, margin + 10);
    
    // Add metadata
    pdf.setProperties({
      title: title,
      subject: 'Sentiment Analysis Dashboard',
      author: 'Sentiment Analysis Tool',
      keywords: 'sentiment, analysis, dashboard',
      creator: 'PDF Export Tool'
    });
    
    pdf.setFontSize(12);
    
    let yOffset = margin + 20; // Starting Y position after title
    let currentPage = 1;
    
    // Add timestamp to PDF
    const dateStr = new Date().toLocaleString();
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Generated on: ${dateStr}`, margin, margin + 16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    
    // Process each element
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Highlight current element being processed
      element.classList.add('currently-exporting');
      
      // Wait a moment to allow the UI to update with the highlight
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate canvas from the element
      const canvas = await html2canvas(element, pdfExportConfig);
      
      // Remove highlight
      element.classList.remove('currently-exporting');
      
      // Get element dimensions and adjust for PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yOffset + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin + 10;
        currentPage++;
      }
      
      // Add element title if available
      const elementTitle = element.getAttribute('data-title');
      if (elementTitle) {
        pdf.setFontSize(14);
        pdf.text(elementTitle, margin, yOffset);
        yOffset += 8;
        pdf.setFontSize(12);
      }
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 15; // Add spacing between elements
    }
    
    // Add page numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 30, pageHeight - margin);
    }
    
    // Save the PDF
    pdf.save(`${title}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  } finally {
    // Remove exporting class from body
    document.body.classList.remove('exporting');
  }
};

export default {
  exportToPdf
}; 