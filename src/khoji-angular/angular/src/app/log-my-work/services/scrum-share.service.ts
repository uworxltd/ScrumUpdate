import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DailyScrumUpdates, DailyScrumDates } from 'app/states/app-states';

@Injectable({
  providedIn: 'root'
})
export class ScrumShareService {
  constructor(private messageService: MessageService) {}

  /**
   * Format scrum update as professional text
   */
  formatScrumUpdateAsText(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): string {
    if (!dailyScrumUpdates) {
      return '';
    }

    const lines: string[] = [];
    lines.push('📅 Daily Standup Update');
    lines.push('');

    if (dailyScrumDates?.yesterdayDate) {
      const yesterdayFormatted = this.formatDate(dailyScrumDates.yesterdayDate);
      lines.push(`📅 Yesterday (${yesterdayFormatted})`);
      lines.push('');
    }

    if (dailyScrumUpdates.last_day) {
      lines.push('🎯 What I Did:');
      lines.push(this.cleanHtml(dailyScrumUpdates.last_day));
      lines.push('');
    }

    if (dailyScrumDates?.todayDate) {
      const todayFormatted = this.formatDate(dailyScrumDates.todayDate);
      lines.push(`📅 Today (${todayFormatted})`);
      lines.push('');
    }

    if (dailyScrumUpdates.current_day) {
      lines.push("🎯 What I'm Doing:");
      lines.push(this.cleanHtml(dailyScrumUpdates.current_day));
      lines.push('');
    }

    if (dailyScrumUpdates.blockers) {
      lines.push('🚧 Blockers:');
      lines.push(this.cleanHtml(dailyScrumUpdates.blockers));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format date to readable string (e.g., "Thu Jan 29 2026")
   */
  private formatDate(date: string | Date): string {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      return dateObj.toLocaleDateString('en-US', options);
    } catch (e) {
      return String(date);
    }
  }

  /**
   * Clean HTML and nbsp characters from text
   */
  private cleanHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Copy formatted text to clipboard
   */
  copyToClipboard(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): void {
    const text = this.formatScrumUpdateAsText(dailyScrumUpdates, dailyScrumDates);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Scrum update copied to clipboard', life: 3000 });
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy to clipboard', life: 3000 });
      });
  }

  /**
   * Share to Teams - copies to clipboard and shows message
   * Opens Teams immediately with instruction text
   */
  shareToTeams(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): void {
    const text = this.formatScrumUpdateAsText(dailyScrumUpdates, dailyScrumDates);

    // Show green success tooltip immediately when clicked
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to Clipboard',
      detail: 'Text copied. You may paste it on Teams message.',
      sticky: false,
      life: 6000
    });

    // Copy to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Open Teams immediately
        const instructionText = encodeURIComponent('Paste your update here using Ctrl+V');
        const teamsUrl = `https://teams.microsoft.com/share`;
        window.open(teamsUrl, '_blank');
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy to clipboard',
          sticky: false,
          life: 3000
        });
      });
  }

  /**
   * Share to Slack - copies to clipboard and shows message
   * Opens Slack with text prefilled and lets user choose destination (channel/user)
   */
  shareToSlack(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): void {
    const text = this.formatScrumUpdateAsText(dailyScrumUpdates, dailyScrumDates);

    // Show green success tooltip immediately when clicked
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to Clipboard',
      detail: 'Text copied. You may paste it on Slack message.',
      sticky: false,
      life: 6000
    });

    // Copy to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Open Slack with text prefilled - user can choose channel/user destination
        const encodedText = encodeURIComponent(text);
        const slackUrl = `https://slack.com/intent/post?text=${encodedText}`;
        window.open(slackUrl, '_blank');
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy to clipboard',
          sticky: false,
          life: 3000
        });
      });
  }

  /**
   * Share to WhatsApp - copies to clipboard and opens WhatsApp Web with pre-filled message
   */
  shareToWhatsApp(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): void {
    const text = this.formatScrumUpdateAsText(dailyScrumUpdates, dailyScrumDates);
    const encodedText = encodeURIComponent(text);

    // Copy to clipboard and open WhatsApp
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
        this.messageService.add({
          severity: 'success',
          summary: 'Copied & Opening WhatsApp',
          detail: 'Scrum update copied to clipboard. Opening WhatsApp Web.',
          life: 3000
        });
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
        this.messageService.add({
          severity: 'warning',
          summary: 'Opening WhatsApp',
          detail: 'Opening WhatsApp Web. Your message is pre-filled.',
          life: 2000
        });
      });
  }

  /**
   * Share to Email - copies to clipboard and opens Outlook Web with pre-filled message
   */
  shareToEmail(dailyScrumUpdates: DailyScrumUpdates, dailyScrumDates: DailyScrumDates): void {
    const text = this.formatScrumUpdateAsText(dailyScrumUpdates, dailyScrumDates);
    const subject = encodeURIComponent('Daily Standup Update');
    const body = encodeURIComponent(text);

    // Show green success tooltip
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to Clipboard',
      detail: 'Text copied. Opening Outlook Web with pre-filled message.',
      sticky: false,
      life: 6000
    });

    // Copy to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Open Outlook Web with pre-filled subject and body
        window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, '_blank');
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy to clipboard',
          sticky: false,
          life: 3000
        });
      });
  }
}
