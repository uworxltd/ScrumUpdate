/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private readonly COLOR_PALETTE = {
    primary: '#2563eb',
    secondary: '#1f2937',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    lightBg: '#f3f4f6',
    border: '#e5e7eb',
    text: '#1f2937',
    textLight: '#6b7280'
  };

  private logoDataUrl: string | null = null;

  constructor() {
    this.loadLogoAsDataUrl();
  }

  /**
   * Load logo SVG as data URL by rendering to canvas
   */
  private loadLogoAsDataUrl(): void {
    try {
      const logoPath = 'assets/images/scrumupdate-logo-v1.svg';
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 200, 200);
            this.logoDataUrl = canvas.toDataURL('image/png');
          }
        } catch (e) {
          console.warn('Error converting logo to canvas:', e);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load logo image');
      };
      img.src = logoPath;
    } catch (e) {
      console.warn('Error in loadLogoAsDataUrl:', e);
    }
  }

  /**
   * Add logo to PDF page
   */
  private addLogoPDF(doc: jsPDF): void {
    try {
      if (this.logoDataUrl) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 18;
        const logoHeight = 16;
        const margin = 8;
        const logoX = pageWidth - margin - logoWidth;
        const logoY = margin;
        const textX = logoX + logoWidth / 2;
        const textY = logoY + logoHeight + 6;

        // Add clickable logo image
        doc.addImage(this.logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);

        // Add link to logo area
        doc.link(logoX, logoY, logoWidth, logoHeight, { pageNumber: undefined, url: 'https://scrumupdate.com/' });

        // Add "ScrumUpdate" text below logo - centered and clickable
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('ScrumUpdate', textX, textY, { align: 'center' });

        // Add link to text area
        const textWidth = doc.getTextWidth('ScrumUpdate');
        doc.link(textX - textWidth / 2, textY - 2, textWidth, 4, { pageNumber: undefined, url: 'https://scrumupdate.com/' });
      }
    } catch (e) {
      console.warn('Error adding logo to PDF:', e);
      // Continue without logo - don't break PDF generation
    }
  }

  /**
   * Sanitize text for PDF to remove special unicode characters
   */
  sanitizePdfText(value: string): string {
    const normalized = (value || '')
      // Remove special unicode spaces that sometimes appear between every character in AI text
      // (thin space, hair space, narrow no-break space, ideographic space, etc.)
      .replace(/([A-Za-z0-9])[\u00A0\u2000-\u200A\u202F\u205F\u3000]([A-Za-z0-9])/g, '$1$2')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // nbsp + other spaces
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // en/em dash
      .replace(/\u2026/g, '...') // ellipsis
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Some models return strings like "B a c k w a r d" using normal spaces.
    // Collapse long runs of single-character tokens back into a word.
    // Only triggers when there are at least 5 characters (4 spaces) to avoid harming normal text.
    return (
      normalized
        .replace(/\b(?:[A-Za-z0-9]\s){4,}[A-Za-z0-9]\b/g, (m) => m.replace(/\s+/g, ''))
        // Last-resort: drop any remaining non-ASCII chars that can trigger font fallback in viewers.
        .replace(/[^\x20-\x7E]/g, '')
    );
  }

  /**
   * Get line height for current PDF font
   */
  getLineHeight(doc: jsPDF): number {
    return (doc.getFontSize() * doc.getLineHeightFactor()) / (doc as any).internal.scaleFactor;
  }

  /**
   * Generate HTML element to PDF canvas
   */
  async htmlToCanvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement> {
    return html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      devicePixelRatio: 2,
      ...options
    });
  }

  /**
   * Get color palette for PDF documents
   */
  getColorPalette() {
    return { ...this.COLOR_PALETTE };
  }

  /**
   * Generate Ticket Details PDF with AI insights
   */
  generateTicketPDF(ticketData: {
    key: string;
    summary: string;
    status: string;
    statusDays: number;
    priority: string;
    insights: {
      whatWentWrong: string[];
      rootCause: string;
      recommendedActions: string[];
      timelineHighlights: Array<{ daysAgo: number; description: string; icon: string }>;
    };
  }): jsPDF {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    (doc as any).setCharSpace?.(0);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    const getLineHeight = (): number => (doc.getFontSize() * doc.getLineHeightFactor()) / (doc as any).internal.scaleFactor;

    const colors = this.getColorPalette();

    // ===== HEADER =====
    doc.setTextColor(colors.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ticket: ${this.sanitizePdfText(ticketData.key)}`, margin, yPosition);
    yPosition += 7;

    doc.setTextColor(colors.textLight);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(this.sanitizePdfText(ticketData.summary || ''), pageWidth - margin * 2);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * getLineHeight() + 8;

    // ===== INFO BANNER =====
    doc.setFillColor(254, 243, 224);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition - 2, pageWidth - margin * 2, 11, 'FD');
    doc.setTextColor(92, 64, 51);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('AI-generated insights. Information may be incomplete or inaccurate. Please verify before taking action.', margin + 2, yPosition + 2);
    yPosition += 14;

    // ===== TWO COLUMN TABLE: What Went Wrong & Timeline =====
    const tableMargin = margin;
    const tableWidth = pageWidth - margin * 2;
    const colWidth = tableWidth / 2;
    const cellPadding = 3;

    // Table header background
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(tableMargin, yPosition, tableWidth, 7, 'FD');

    // Vertical divider in header
    doc.line(tableMargin + colWidth, yPosition, tableMargin + colWidth, yPosition + 7);

    // Header text - centered
    doc.setTextColor(colors.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('What Went Wrong', tableMargin + colWidth / 2, yPosition + 5, { align: 'center' });
    doc.text('Timeline', tableMargin + colWidth + colWidth / 2, yPosition + 5, { align: 'center' });

    // Content area
    yPosition += 7;
    const tableContentStartY = yPosition;
    let leftColumnHeight = 0;
    let rightColumnHeight = 0;

    // Calculate left column content
    let wrongY = tableContentStartY + cellPadding;
    if (ticketData.insights.whatWentWrong && ticketData.insights.whatWentWrong.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text);

      ticketData.insights.whatWentWrong.forEach((issue) => {
        const issueLines = doc.splitTextToSize(this.sanitizePdfText(issue), colWidth - cellPadding * 4);
        wrongY += issueLines.length * getLineHeight() + 2;
      });
      leftColumnHeight = wrongY - tableContentStartY;
    } else {
      leftColumnHeight = getLineHeight() + cellPadding;
    }

    // Root Cause height
    if (ticketData.insights.rootCause) {
      const causeLines = doc.splitTextToSize(this.sanitizePdfText(ticketData.insights.rootCause), colWidth - cellPadding * 4);
      leftColumnHeight += getLineHeight() + causeLines.length * getLineHeight() + cellPadding;
    }

    // Calculate right column content
    let timelineY = tableContentStartY + cellPadding;
    if (ticketData.insights.timelineHighlights && ticketData.insights.timelineHighlights.length > 0) {
      ticketData.insights.timelineHighlights.forEach((event) => {
        const descLines = doc.splitTextToSize(this.sanitizePdfText(event.description), colWidth - cellPadding * 4 - 20);
        rightColumnHeight = Math.max(rightColumnHeight, timelineY - tableContentStartY + descLines.length * getLineHeight() + 2);
        timelineY += Math.max(descLines.length, 1) * getLineHeight() + 2;
      });
    } else {
      rightColumnHeight = getLineHeight() + cellPadding;
    }

    const tableHeight = Math.max(leftColumnHeight, rightColumnHeight) + cellPadding;

    // Draw table cells with borders
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(tableMargin, tableContentStartY, colWidth, tableHeight, 'S');
    doc.rect(tableMargin + colWidth, tableContentStartY, colWidth, tableHeight, 'S');

    // Left column - What Went Wrong
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.text);

    wrongY = tableContentStartY + cellPadding;
    if (ticketData.insights.whatWentWrong && ticketData.insights.whatWentWrong.length > 0) {
      ticketData.insights.whatWentWrong.forEach((issue) => {
        const issueLines = doc.splitTextToSize(this.sanitizePdfText(issue), colWidth - cellPadding * 4);
        doc.text('•', tableMargin + cellPadding, wrongY);
        doc.text(issueLines, tableMargin + cellPadding + 3, wrongY);
        wrongY += issueLines.length * getLineHeight() + 1.5;
      });
    } else {
      doc.setTextColor(colors.textLight);
      doc.text('No issues found', tableMargin + cellPadding, wrongY);
      wrongY += getLineHeight();
    }

    // Root Cause
    if (ticketData.insights.rootCause) {
      wrongY += 2;
      doc.setTextColor(colors.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Root Cause:', tableMargin + cellPadding, wrongY);
      wrongY += 3;

      doc.setFont('helvetica', 'normal');
      const causeLines = doc.splitTextToSize(this.sanitizePdfText(ticketData.insights.rootCause), colWidth - cellPadding * 4);
      doc.setFontSize(8);
      doc.setTextColor(colors.text);
      doc.text(causeLines, tableMargin + cellPadding, wrongY);
    }

    // Right column - Timeline
    timelineY = tableContentStartY + cellPadding;
    doc.setFontSize(8);
    doc.setTextColor(colors.text);

    if (ticketData.insights.timelineHighlights && ticketData.insights.timelineHighlights.length > 0) {
      ticketData.insights.timelineHighlights.forEach((event) => {
        const label = `${event.daysAgo}d ago`;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.textLight);
        doc.text(label, tableMargin + colWidth + cellPadding, timelineY);

        const descLines = doc.splitTextToSize(this.sanitizePdfText(event.description), colWidth - cellPadding * 4 - 20);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text);
        doc.text(descLines, tableMargin + colWidth + cellPadding + 18, timelineY);
        timelineY += Math.max(descLines.length, 1) * getLineHeight() + 1.5;
      });
    } else {
      doc.setTextColor(colors.textLight);
      doc.text('No timeline events', tableMargin + colWidth + cellPadding, timelineY);
    }

    yPosition = tableContentStartY + tableHeight + 6;

    // ===== STATUS DETAILS SECTION =====
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPosition - 2, pageWidth - margin * 2, 22, 'FD');

    doc.setTextColor(colors.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Ticket Details', margin + 3, yPosition + 2);

    // Status box
    const detailBoxWidth = (pageWidth - margin * 2 - 8) / 3;
    doc.setFillColor(209, 250, 229);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.rect(margin + 3, yPosition + 6, detailBoxWidth, 10, 'FD');
    doc.setTextColor(colors.text);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Status', margin + 5, yPosition + 9);
    doc.setTextColor(colors.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.sanitizePdfText(ticketData.status), margin + 5, yPosition + 15);

    // Days in Status box
    const box2X = margin + 3 + detailBoxWidth + 2;
    doc.setFillColor(254, 240, 220);
    doc.setDrawColor(245, 158, 11);
    doc.rect(box2X, yPosition + 6, detailBoxWidth, 10, 'FD');
    doc.setTextColor(colors.text);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Days in Status', box2X + 2, yPosition + 9);
    doc.setTextColor(colors.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${ticketData.statusDays}`, box2X + 2, yPosition + 15);

    // Priority box
    const box3X = box2X + detailBoxWidth + 2;
    doc.setFillColor(230, 224, 255);
    doc.setDrawColor(139, 92, 246);
    doc.rect(box3X, yPosition + 6, detailBoxWidth, 10, 'FD');
    doc.setTextColor(colors.text);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Priority', box3X + 2, yPosition + 9);
    doc.setTextColor(colors.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.sanitizePdfText(ticketData.priority || 'N/A'), box3X + 2, yPosition + 15);

    yPosition += 38;

    // ===== RECOMMENDED ACTIONS =====
    const ensureSpace = (neededHeight: number): void => {
      if (yPosition + neededHeight > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
    };

    ensureSpace(14);
    doc.setTextColor(colors.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Actions', margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (ticketData.insights.recommendedActions && ticketData.insights.recommendedActions.length > 0) {
      ticketData.insights.recommendedActions.forEach((action, index) => {
        ensureSpace(8);
        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}.`, margin + 2, yPosition);
        const actionLines = doc.splitTextToSize(this.sanitizePdfText(action), pageWidth - margin * 2 - 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text);
        doc.text(actionLines, margin + 8, yPosition);
        yPosition += actionLines.length * getLineHeight() + 3;
      });
    } else {
      doc.setTextColor(colors.textLight);
      doc.text('No recommendations available', margin, yPosition);
      yPosition += 8;
    }

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Add logo to top right
      this.addLogoPDF(doc);

      doc.setFontSize(8);
      doc.setTextColor(colors.textLight);

      // Draw footer with bold "ScrumUpdate"
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textLight);
      doc.text('Generated by ', xPos, pageHeight - 10);
      xPos += doc.getTextWidth('Generated by ');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.primary);
      const scrumupdateWidth = doc.getTextWidth('ScrumUpdate');
      doc.textWithLink('ScrumUpdate', xPos, pageHeight - 10, { pageNumber: undefined, url: 'https://scrumupdate.com/' });
      // Add underline to ScrumUpdate text
      doc.line(xPos, pageHeight - 9, xPos + scrumupdateWidth, pageHeight - 9);
      xPos += scrumupdateWidth;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textLight);
      doc.text(` on ${dateStr} at ${timeStr}`, xPos, pageHeight - 10);

      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    }

    return doc;
  }

  /**
   * Generate Epic Details PDF with metrics and insights
   */
  generateEpicPDF(epicData: {
    key: string;
    name: string;
    summary?: string;
    storyPoints: { completed: number; total: number; percentage: number };
    ticketMetrics: { done: number; inProgress: number; todo: number };
    hygienePercentage: number;
    healthPercentage: number;
    confidencePercentage: number;
    risks: string[];
    recommendations: string[];
    tickets: Array<{ key: string; summary: string; status: string; points: number }>;
  }): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const bottomMargin = 15;
    let yPosition = margin;

    const colors = this.getColorPalette();
    const getLineHeight = (): number => (doc.getFontSize() * doc.getLineHeightFactor()) / (doc as any).internal.scaleFactor;

    // ===== PAGE 1: HEADER & KEY METRICS =====

    // Header - matching ticket PDF style
    doc.setTextColor(colors.primary);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Epic: ${this.sanitizePdfText(epicData.key)}`, margin, margin + 5);
    yPosition = margin + 12;

    doc.setTextColor(colors.textLight);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(this.sanitizePdfText(epicData.name || ''), margin, yPosition);
    yPosition += 8;

    // ===== INFO BANNER =====
    doc.setFillColor(254, 243, 224);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition - 2, pageWidth - margin * 2, 11, 'FD');
    doc.setTextColor(92, 64, 51);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('AI-generated insights. Information may be incomplete or inaccurate. Please verify before taking action.', margin + 2, yPosition + 2);
    yPosition += 18;

    // ===== OBJECTIVE SECTION =====
    if (epicData.summary) {
      doc.setTextColor(colors.text);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Objective', margin, yPosition);
      yPosition += 6;

      doc.setTextColor(colors.text);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const summaryLines = doc.splitTextToSize(this.sanitizePdfText(epicData.summary), pageWidth - margin * 2);
      doc.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 6;
    }

    // Key Metrics - 3 Column Layout (Centered with spacing)
    const totalMetricWidth = pageWidth - margin * 2;
    const metricWidth = totalMetricWidth / 3 - 4;
    const metrics = [
      { label: 'Data Quality', value: epicData.hygienePercentage },
      { label: 'Completion Rate', value: epicData.healthPercentage },
      { label: 'Confidence', value: epicData.confidencePercentage }
    ];

    // Calculate starting position to center the boxes
    const totalBoxesWidth = 3 * metricWidth + 2 * 4;
    const leftoverSpace = totalMetricWidth - totalBoxesWidth;
    const startX = margin + leftoverSpace / 2;

    metrics.forEach((metric, index) => {
      const boxX = startX + index * (metricWidth + 4);
      const boxY = yPosition;

      // Determine color based on percentage
      let borderColor: [number, number, number];
      let bgColor: [number, number, number];
      let textColor: [number, number, number];

      if (metric.value >= 80) {
        // Excellent - Green
        borderColor = [5, 150, 105];
        bgColor = [236, 253, 245];
        textColor = [5, 150, 105];
      } else if (metric.value >= 60) {
        // Good - Teal/Cyan
        borderColor = [8, 145, 178];
        bgColor = [236, 245, 255];
        textColor = [8, 145, 178];
      } else if (metric.value >= 40) {
        // Fair - Yellow
        borderColor = [202, 138, 4];
        bgColor = [254, 252, 232];
        textColor = [202, 138, 4];
      } else {
        // Poor - Red
        borderColor = [220, 38, 38];
        bgColor = [254, 242, 242];
        textColor = [220, 38, 38];
      }

      // Background
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(1);
      doc.rect(boxX, boxY, metricWidth, 35, 'FD');

      // Value - Always black
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text(`${metric.value}%`, boxX + metricWidth / 2, boxY + 18, { align: 'center' });

      // Label
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(metric.label, boxX + metricWidth / 2, boxY + 30, { align: 'center' });
    });

    yPosition += 42;

    // Progress Bar
    yPosition += 6;
    doc.setTextColor(colors.text);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Story Points Progress', margin, yPosition);
    yPosition += 6;

    const barWidth = pageWidth - margin * 2;
    const barHeight = 8;
    const percentage = epicData.storyPoints.percentage;

    // Background bar
    doc.setFillColor(229, 231, 235);
    doc.rect(margin, yPosition, barWidth, barHeight, 'F');

    // Filled bar - Green
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, yPosition, (barWidth * percentage) / 100, barHeight, 'F');

    // Text
    doc.setTextColor(colors.text);
    doc.setFontSize(9);
    doc.text(`${epicData.storyPoints.completed}/${epicData.storyPoints.total} pts (${percentage}%)`, margin + barWidth / 2, yPosition + barHeight / 2 + 1.5, { align: 'center' });

    yPosition += 16;

    // ===== OVERVIEW SECTION =====
    yPosition += 6;
    doc.setTextColor(colors.text);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Overview', margin, yPosition);
    yPosition += 6;

    // Two Column Overview with proper containment
    const colWidth = (pageWidth - margin * 2 - 8) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 8;
    const boxPadding = 4;
    const contentIndent = boxPadding + 2;
    const lineHeight = 6;

    // Calculate dynamic heights based on content
    const statusLines = 3; // Done, In Progress, To Do
    const statusBoxHeight = boxPadding + 8 + statusLines * lineHeight + boxPadding;

    // Risk factors - count based on conditions
    let riskLines = 1; // At least "Epic Completed" or first risk
    if (epicData.storyPoints.percentage < 100) {
      if (epicData.healthPercentage < 60) riskLines++;
      if (epicData.confidencePercentage < 60) riskLines++;
    }
    const riskBoxHeight = boxPadding + 8 + riskLines * lineHeight + boxPadding;
    const boxHeight = Math.max(statusBoxHeight, riskBoxHeight);

    // Left Column - Ticket Status (in box)
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.rect(col1X, yPosition, colWidth, boxHeight, 'FD');

    // Heading inside box
    doc.setTextColor(colors.text);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Ticket Status', col1X + contentIndent, yPosition + boxPadding + 2);

    let statusY = yPosition + boxPadding + 8;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(colors.text);

    doc.text(`• Done: ${epicData.ticketMetrics.done}`, col1X + contentIndent, statusY);
    statusY += lineHeight;
    doc.text(`• In Progress: ${epicData.ticketMetrics.inProgress}`, col1X + contentIndent, statusY);
    statusY += lineHeight;
    doc.text(`• To Do: ${epicData.ticketMetrics.todo}`, col1X + contentIndent, statusY);

    // Right Column - Risk Factors (in box)
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.rect(col2X, yPosition, colWidth, boxHeight, 'FD');

    // Heading inside box
    doc.setTextColor(colors.text);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Risk Factors', col2X + contentIndent, yPosition + boxPadding + 2);

    let riskY = yPosition + boxPadding + 8;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');

    if (epicData.storyPoints.percentage === 100) {
      doc.setTextColor(colors.text);
      doc.text('• Epic Completed', col2X + contentIndent, riskY);
    } else {
      const remainingPoints = epicData.storyPoints.total - epicData.storyPoints.completed;
      doc.setTextColor(colors.text);
      doc.text(`• ${remainingPoints} points remaining`, col2X + contentIndent, riskY);
      riskY += lineHeight;

      if (epicData.healthPercentage < 60) {
        doc.setTextColor(colors.text);
        doc.text('• Health below 60%', col2X + contentIndent, riskY);
        riskY += lineHeight;
      }

      if (epicData.confidencePercentage < 60) {
        doc.setTextColor(colors.text);
        doc.text('• Low confidence forecast', col2X + contentIndent, riskY);
      }
    }

    yPosition += boxHeight + 10;

    // ===== RECOMMENDATIONS SECTION =====
    if (epicData.recommendations && epicData.recommendations.length > 0) {
      if (yPosition + 25 > pageHeight - bottomMargin) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 6;
      doc.setTextColor(colors.text);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Recommended Actions', margin, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const getLineHeight = (): number => (doc.getFontSize() * doc.getLineHeightFactor()) / (doc as any).internal.scaleFactor;

      epicData.recommendations.forEach((rec, index) => {
        if (yPosition + 10 > pageHeight - bottomMargin) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setTextColor(colors.primary);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}.`, margin + 2, yPosition);

        const recLines = doc.splitTextToSize(this.sanitizePdfText(rec), pageWidth - margin * 2 - 8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(colors.text);
        doc.text(recLines, margin + 8, yPosition);
        yPosition += recLines.length * getLineHeight() + 3;
      });
    }

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Add logo to top right
      this.addLogoPDF(doc);

      doc.setFontSize(8);
      doc.setTextColor(colors.textLight);

      // Draw footer with bold "ScrumUpdate"
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textLight);
      doc.text('Generated by ', xPos, pageHeight - 10);
      xPos += doc.getTextWidth('Generated by ');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.primary);
      const scrumupdateWidth = doc.getTextWidth('ScrumUpdate');
      doc.textWithLink('ScrumUpdate', xPos, pageHeight - 10, { pageNumber: undefined, url: 'https://scrumupdate.com/' });
      // Add underline to ScrumUpdate text
      doc.line(xPos, pageHeight - 9, xPos + scrumupdateWidth, pageHeight - 9);
      xPos += scrumupdateWidth;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textLight);
      doc.text(` on ${dateStr} at ${timeStr}`, xPos, pageHeight - 10);

      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    }

    return doc;
  }

  /**
   * Generate Sprint Insight PDF with KPIs, delivery confidence, and insights
   */
  generateSprintInsightPDF(sprintData: {
    sprintName: string;
    teamName: string;
    deliveryConfidence: { label: string; percent: number; color: string; icon: string };
    kpi: {
      storyPoints: { done: number; total: number };
      scopeChange: { percent: number };
      ticketHygiene: { percent: number };
      sprintProgress: { percent: number };
    };
    insights: Array<{ id: string; title: string; summary: string; body: string; icon: string; color: string }>;
  }): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const bottomMargin = 15;
    let yPosition = margin;

    const colors = this.getColorPalette();
    const getLineHeight = (): number => (doc.getFontSize() * doc.getLineHeightFactor()) / (doc as any).internal.scaleFactor;

    // ===== HEADER =====
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(`${sprintData.sprintName}`, margin, 12);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`${sprintData.teamName}`, margin, 22);

    yPosition = 40;

    // ===== DELIVERY CONFIDENCE =====
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.rect(margin, yPosition, pageWidth - margin * 2, 25, 'FD');

    doc.setTextColor(colors.text);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Delivery Confidence', margin + 3, yPosition + 5);

    // Parse hex color
    const r = parseInt(sprintData.deliveryConfidence.color.slice(1, 3), 16);
    const g = parseInt(sprintData.deliveryConfidence.color.slice(3, 5), 16);
    const b = parseInt(sprintData.deliveryConfidence.color.slice(5, 7), 16);

    doc.setFillColor(r, g, b);
    doc.rect(margin + 90, yPosition + 3, 40, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${sprintData.deliveryConfidence.percent}%`, margin + 95, yPosition + 8, { align: 'center' });

    doc.setTextColor(colors.textLight);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${sprintData.deliveryConfidence.icon} ${sprintData.deliveryConfidence.label}`, margin + 3, yPosition + 18);

    yPosition += 32;

    // ===== KPI SECTION =====
    doc.setTextColor(colors.text);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Sprint KPIs', margin, yPosition);
    yPosition += 7;

    const kpiWidth = (pageWidth - margin * 2 - 9) / 4;
    const kpis = [
      { label: 'Story Points', value: `${sprintData.kpi.storyPoints.done}/${sprintData.kpi.storyPoints.total}` },
      { label: 'Progress', value: `${sprintData.kpi.sprintProgress}%` },
      { label: 'Hygiene', value: `${sprintData.kpi.ticketHygiene}%` },
      { label: 'Scope Change', value: `${sprintData.kpi.scopeChange.percent}%` }
    ];

    kpis.forEach((kpi, index) => {
      const boxX = margin + index * (kpiWidth + 2.25);
      const boxY = yPosition;

      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.rect(boxX, boxY, kpiWidth, 18, 'FD');

      doc.setTextColor(colors.text);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(kpi.value, boxX + kpiWidth / 2, boxY + 7, { align: 'center' });

      doc.setTextColor(colors.textLight);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(kpi.label, boxX + kpiWidth / 2, boxY + 14, { align: 'center' });
    });

    yPosition += 25;

    // ===== INSIGHTS SECTION =====
    if (sprintData.insights && sprintData.insights.length > 0) {
      if (yPosition + 20 > pageHeight - bottomMargin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setTextColor(colors.text);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Sprint Insights', margin, yPosition);
      yPosition += 8;

      sprintData.insights.forEach((insight) => {
        if (yPosition + 15 > pageHeight - bottomMargin) {
          doc.addPage();
          yPosition = margin;
        }

        // Insight title with color background
        const bgR = parseInt(insight.color.slice(1, 3), 16);
        const bgG = parseInt(insight.color.slice(3, 5), 16);
        const bgB = parseInt(insight.color.slice(5, 7), 16);

        doc.setFillColor(bgR, bgG, bgB);
        doc.rect(margin, yPosition - 2, pageWidth - margin * 2, 7, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${insight.icon} ${insight.title}`, margin + 2, yPosition + 2);

        yPosition += 8;

        // Insight summary
        doc.setTextColor(colors.text);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const summaryLines = doc.splitTextToSize(this.sanitizePdfText(insight.summary), pageWidth - margin * 2 - 4);
        doc.text(summaryLines, margin + 2, yPosition);
        yPosition += summaryLines.length * getLineHeight() + 4;

        // Insight body (truncate if too long)
        const bodyLines = doc.splitTextToSize(this.sanitizePdfText(insight.body.replace(/<[^>]*>/g, '')), pageWidth - margin * 2 - 4);
        const maxBodyLines = 5; // Limit to 5 lines per insight
        const displayLines = bodyLines.slice(0, maxBodyLines);
        doc.setFontSize(8);
        doc.text(displayLines, margin + 2, yPosition);
        yPosition += displayLines.length * getLineHeight() + 6;
      });
    }

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Add logo to top right
      this.addLogoPDF(doc);

      doc.setFontSize(8);
      doc.setTextColor(colors.textLight);

      // Draw footer with bold "ScrumUpdate"
      let xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.text('Generated by ', xPos, pageHeight - 10);
      xPos += doc.getTextWidth('Generated by ');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.primary);
      const scrumupdateWidth = doc.getTextWidth('ScrumUpdate');
      doc.textWithLink('ScrumUpdate', xPos, pageHeight - 10, { pageNumber: undefined, url: 'https://scrumupdate.com/' });
      // Add underline to ScrumUpdate text
      doc.line(xPos, pageHeight - 9, xPos + scrumupdateWidth, pageHeight - 9);
      xPos += scrumupdateWidth;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textLight);
      doc.text(` on ${dateStr} at ${timeStr}`, xPos, pageHeight - 10);

      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    }

    return doc;
  }
}
