/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { SprintInsightCarouselActionService } from 'app/services/sprint-insight-carousel-action.service';
import { PdfExportService } from 'app/services/pdf-export.service';
import { PngExportService } from 'app/services/png-export.service';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Insight } from '../sprint-analytics-types';
import { SprintStaticSummaryCardComponent, StatusChangesData } from '../sprint-static-summary-card/sprint-static-summary-card.component';
import { SprintAiBlockersCardComponent } from '../sprint-ai-blockers-card/sprint-ai-blockers-card.component';
import { SprintTeamPulseCardComponent, TeamPulseData } from '../sprint-team-pulse-card/sprint-team-pulse-card.component';
import { SafeHtmlPipe } from 'app/shared/safe-html.pipe';
import { SprintVelocityBurndownCardComponent, SprintVelocityBurndownData } from '../sprint-velocity-burndown-card/sprint-velocity-burndown-card.component';
import { SprintEpicProgressCardComponent } from '../sprint-epic-progress-card/sprint-epic-progress-card.component';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectSprintEpicProgressValue } from 'app/states/sprint-analytics.selector';

@Component({
  selector: 'khoji-sprint-insight-carousel',
  standalone: true,
  templateUrl: './sprint-insight-carousel.component.html',
  styleUrl: './sprint-insight-carousel.component.scss',
  imports: [
    CommonModule,
    CardModule,
    CarouselModule,
    ProgressSpinnerModule,
    TooltipModule,
    SprintStaticSummaryCardComponent,
    SprintTeamPulseCardComponent,
    SafeHtmlPipe,
    SprintVelocityBurndownCardComponent,
    SprintAiBlockersCardComponent,
    SprintEpicProgressCardComponent
  ]
})
export class SprintInsightCarouselComponent implements OnInit, OnChanges, OnDestroy {
  page = 0;
  _insights: Insight[] = [];
  carouselId = 'carousel-' + uuidv4().split('-')[4];
  responsiveOptions: any[] | undefined;
  subscription = new Subscription();
  carouselItems: any[] = [];

  @Input() circular = false;
  @Input() showStaticCard = false;
  @Input() showTeamPulseCard = false;
  @Input() showVelocityBurndownCard = false;
  @Input() statusChangesLoading = false;
  @Input() teamPulseLoading = false;
  @Input() velocityBurndownLoading = false;
  @Input() showAiBlockersCard = true; // Show AI blockers card by default
  @Input() showEpicProgressCard = true; // Show Epic Progress card by default
  @Input() hasEpics = true; // Whether there are epics to display
  @Input() sprintId: string; // Sprint ID for AI blockers card
  @Input() tableId: string = '';

  private _statusChangesData: StatusChangesData | null = null;
  @Input()
  get statusChangesData(): StatusChangesData | null {
    return this._statusChangesData;
  }
  set statusChangesData(val: StatusChangesData | null) {
    this._statusChangesData = val;
    this.updateCarouselItems();
  }

  private _teamPulseData: TeamPulseData | null = null;
  @Input()
  get teamPulseData(): TeamPulseData | null {
    return this._teamPulseData;
  }
  set teamPulseData(val: TeamPulseData | null) {
    this._teamPulseData = val;
    this.updateCarouselItems();
  }

  private _velocityBurndownData: SprintVelocityBurndownData | null = null;
  @Input()
  get velocityBurndownData(): SprintVelocityBurndownData | null {
    return this._velocityBurndownData;
  }
  set velocityBurndownData(val: SprintVelocityBurndownData | null) {
    this._velocityBurndownData = val;
    this.updateCarouselItems();
  }

  private logoDataUrl: string | null = null;

  @Input()
  get insights() {
    return this._insights;
  }
  set insights(val) {
    if (Array.isArray(val)) {
      this._insights = [...val].sort((a, b) => a.priority - b.priority);
      this.updateCarouselItems();
    }
  }

