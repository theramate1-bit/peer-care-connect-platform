/**
 * PDF Receipt Generator
 * Generates PDF receipts for completed sessions and payments
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReceiptData {
  receiptId: string;
  sessionId: string;
  clientName: string;
  therapistName: string;
  therapistRole: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  status: string;
  createdAt: string;
}

export interface ReceiptOptions {
  includeLogo?: boolean;
  includeQRCode?: boolean;
  includeTerms?: boolean;
  watermark?: string;
}

export class PDFReceiptGenerator {
  /**
   * Generate a PDF receipt from data
   */
  static async generateReceipt(
    data: ReceiptData,
    options: ReceiptOptions = {}
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Set default options
    const opts = {
      includeLogo: true,
      includeQRCode: true,
      includeTerms: true,
      watermark: 'TheraMate',
      ...options
    };

    // Colors
    const primaryColor = '#2563eb';
    const secondaryColor = '#64748b';
    const accentColor = '#059669';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo placeholder
    if (opts.includeLogo) {
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 10, 20, 20, 'F');
      doc.setTextColor(primaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('THERAMATE', 45, 22);
    }

    // Receipt title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SESSION RECEIPT', pageWidth - 20, 25, { align: 'right' });

    // Receipt details
    let yPosition = 60;
    
    // Receipt ID
    doc.setTextColor(secondaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${data.receiptId}`, 20, yPosition);
    doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });
    
    yPosition += 20;

    // Session information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Details', 20, yPosition);
    
    yPosition += 15;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${data.clientName}`, 20, yPosition);
    doc.text(`Therapist: ${data.therapistName}`, 20, yPosition + 8);
    doc.text(`Specialty: ${data.therapistRole}`, 20, yPosition + 16);
    
    doc.text(`Date: ${new Date(data.sessionDate).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });
    doc.text(`Time: ${data.sessionTime}`, pageWidth - 20, yPosition + 8, { align: 'right' });
    doc.text(`Duration: ${data.duration} minutes`, pageWidth - 20, yPosition + 16, { align: 'right' });
    
    yPosition += 40;

    // Payment information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Information', 20, yPosition);
    
    yPosition += 15;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount: ${data.currency} ${(data.amount / 100).toFixed(2)}`, 20, yPosition);
    doc.text(`Payment Method: ${data.paymentMethod}`, 20, yPosition + 8);
    doc.text(`Payment ID: ${data.paymentId}`, 20, yPosition + 16);
    doc.text(`Status: ${data.status.toUpperCase()}`, 20, yPosition + 24);
    
    yPosition += 50;

    // Payment summary box
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPosition, pageWidth - 40, 30, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount', 30, yPosition + 12);
    doc.text(`${data.currency} ${(data.amount / 100).toFixed(2)}`, pageWidth - 30, yPosition + 12, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor);
    doc.text('Payment completed successfully', 30, yPosition + 22);

    yPosition += 50;

    // QR Code placeholder
    if (opts.includeQRCode) {
      doc.setFillColor(240, 240, 240);
      doc.rect(pageWidth - 50, yPosition, 30, 30, 'F');
      doc.setTextColor(secondaryColor);
      doc.setFontSize(8);
      doc.text('QR', pageWidth - 35, yPosition + 20, { align: 'center' });
    }

    // Footer
    yPosition = pageHeight - 40;
    
    if (opts.includeTerms) {
      doc.setTextColor(secondaryColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('This receipt is generated automatically by TheraMate.', 20, yPosition);
      doc.text('For support, contact: support@theramate.com', 20, yPosition + 8);
      doc.text('Terms and conditions apply. Please keep this receipt for your records.', 20, yPosition + 16);
    }

    // Watermark
    if (opts.watermark) {
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'normal');
      doc.text(opts.watermark, pageWidth / 2, pageHeight / 2, { 
        align: 'center',
        angle: 45 
      });
    }

    // Generate blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Generate receipt from HTML element
   */
  static async generateReceiptFromHTML(
    element: HTMLElement,
    filename: string = 'receipt.pdf'
  ): Promise<Blob> {
    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return doc.output('blob');
    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      throw new Error('Failed to generate PDF from HTML');
    }
  }

  /**
   * Download receipt as PDF
   */
  static async downloadReceipt(
    data: ReceiptData,
    filename?: string,
    options?: ReceiptOptions
  ): Promise<void> {
    try {
      const pdfBlob = await this.generateReceipt(data, options);
      const url = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `receipt-${data.receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw new Error('Failed to download receipt');
    }
  }

  /**
   * Generate receipt URL for sharing
   */
  static async generateReceiptURL(
    data: ReceiptData,
    options?: ReceiptOptions
  ): Promise<string> {
    try {
      const pdfBlob = await this.generateReceipt(data, options);
      return URL.createObjectURL(pdfBlob);
    } catch (error) {
      console.error('Error generating receipt URL:', error);
      throw new Error('Failed to generate receipt URL');
    }
  }

  /**
   * Generate receipt data from session and payment
   */
  static createReceiptData(
    session: any,
    payment: any,
    client: any,
    therapist: any
  ): ReceiptData {
    return {
      receiptId: payment.id.slice(0, 8).toUpperCase(),
      sessionId: session.id,
      clientName: `${client.first_name} ${client.last_name}`,
      therapistName: `${therapist.first_name} ${therapist.last_name}`,
      therapistRole: therapist.user_role.replace('_', ' ').toUpperCase(),
      sessionDate: session.session_date,
      sessionTime: session.session_time,
      duration: session.duration || 60,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: 'Card Payment',
      paymentId: payment.stripe_payment_intent_id || payment.id,
      status: payment.status,
      createdAt: payment.created_at
    };
  }
}
