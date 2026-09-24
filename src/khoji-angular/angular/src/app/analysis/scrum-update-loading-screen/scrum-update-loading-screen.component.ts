import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'khoji-scrum-update-loading-screen',
  templateUrl: './scrum-update-loading-screen.component.html',
  styleUrls: ['./scrum-update-loading-screen.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ScrumUpdateLoadingScreenComponent implements OnInit, OnDestroy {
  @Input() width = '100%';
  @Input() height = '100%';
  @Input() onLoadComplete: (() => void) | null = null; // Callback when API completes
  @Input() completionDelay: number = 1500; // Delay before closing (ms) to show all green
  @Input() normalStageInterval: number = 5000; // Normal interval between stages (5 seconds)

  steps = [
    {
      title: 'Engineering Throughput',
      sub: 'See how work actually moves through engineers — not how it’s reported.',
      b1: 'Mapping real execution vs planned work',
      b2: 'Detecting overload, context-switching & silent bottlenecks',
      footer: 'Analyzing code, tickets & flow patterns'
    },
    {
      title: 'Quality Signals',
      sub: 'Quality problems whisper before they explode.',
      b1: 'Identifying rework, churn & unstable tickets',
      b2: 'Surfacing items that look done but aren’t healthy',
      footer: 'Listening for hidden quality warnings'
    },
    {
      title: 'Delivery Momentum',
      sub: 'Status changes don’t mean progress. Momentum does.',
      b1: 'Comparing daily execution snapshots',
      b2: 'Highlighting movement, stalls & false progress',
      footer: 'Tracking real delivery movement'
    },
    {
      title: 'Delivery Forecast',
      sub: 'You’ll know you’ll miss the sprint before the sprint knows.',
      b1: 'Reading velocity trends in context',
      b2: 'Predicting delivery risk early, not at review time',
      footer: 'Forecasting sprint outcomes'
    },
    {
      title: 'Executive Readiness',
      sub: 'Answers leadership will ask — before they ask.',
      b1: 'Translating execution into decision-ready insights',
      b2: 'Preparing leadership narratives, not raw metrics',
      footer: 'Preparing executive-level insights'
    }
  ];

  isClosed = false;

  handleClose() {
    this.isClosed = true;
    if (this.onLoadComplete) {
      this.onLoadComplete();
    }
  }

  currentStepIndex = 0;
  railWidth = '0%';
  completedStages = 0; // Track how many stages are complete
  isLoadingComplete = false; // Flag to indicate API loading is complete
  showCloseButton = true; // Always show close button
  private stageIntervalId: any;
  private completionTimeoutId: any;

  ngOnInit() {
    // Start loading animation
    this.startAnimation();
  }

  ngOnDestroy() {
    if (this.stageIntervalId) {
      clearInterval(this.stageIntervalId);
    }
    if (this.completionTimeoutId) {
      clearTimeout(this.completionTimeoutId);
    }
  }

  private startAnimation() {
    this.updateStep(0);
    let idx = 0;

    this.stageIntervalId = setInterval(() => {
      if (idx < this.steps.length - 1) {
        idx++;
        this.updateStep(idx);
      } else {
        // Finished
        this.completedStages = this.steps.length; // Mark all done (for styling if needed)
        this.railWidth = '100%';
        clearInterval(this.stageIntervalId);
        this.stageIntervalId = null;
      }
    }, this.normalStageInterval);
  }

  updateStep(i: number) {
    this.currentStepIndex = i;
    // Mark previous stages as done
    this.completedStages = i;

    // Rail fill logic: 0% at step 1 (index 0), 100% at step 5 (index 4)
    // Actually, the JS says: const pct = idx === 0 ? 0 : (idx / 4) * 100;
    const pct = i === 0 ? 0 : (i / (this.steps.length - 1)) * 100;
    this.railWidth = `${pct}%`;
  }
}