  constructor(private actionService: SprintInsightCarouselActionService, private pdfExportService: PdfExportService, private pngExportService: PngExportService, private store: Store<AppState>) {}

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
  private addLogoPDF(doc: any): void {
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

  ngOnInit(): void {
    // Load logo
    this.loadLogoAsDataUrl();

    const action$ = this.actionService.onAction$(this.carouselId);

    this.subscription.add(
      action$.subscribe((insightId) => {
        this.selectInsight(insightId);
      })
    );

    // Subscribe to epic progress data to determine if we should show epic card
    this.subscription.add(
      this.store.pipe(selectSprintEpicProgressValue).subscribe((data) => {
        this.hasEpics = !!(data && data.epics && Array.isArray(data.epics) && data.epics.length > 0);
        this.updateCarouselItems();
      })
    );

    this.responsiveOptions = [
      {
        breakpoint: '1199px',
        numVisible: 1,
        numScroll: 1
      },
      {
        breakpoint: '991px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '767px',
        numVisible: 1,
        numScroll: 1
      }
    ];

    this.updateCarouselItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['statusChangesLoading'] || changes['teamPulseLoading'] || changes['velocityBurndownLoading']) {
      this.updateCarouselItems();
    }
  }

  updateCarouselItems(): void {
    this.carouselItems = [];

    // Card 1: Static Summary
    if (this.showStaticCard) {
      this.carouselItems.push({
        type: 'static',
        statusChanges: this.statusChangesData,
        loading: this.statusChangesLoading
      });
    }

    // Card 2: AI Blockers Card
    if (this.showAiBlockersCard) {
      this.carouselItems.push({
        type: 'ai-blockers',
        data: null
      });
    }

    // Card 3: Team Pulse Card
    if (this.showTeamPulseCard) {
      this.carouselItems.push({
        type: 'teamPulse',
        data: this.teamPulseData,
        loading: this.teamPulseLoading
      });
    }

    // Card 4: Epic Progress Card
    if (this.showEpicProgressCard && this.hasEpics) {
      this.carouselItems.push({
        type: 'epic-progress',
        data: null
      });
    }

    // Card 5: Velocity Burndown Card
    if (this.showVelocityBurndownCard) {
      this.carouselItems.push({
        type: 'velocityBurndown',
        data: this.velocityBurndownData,
        loading: this.velocityBurndownLoading
      });
    }

    if (Array.isArray(this._insights)) {
      this._insights.forEach((insight) => {
        this.carouselItems.push({
          type: 'insight',
          data: insight
        });
      });
    }
  }

  selectInsight(insightId: string) {
    if (!Array.isArray(this._insights) || this._insights.length === 0) {
      return;
    }

    const index = this._insights.findIndex((c) => c.id === insightId);
    // Adjust for static card, AI blockers card, team pulse card, epic progress card, and velocity burndown card if they exist
    let offset = 0;
    if (this.showStaticCard) offset++;
    if (this.showAiBlockersCard) offset++;
    if (this.showTeamPulseCard) offset++;
    if (this.showEpicProgressCard && this.hasEpics) offset++;
    if (this.showVelocityBurndownCard) offset++;
    this.page = index + offset;
  }

  /**
   * Download sprint insight as PNG
   */
  async downloadSprintInsightPNG(insightData: any): Promise<void> {
    try {
      // Get the carousel container to capture the current visible card
      const carouselContent = document.querySelector('.p-carousel-item-active .insight-card-wrapper') as HTMLElement;

      if (!carouselContent) {
        console.error('Insight card not found');
        return;
      }

      const filename = `sprint-insight-${insightData.id || 'report'}.png`;

      // Clone the card element to avoid modifying the visible DOM
      const clonedCard = carouselContent.cloneNode(true) as HTMLElement;

      // Hide action buttons in the cloned card before capturing
      const actionButtons = clonedCard.querySelector('.insight-actions') as HTMLElement;
      if (actionButtons) {
        actionButtons.style.display = 'none';
      }

      // Create a temporary container positioned off-screen (not hidden, so html2canvas can render it)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '-99999px';
      tempContainer.style.width = carouselContent.offsetWidth + 'px';
      tempContainer.style.display = 'block';
      tempContainer.style.visibility = 'visible';
      tempContainer.appendChild(clonedCard);
      document.body.appendChild(tempContainer);

      // Expand the scrollable content in the cloned card
      const insightBody = clonedCard.querySelector('.insight-body') as HTMLElement;
      if (insightBody) {
        insightBody.style.height = 'auto';
        insightBody.style.maxHeight = 'none';
        insightBody.style.overflow = 'visible';
      }

      // Wait for the cloned element to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the cloned card
      await this.pngExportService.captureFullDialogAsImage(clonedCard, filename);

      // Clean up - remove the temporary container
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error downloading PNG:', error);
    }
  }

