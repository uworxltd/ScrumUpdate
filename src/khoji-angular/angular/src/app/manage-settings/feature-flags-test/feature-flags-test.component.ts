/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { SpinnerModule } from 'primeng/spinner';

interface FeatureFlag {
  name: string;
  description: string;
  type: string;
  defaultEnabled: boolean;
  consumers: string[];
}

@Component({
  selector: 'khoji-feature-flags-test',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, ToastModule, SpinnerModule],
  providers: [MessageService],
  templateUrl: './feature-flags-test.component.html',
  styleUrls: ['./feature-flags-test.component.scss']
})
export class FeatureFlagsTestComponent implements OnInit, OnDestroy {
  flags: FeatureFlag[] = [];
  loading = false;
  togglingFlags = new Set<string>();
  subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadFlags();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadFlags(): void {
    this.loading = true;
    this.subscription.add(
      this.http.get<any>('/api/features/map').subscribe({
        next: (data) => {
          this.flags = data.features || [];
          this.loading = false;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Flags',
            detail: err.message || 'Failed to load feature flags'
          });
          this.loading = false;
        }
      })
    );
  }

  toggleFlag(flagName: string, newState: 'on' | 'off'): void {
    this.togglingFlags.add(flagName);
    const action = newState;

    this.subscription.add(
      this.http.post<any>(`/api/features/toggle/${flagName}/${action}`, {}).subscribe({
        next: (result) => {
          this.togglingFlags.delete(flagName);
          this.messageService.add({
            severity: 'success',
            summary: 'Flag Toggled',
            detail: `"${flagName}" turned ${action}`,
            life: 3000
          });
          // Reload to reflect changes
          setTimeout(() => this.loadFlags(), 500);
        },
        error: (err) => {
          this.togglingFlags.delete(flagName);
          this.messageService.add({
            severity: 'error',
            summary: 'Toggle Failed',
            detail: err.error?.message || err.message || 'Failed to toggle flag'
          });
        }
      })
    );
  }

  isTogglingFlag(flagName: string): boolean {
    return this.togglingFlags.has(flagName);
  }
}
