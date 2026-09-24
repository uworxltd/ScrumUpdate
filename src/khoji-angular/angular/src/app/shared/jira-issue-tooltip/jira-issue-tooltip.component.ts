/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Input, Component, ViewChild } from '@angular/core';
import { JiraService } from 'app/services/jira.service';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'khoji-jira-issue-tooltip',
    templateUrl: './jira-issue-tooltip.component.html',
    styleUrls: ['./jira-issue-tooltip.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        OverlayPanelModule,
        ProgressSpinnerModule,
    ],
})
export class JiraIssueTooltipComponent {
    @ViewChild('overlayPanel') overlayPanel: OverlayPanel;
    @Input() ticketId!: string;
    @Input() blockedByTicketId: string;
    loading = true;
    data: any;
    dataBlockedBy: any;

    constructor(
        private jira: JiraService,
    ) { }

    fetchTicketDetail(event: Event, ticketId: string, blockedByTicketId: string) {
        this.overlayPanel.show(event);
        this.jira.getTicketDetails(ticketId).subscribe(data => {
            this.data = data;
            this.loading = false;
        });

        if (blockedByTicketId) {
            this.jira.getTicketDetails(blockedByTicketId).subscribe(data => {
                this.dataBlockedBy = data;
                this.loading = false;
            });
        }
    }
}