  /**
   * Download sprint insight as PDF
   */
  downloadSprintInsightPDF(insightData: any): void {
    try {
      // Get the insight body HTML content
      const insightBody = document.querySelector('.p-carousel-item-active .insight-body') as HTMLElement;

      if (!insightBody) {
        return;
      }

      // Clone the element to capture
      const clonedBody = insightBody.cloneNode(true) as HTMLElement;

      // Expand the scrollable content in the cloned body
      clonedBody.style.height = 'auto';
      clonedBody.style.maxHeight = 'none';
      clonedBody.style.overflow = 'visible';
      clonedBody.style.width = insightBody.offsetWidth + 'px';

      // Create a temporary container off-screen
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(clonedBody);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-99999px';
      tempDiv.style.top = '0px';
      tempDiv.style.width = insightBody.offsetWidth + 'px';
      tempDiv.style.display = 'block';
      tempDiv.style.zIndex = '-9999';
      document.body.appendChild(tempDiv);

      // Give it a moment to render - use longer timeout for complex content
      setTimeout(() => {
        const html2canvas = require('html2canvas');
        const jsPDF = require('jspdf').jsPDF;

        // Force reflow and calculate actual content height
        const scrollHeight = clonedBody.scrollHeight;
        const offsetHeight = clonedBody.offsetHeight;
        const computedHeight = Math.max(scrollHeight, offsetHeight);
        const actualHeight = computedHeight + 500;

        html2canvas(clonedBody, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowHeight: actualHeight,
          windowWidth: clonedBody.offsetWidth,
          letterRendering: true,
          imageTimeout: 15000,
          proxy: null,
          ignoreElements: (element) => {
            return element.classList && (element.classList.contains('p-scrolltop') || element.classList.contains('p-carousel'));
          }
        })
          .then((canvas: any) => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            let yPosition = margin + 15;

            // Add title on first page
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text('AI Insights', margin, margin + 5);

            // Add a line separator
            doc.setDrawColor(229, 231, 235);
            doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

            // Handle multi-page content
            const contentHeight = imgHeight;
            const availableHeight = pageHeight - yPosition - margin;

            if (contentHeight <= availableHeight) {
              // Content fits on one page
              doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            } else {
              // Content spans multiple pages
              let remainingHeight = contentHeight;
              let sourceY = 0;
              let pageNum = 0;

              while (remainingHeight > 0) {
                const heightToDraw = Math.min(remainingHeight, availableHeight);
                const sourceHeight = (heightToDraw * canvas.height) / imgHeight;

                // Create a canvas crop for this page
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;
                const ctx = pageCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
                }

                const pageImgData = pageCanvas.toDataURL('image/png');
                const pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;

                doc.addImage(pageImgData, 'PNG', margin, yPosition, imgWidth, pageImgHeight);

                remainingHeight -= heightToDraw;
                sourceY += sourceHeight;
                pageNum++;

                if (remainingHeight > 0) {
                  doc.addPage();
                  yPosition = margin;
                }
              }
            }

            // Add footer to all pages
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB');
            const timeStr = now.toLocaleTimeString('en-GB');
            const totalPages = doc.internal.pages.length - 1;

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);

            for (let i = 1; i <= totalPages; i++) {
              doc.setPage(i);

              // Add logo to top right
              this.addLogoPDF(doc);

              let xPos = margin;
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(150, 150, 150);
              doc.text('Generated by ', xPos, pageHeight - 10);
              xPos += doc.getTextWidth('Generated by ');

              doc.setFont('helvetica', 'bold');
              doc.setTextColor(37, 99, 235);
              const scrumupdateWidth = doc.getTextWidth('ScrumUpdate');
              doc.textWithLink('ScrumUpdate', xPos, pageHeight - 10, { pageNumber: undefined, url: 'https://scrumupdate.com/' });
              // Add underline to ScrumUpdate text
              doc.line(xPos, pageHeight - 9, xPos + scrumupdateWidth, pageHeight - 9);
              xPos += scrumupdateWidth;

              doc.setFont('helvetica', 'normal');
              doc.setTextColor(150, 150, 150);
              doc.text(` on ${dateStr} at ${timeStr}`, xPos, pageHeight - 10);

              doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
            }

            doc.save(`sprint-insight-${insightData.id || 'report'}.pdf`);
            document.body.removeChild(tempDiv);
          })
          .catch(() => {
            document.body.removeChild(tempDiv);
          });
      }, 50);
    } catch (error) {
      // Silent fail
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
